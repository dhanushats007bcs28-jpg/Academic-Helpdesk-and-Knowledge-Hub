import mongoose from 'mongoose';

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    department: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    subjectCode: {
      type: String,
      trim: true,
    },
    semester: {
      type: Number,
      required: true,
      index: true,
    },
    resourceType: {
      type: String,
      enum: ['notes', 'question_bank', 'lab_manual', 'tutorial', 'syllabus', 'reference_material'],
      default: 'notes',
      index: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number, // in bytes
      default: 0,
    },
    mimeType: {
      type: String,
      default: 'application/pdf',
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    tags: [{ type: String }],
    downloadsCount: {
      type: Number,
      default: 0,
    },
    isApproved: {
      type: Boolean,
      default: true,
      index: true,
    },
    isPublic: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

resourceSchema.index({ department: 1, subject: 1, semester: 1 });
resourceSchema.index({ title: 'text', description: 'text', tags: 'text' });

export const Resource = mongoose.model('Resource', resourceSchema);
