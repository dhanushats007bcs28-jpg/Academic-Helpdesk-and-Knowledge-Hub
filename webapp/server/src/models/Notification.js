import mongoose from 'mongoose';

/**
 * Notification feed for a single recipient.
 * `type` drives the icon/colour in the UI.
 */
const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    type: {
      type: String,
      enum: ['ticket', 'assignment', 'sla_warning', 'escalation', 'reply', 'resolved', 'system', 'kb', 'mentorship', 'project', 'project_review', 'project_chat'],
      default: 'system',
    },
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket' },
    link: { type: String, default: '' },
    read: { type: Boolean, default: false, index: true },
    meta: { type: Object, default: {} },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });

export const Notification = mongoose.model('Notification', notificationSchema);
