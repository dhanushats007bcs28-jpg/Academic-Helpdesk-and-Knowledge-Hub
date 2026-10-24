import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

/**
 * Single User collection with a discriminating `role` field.
 * Roles: student | faculty | hod | admin
 * Admin is a first-class role that manages students, faculty and HODs.
 */
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['student', 'faculty', 'hod', 'admin'],
      required: true,
      index: true,
    },
    phone: { type: String, default: '' },
    profileImage: { type: String, default: '' }, // Cloudinary secure URL
    profileImagePublicId: { type: String, default: '', select: false }, // server-only Cloudinary identifier
    bio: { type: String, default: '' },
    officeLocation: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    avatarColor: { type: String, default: '#2563eb' },
    isActive: { type: Boolean, default: true },

    /* ---------- Student fields ---------- */
    rollNumber: { type: String, sparse: true, index: true },
    department: { type: String, default: '' },
    year: { type: Number },
    semester: { type: Number },
    section: { type: String, default: '' },
    cgpa: { type: Number },
    attendance: { type: Number },
    advisor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    registrationEligibility: { type: mongoose.Schema.Types.ObjectId, ref: 'RegistrationEligibility' },

    /* ---------- Faculty / HOD fields ---------- */
    employeeId: { type: String, sparse: true, index: true },
    designation: { type: String, default: '' },
    qualification: { type: String, default: '' },
    teachingExperienceYears: { type: Number, default: 0 },
    subjects: [{ type: String }],
    /* Bottom-up escalation ladder. Lower `level` = more junior.
       Faculty level 1 -> senior faculty level 2 -> HOD level 3. */
    level: { type: Number, default: 1 },
    /* Manual availability toggle + derived workload */
    isAvailable: { type: Boolean, default: true },
    maxOpenTickets: { type: Number, default: 6 },
    currentLoad: { type: Number, default: 0 },

    /* ---------- HOD fields ---------- */
    hodOf: { type: String, default: '' }, // department the HOD heads

    validationFlags: [{ type: String }],
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toPublic = function toPublic() {
  const obj = this.toObject({ virtuals: true });
  delete obj.password;
  return obj;
};

export const User = mongoose.model('User', userSchema);
