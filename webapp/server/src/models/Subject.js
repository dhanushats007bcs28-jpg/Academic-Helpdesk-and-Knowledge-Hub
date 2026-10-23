import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    semester: {
      type: Number,
      required: true,
      index: true,
    },
    regulation: {
      type: String,
      default: 'R2021',
      trim: true,
    },
    credits: {
      type: Number,
      default: 3,
    },
    type: {
      type: String,
      enum: ['theory', 'practical', 'theory_cum_practical', 'elective', 'project'],
      default: 'theory',
    },
    description: {
      type: String,
      default: '',
    },
    syllabusUnits: [
      {
        unitNumber: Number,
        title: String,
        topics: [String],
      },
    ],
    facultyInCharge: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

subjectSchema.index({ department: 1, semester: 1 });

export const Subject = mongoose.model('Subject', subjectSchema);
