import mongoose from 'mongoose';

const projectMessageSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true, trim: true, maxlength: 3000 },
}, { timestamps: true });

projectMessageSchema.index({ project: 1, createdAt: -1 });
export const ProjectMessage = mongoose.model('ProjectMessage', projectMessageSchema);
