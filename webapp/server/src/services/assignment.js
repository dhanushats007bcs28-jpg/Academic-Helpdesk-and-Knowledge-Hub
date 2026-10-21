import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { addWorkingHours } from '../utils/workingHours.js';

/**
 * BOTTOM-UP ASSIGNMENT
 * ----------------------------------------------------------------
 * Pick the handler for a new ticket by walking the escalation ladder
 * from the most junior level upward, and within each level choose the
 * least-loaded, available faculty member whose subject/category matches.
 *
 *   level 1  -> junior faculty
 *   level 2  -> senior faculty
 *   level 3  -> HOD (final rung)
 *
 * If nobody matches a subject, fall back to any available faculty at that
 * level so the ticket is never left unassigned.
 */
export async function assignBottomUp(ticket, { env = {}, excludeIds = [], minLevel = 1 } = {}) {
  // `minLevel` enforces a true bottom-up climb: on escalation we must start
  // ABOVE the current rung, otherwise we'd bounce between same-level peers.
  const levels = [1, 2, 3].filter((l) => l >= minLevel);

  for (const level of levels) {
    const role = level === 3 ? 'hod' : 'faculty';
    const candidates = await User.find({
      role,
      level,
      isActive: true,
      isAvailable: true,
      _id: { $nin: excludeIds },
    }).lean();

    if (!candidates.length) continue;

    // Prefer subject/category affinity when available.
    const categoryTokens = String(ticket.category || '').toLowerCase().split(/\s+/);
    const scored = candidates.map((u) => {
      const subjects = (u.subjects || []).map((s) => s.toLowerCase());
      const subjectMatch = subjects.some((s) =>
        categoryTokens.some((c) => c && (s.includes(c) || c.includes(s)))
      )
        ? 1
        : 0;
      const deptMatch =
        ticket.department && u.department && ticket.department === u.department ? 1 : 0;
      const loadPenalty = (u.currentLoad || 0) / (u.maxOpenTickets || 6);
      const capacity = (u.currentLoad || 0) < (u.maxOpenTickets || 6) ? 1 : 0;
      const priorityBonus = ticket.priority === 'critical' || ticket.priority === 'high' ? 0.15 : 0;
      const score =
        subjectMatch * 0.45 + deptMatch * 0.25 + capacity * 0.2 + priorityBonus - loadPenalty * 0.3;
      return { user: u, score };
    });

    const eligible = scored
      .filter((s) => (s.user.currentLoad || 0) < (s.user.maxOpenTickets || 6))
      .sort((a, b) => b.score - a.score);

    const chosen = (eligible.length ? eligible : scored.sort((a, b) => b.score - a.score))[0];

    if (chosen) {
      return {
        assignee: chosen.user,
        level,
        reason:
          level === 3
            ? 'Escalated to HOD (final rung of bottom-up ladder)'
            : `Assigned to level-${level} ${role} (lowest available rung)`,
      };
    }
  }
  return { assignee: null, level: 0, reason: 'No available handler found' };
}

/** Compute the 24-working-hour SLA deadline and persist it on the ticket. */
export function computeSla(ticket, env = {}, from = new Date()) {
  const slaHours = Number(env.SLA_HOURS || ticket.slaHours || 24);
  const window = {
    startHour: Number((env.WORKDAY_START || '09:00').split(':')[0]),
    startMin: Number((env.WORKDAY_START || '09:00').split(':')[1]),
    endHour: Number((env.WORKDAY_END || '17:00').split(':')[0]),
    endMin: Number((env.WORKDAY_END || '17:00').split(':')[1]),
  };
  ticket.slaHours = slaHours;
  ticket.slaDueAt = addWorkingHours(from, slaHours, window);
  return ticket.slaDueAt;
}

export async function notify(recipient, payload) {
  if (!recipient) return null;
  return Notification.create({ recipient, ...payload });
}
