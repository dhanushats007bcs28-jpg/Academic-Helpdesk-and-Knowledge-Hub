/**
 * Working-hours utilities for the SLA engine.
 *
 * The requirement: SLA notification must fire only after a faculty member has
 * had 24 *working* hours on a ticket. Working hours are Mon-Fri within a
 * configurable window (default 09:00-17:00), so weekends and off-hours are
 * skipped when computing the deadline.
 */

const DEFAULT_WINDOW = { startHour: 9, startMin: 0, endHour: 17, endMin: 0 };

function toMinutes(d) {
  return d.getHours() * 60 + d.getMinutes();
}

function isWorkday(d) {
  const day = d.getDay(); // 0 Sun .. 6 Sat
  return day >= 1 && day <= 5;
}

/**
 * Add `hours` of working time to `from`.
 * Walks forward minute-window by minute-window so weekends/off-hours are skipped.
 */
export function addWorkingHours(from, hours, window = DEFAULT_WINDOW) {
  const startMin = window.startHour * 60 + window.startMin;
  const endMin = window.endHour * 60 + window.endMin;
  const perDayMin = endMin - startMin;
  let remaining = hours * 60; // minutes of working time left to consume

  const cursor = new Date(from.getTime());
  // If we're before the window on a workday, jump to window start.
  if (isWorkday(cursor) && toMinutes(cursor) < startMin) {
    cursor.setHours(window.startHour, window.startMin, 0, 0);
  }

  let guard = 0;
  while (remaining > 0 && guard < 100000) {
    guard++;
    if (!isWorkday(cursor)) {
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(window.startHour, window.startMin, 0, 0);
      continue;
    }
    const nowMin = toMinutes(cursor);
    if (nowMin < startMin) {
      cursor.setHours(window.startHour, window.startMin, 0, 0);
      continue;
    }
    if (nowMin >= endMin) {
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(window.startHour, window.startMin, 0, 0);
      continue;
    }
    const availToday = endMin - nowMin;
    if (remaining <= availToday) {
      cursor.setMinutes(cursor.getMinutes() + remaining);
      remaining = 0;
    } else {
      remaining -= availToday;
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(window.startHour, window.startMin, 0, 0);
    }
  }
  return cursor;
}

/** Working minutes elapsed between two instants. */
export function workingMinutesBetween(a, b, window = DEFAULT_WINDOW) {
  if (b <= a) return 0;
  const startMin = window.startHour * 60 + window.startMin;
  const endMin = window.endHour * 60 + window.endMin;
  let total = 0;
  const cursor = new Date(a.getTime());
  cursor.setSeconds(0, 0);
  let guard = 0;
  while (cursor < b && guard < 200000) {
    guard++;
    if (isWorkday(cursor)) {
      const m = toMinutes(cursor);
      if (m >= startMin && m < endMin) {
        if (cursor.getTime() + 60000 <= b.getTime()) total += 1;
        else total += Math.max(0, (b.getTime() - cursor.getTime()) / 60000);
      }
    }
    cursor.setMinutes(cursor.getMinutes() + 1);
  }
  return Math.round(total);
}

export function parseWindow(env) {
  const parse = (str, fallbackHour, fallbackMin) => {
    if (!str || !/^\d{1,2}:\d{2}$/.test(str)) return [fallbackHour, fallbackMin];
    const [h, m] = str.split(':').map(Number);
    return [h, m];
  };
  const [sh, sm] = parse(env.WORKDAY_START, 9, 0);
  const [eh, em] = parse(env.WORKDAY_END, 17, 0);
  return { startHour: sh, startMin: sm, endHour: eh, endMin: em };
}

export const WORK_WINDOW = DEFAULT_WINDOW;
