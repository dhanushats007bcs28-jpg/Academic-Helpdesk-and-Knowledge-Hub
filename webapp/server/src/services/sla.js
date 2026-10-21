import { Ticket } from '../models/Ticket.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { assignBottomUp } from './assignment.js';
import { workingMinutesBetween } from '../utils/workingHours.js';
import { logActivity } from '../utils/helpers.js';

/**
 * SLA SWEEP
 * ------------------------------------------------------------------
 * Runs on a schedule (node-cron) and enforces the 24-working-hour rule:
 *
 *  1. WARNING  — faculty crosses 80% of the 24 working hours -> notify
 *                the handler that the SLA is about to breach.
 *  2. BREACH   — 24 working hours fully consumed and still unresolved ->
 *                mark slaBreached, and escalate ONE rung up the bottom-up
 *                ladder (faculty -> senior faculty -> HOD) while notifying
 *                everyone involved.
 *
 * Because the timer is measured in *working* minutes (Mon-Fri, 09:00-17:00),
 * a ticket raised Friday afternoon will not breach over the weekend.
 */
export async function runSlaSweep(env = process.env) {
  const now = new Date();
  const warnRatio = Number(env.SLA_WARN_RATIO || 0.8);

  const open = await Ticket.find({ status: { $nin: ['resolved', 'closed'] } })
    .populate('assignedTo', 'name role level email')
    .populate('student', 'name');

  let warned = 0;
  let breached = 0;
  let escalated = 0;

  for (const ticket of open) {
    if (!ticket.assignedTo || !ticket.assignedAt) continue;

    const workedMin = workingMinutesBetween(new Date(ticket.assignedAt), now);
    const slaMin = (ticket.slaHours || 24) * 60;
    const ratio = workedMin / slaMin;

    /* ---------- 1. Warning at ~80% of SLA ---------- */
    if (ratio >= warnRatio && ratio < 1) {
      const already = await Notification.findOne({
        recipient: ticket.assignedTo._id,
        type: 'sla_warning',
        ticket: ticket._id,
      });
      if (!already) {
        const remaining = Math.max(0, slaMin - workedMin);
        await Notification.create({
          recipient: ticket.assignedTo._id,
          title: `SLA warning: ${ticket.ticketCode}`,
          body: `Only ${(remaining / 60).toFixed(1)} working hours left on "${ticket.subject}" before a 24-working-hour breach.`,
          type: 'sla_warning',
          ticket: ticket._id,
          link: `/faculty/tickets/${ticket._id}`,
          meta: { workedHours: +(workedMin / 60).toFixed(2), ratio: +ratio.toFixed(2) },
        });
        warned++;
      }
    }

    /* ---------- 2. Breach at >= 24 working hours ---------- */
    if (ratio >= 1) {
      ticket.slaBreached = true;

      // Escalate one rung up the bottom-up ladder if not already at HOD.
      if ((ticket.assignmentLevel || 1) < 3) {
        const { assignee, level, reason } = await assignBottomUp(ticket, {
          env,
          excludeIds: [ticket.assignedTo._id],
          minLevel: (ticket.assignmentLevel || 1) + 1,
        });
        if (assignee) {
          const previous = ticket.assignedTo._id;
          ticket.escalationHistory.push({
            from: previous,
            to: assignee._id,
            level,
            reason: `SLA breached (${(workedMin / 60).toFixed(1)} working hours) — auto-escalated. ${reason}`,
            at: now,
          });
          ticket.assignedTo = assignee._id;
          ticket.assignmentLevel = Math.max(level, (ticket.assignmentLevel || 1) + 1);
          ticket.status = 'escalated';
          ticket.assignedAt = now; // reset the clock for the new handler
          ticket.slaBreached = false;

          await User.updateOne({ _id: previous }, { $inc: { currentLoad: -1 } });
          await User.updateOne({ _id: assignee._id }, { $inc: { currentLoad: 1 } });

          await Notification.create({
            recipient: assignee._id,
            title: `Auto-escalated (SLA breach): ${ticket.ticketCode}`,
            body: `"${ticket.subject}" breached its 24-working-hour SLA and was escalated to you.`,
            type: 'escalation',
            ticket: ticket._id,
            link: `/faculty/tickets/${ticket._id}`,
          });
          await Notification.create({
            recipient: previous,
            title: `SLA breach on ${ticket.ticketCode}`,
            body: `Your ticket was auto-escalated after 24 working hours without resolution.`,
            type: 'sla_warning',
            ticket: ticket._id,
          });
          if (ticket.student) {
            await Notification.create({
              recipient: ticket.student._id,
              title: `Ticket ${ticket.ticketCode} escalated`,
              body: `To keep our 24-working-hour promise, your query was escalated to ${assignee.name}.`,
              type: 'escalation',
              ticket: ticket._id,
              link: `/tickets/${ticket._id}`,
            });
          }
          await logActivity({
            actor: previous,
            action: 'sla.auto_escalate',
            entity: 'Ticket',
            entityId: ticket._id,
            detail: `Escalated to ${assignee.name} (level ${level}) after SLA breach`,
          });
          escalated++;
        }
      }
      breached++;
    }

    await ticket.save();
  }

  return { checked: open.length, warned, breached, escalated, at: now.toISOString() };
}
