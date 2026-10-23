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
    const searchTerms = `${ticket.category || ''} ${ticket.subject || ''}`.toLowerCase().split(/\s+/).filter(Boolean);
    const scored = candidates.map((u) => {
      const subjects = (u.subjects || []).map((s) => s.toLowerCase());
      const matchedSubjects = (u.subjects || []).filter((s) =>
        searchTerms.some((c) => c && s.toLowerCase().includes(c))
      );
      const subjectMatch = matchedSubjects.length > 0 ? 1 : 0;
      const deptMatch =
        ticket.department && u.department && ticket.department === u.department ? 1 : 0;
      const loadPenalty = (u.currentLoad || 0) / (u.maxOpenTickets || 6);
      const capacity = (u.currentLoad || 0) < (u.maxOpenTickets || 6) ? 1 : 0;
      const priorityBonus = ticket.priority === 'critical' || ticket.priority === 'high' ? 0.15 : 0;
      const score =
        subjectMatch * 0.45 + deptMatch * 0.25 + capacity * 0.2 + priorityBonus - loadPenalty * 0.3;

      const levelTitle = level === 3 ? 'HOD' : level === 2 ? 'Senior Faculty' : 'Junior Faculty';
      const explanationText = `Selected ${u.name} (${levelTitle}, Level ${level}): ${
        matchedSubjects.length ? `matched subject specialization [${matchedSubjects.join(', ')}] (+0.45)` : 'general department coverage (+0.00)'
      }, department match ${deptMatch ? 'CSE (+0.25)' : 'none'}, active workload ${u.currentLoad || 0}/${u.maxOpenTickets || 6} (penalty ${(loadPenalty * 0.3).toFixed(2)}). Total affinity score: ${score.toFixed(2)}.`;

      return {
        user: u,
        score,
        explanationText,
        scores: {
          subjectMatch,
          matchedSubjects,
          deptMatch,
          capacity,
          loadPenalty: Number((loadPenalty * 0.3).toFixed(2)),
          priorityBonus,
          totalScore: Number(score.toFixed(2)),
        },
      };
    });

    const eligible = scored
      .filter((s) => (s.user.currentLoad || 0) < (s.user.maxOpenTickets || 6))
      .sort((a, b) => b.score - a.score);

    const chosen = (eligible.length ? eligible : scored.sort((a, b) => b.score - a.score))[0];

    if (chosen) {
      return {
        assignee: chosen.user,
        level,
        score: chosen.score,
        scores: chosen.scores,
        explanation: chosen.explanationText,
        reason:
          level === 3
            ? 'Escalated to HOD (final rung of bottom-up ladder)'
            : `Assigned to level-${level} ${role} (lowest available rung). ${chosen.explanationText}`,
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
