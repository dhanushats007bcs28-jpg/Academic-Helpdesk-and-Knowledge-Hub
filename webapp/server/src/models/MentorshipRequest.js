import mongoose from 'mongoose';

const mentorshipRequestSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  message: { type: String, trim: true, maxlength: 1500, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending', index: true },
  decidedAt: Date,
}, { timestamps: true });

mentorshipRequestSchema.index({ student: 1, mentor: 1, status: 1 });
export const MentorshipRequest = mongoose.model('MentorshipRequest', mentorshipRequestSchema);
