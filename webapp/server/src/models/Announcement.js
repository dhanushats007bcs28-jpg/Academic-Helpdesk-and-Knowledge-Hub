import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      default: 'All', // 'All' for college-wide
      index: true,
    },
    category: {
      type: String,
      enum: ['academic', 'examination', 'event', 'workshop', 'administrative', 'circular'],
      default: 'academic',
    },
    targetRoles: [
      {
        type: String,
        enum: ['student', 'faculty', 'hod', 'admin'],
      },
    ],
    priority: {
      type: String,
      enum: ['normal', 'important', 'urgent'],
      default: 'normal',
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    attachments: [
      {
        title: String,
        fileUrl: String,
      },
    ],
  },
  { timestamps: true }
);

announcementSchema.index({ publishedAt: -1, isActive: 1 });

export const Announcement = mongoose.model('Announcement', announcementSchema);
