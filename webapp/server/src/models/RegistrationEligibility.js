import mongoose from 'mongoose';

/**
 * Admin-maintained allowlist for student self-registration.
 * A student cannot register unless their email is present in this collection.
 * Upon successful registration, the record is marked as claimed and linked to the created User.
 */
const registrationEligibilitySchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    rollNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    departmentCode: {
      type: String,
      default: 'CSE',
      trim: true,
    },
    batch: {
      type: String,
      default: '2024-2028',
      trim: true,
    },
    year: {
      type: Number,
      default: 3,
    },
    semester: {
      type: Number,
      default: 5,
    },
    section: {
      type: String,
      default: 'A',
      trim: true,
    },
    isClaimed: {
      type: Boolean,
      default: false,
      index: true,
    },
    claimedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    claimedAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    validationFlags: [
      {
        type: String, // e.g. 'external_email_domain', 'missing_name_verified_manually'
      },
    ],
    remarks: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

export const RegistrationEligibility = mongoose.model(
  'RegistrationEligibility',
  registrationEligibilitySchema
);
