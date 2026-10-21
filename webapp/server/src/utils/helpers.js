import { ActivityLog } from '../models/ActivityLog.js';

export async function logActivity({ actor, action, entity = '', entityId = '', detail = '', ip = '' }) {
  try {
    await ActivityLog.create({
      actor: actor?._id || actor,
      actorRole: actor?.role || 'system',
      action,
      entity,
      entityId: String(entityId || ''),
      detail,
      ip,
    });
  } catch (e) {
    console.error('[activity] failed to log:', e.message);
  }
}

/** Wrap async route handlers so rejections reach the error middleware. */
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
