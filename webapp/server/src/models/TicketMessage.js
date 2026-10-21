import mongoose from 'mongoose';

/** Threaded conversation between student and the assigned handler. */
const ticketMessageSchema = new mongoose.Schema(
  {
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true, index: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authorRole: { type: String, enum: ['student', 'faculty', 'hod', 'admin', 'system'], required: true },
    body: { type: String, required: true },
    type: { type: String, enum: ['reply', 'internal_note', 'system'], default: 'reply' },
    attachments: [{ name: String, url: String }],
  },
  { timestamps: true }
);

export const TicketMessage = mongoose.model('TicketMessage', ticketMessageSchema);
