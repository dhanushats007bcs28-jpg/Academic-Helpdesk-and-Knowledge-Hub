import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema({
  name: { type: String, required: true, maxlength: 180 },
  mimeType: { type: String, required: true, maxlength: 120 },
  size: { type: Number, required: true },
  data: { type: String, required: true, select: false },
}, { _id: true });

const projectSubmissionSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  weekNumber: { type: Number, required: true, min: 1, max: 52 },
  title: { type: String, required: true, trim: true, maxlength: 180 },
  description: { type: String, required: true, trim: true, maxlength: 5000 },
  completedTasks: [{ type: String, trim: true, maxlength: 500 }],
  status: { type: String, enum: ['submitted', 'under_review', 'changes_requested', 'approved'], default: 'submitted', index: true },
  attachments: [attachmentSchema],
  mentorFeedback: { type: String, trim: true, maxlength: 5000, default: '' },
  nextSteps: { type: String, trim: true, maxlength: 3000, default: '' },
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: Date,
}, { timestamps: true });

projectSubmissionSchema.index({ project: 1, weekNumber: 1, createdAt: -1 });
export const ProjectSubmission = mongoose.model('ProjectSubmission', projectSubmissionSchema);
