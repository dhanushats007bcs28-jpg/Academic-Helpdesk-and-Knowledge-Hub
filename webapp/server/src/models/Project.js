import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    batch: {
      type: String,
      default: '2024-2028',
    },
    semester: {
      type: Number,
      default: 5,
    },
    category: {
      type: String,
      enum: ['mini_project', 'capstone', 'research', 'industry_sponsored', 'hackathon'],
      default: 'mini_project',
    },
    mentor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    members: [
      {
        student: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        rollNumber: String,
        name: String,
        role: {
          type: String,
          default: 'Team Member', // 'Team Lead', 'Developer', etc.
        },
      },
    ],
    status: {
      type: String,
      enum: ['proposed', 'approved', 'in_progress', 'under_review', 'completed'],
      default: 'in_progress',
      index: true,
    },
    milestones: [
      {
        title: { type: String, required: true },
        description: String,
        dueDate: Date,
        isCompleted: { type: Boolean, default: false },
        completedAt: Date,
      },
    ],
    tasks: [
      {
        title: { type: String, required: true },
        assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        dueDate: Date,
        status: {
          type: String,
          enum: ['todo', 'in_progress', 'completed'],
          default: 'todo',
        },
      },
    ],
    mentorFeedback: [
      {
        mentor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        content: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    repositoryUrl: {
      type: String,
      default: '',
    },
    documentationUrl: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

projectSchema.index({ department: 1, status: 1 });

export const Project = mongoose.model('Project', projectSchema);
