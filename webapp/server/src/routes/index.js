import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { requireAuth, requireRole, signToken } from '../middleware/auth.js';
import { Notification } from '../models/Notification.js';
import { Ticket } from '../models/Ticket.js';
import { KbArticle } from '../models/KbArticle.js';
import { RegistrationEligibility } from '../models/RegistrationEligibility.js';
import { Department } from '../models/Department.js';
import { Subject } from '../models/Subject.js';
import { Announcement } from '../models/Announcement.js';
import { Resource } from '../models/Resource.js';
import { Project } from '../models/Project.js';
import { asyncHandler, logActivity } from '../utils/helpers.js';

const router = Router();

/* ----------------------------- AUTH ----------------------------- */

router.post(
  '/auth/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const user = await User.findOne({ email: String(email).toLowerCase() }).select('+password');
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    if (!user.isActive) return res.status(403).json({ error: 'Account deactivated. Contact admin.' });

    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken(user);
    res.json({ token, user: user.toPublic() });
  })
);

/**
 * Check if a student email is on the approved admin allowlist
 * and eligible for self-registration.
 */
router.post(
  '/auth/check-eligibility',
  asyncHandler(async (req, res) => {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const cleanEmail = String(email).trim().toLowerCase();

    // Check if user account already exists
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        eligible: false,
        message: 'An account is already registered with this email address. Please sign in.',
      });
    }

    // Check allowlist
    const eligibility = await RegistrationEligibility.findOne({
      email: cleanEmail,
      isActive: true,
    });

    if (!eligibility) {
      return res.status(403).json({
        eligible: false,
        message: 'This email is not on the authorized registration list. Please contact your department coordinator.',
      });
    }

    if (eligibility.isClaimed) {
      return res.status(400).json({
        eligible: false,
        message: 'This student record has already been claimed. If you believe this is an error, contact administration.',
      });
    }

    res.json({
      eligible: true,
      student: {
        name: eligibility.name,
        rollNumber: eligibility.rollNumber,
        department: eligibility.department,
        departmentCode: eligibility.departmentCode,
        batch: eligibility.batch,
        year: eligibility.year,
        semester: eligibility.semester,
        section: eligibility.section,
        validationFlags: eligibility.validationFlags,
      },
    });
  })
);

router.post(
  '/auth/register',
  asyncHandler(async (req, res) => {
    const { email, password, phone } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const cleanEmail = String(email).trim().toLowerCase();

    // Check if user already exists
    const exists = await User.findOne({ email: cleanEmail });
    if (exists) return res.status(409).json({ error: 'An account with this email already exists' });

    // Validate against RegistrationEligibility allowlist
    const eligibility = await RegistrationEligibility.findOne({
      email: cleanEmail,
      isActive: true,
    });

    if (!eligibility) {
      return res.status(403).json({
        error: 'Registration rejected: Email is not authorized on the institutional student allowlist.',
      });
    }

    if (eligibility.isClaimed) {
      return res.status(400).json({
        error: 'Registration rejected: This student authorization has already been claimed.',
      });
    }

    // Create user securely bound to verified allowlist fields
    const user = await User.create({
      name: eligibility.name,
      email: cleanEmail,
      password,
      role: 'student',
      rollNumber: eligibility.rollNumber,
      department: eligibility.department,
      year: eligibility.year,
      semester: eligibility.semester,
      section: eligibility.section,
      phone: phone || '',
      registrationEligibility: eligibility._id,
      validationFlags: eligibility.validationFlags || [],
      avatarColor: '#2563eb',
    });

    // Mark allowlist record as claimed
    eligibility.isClaimed = true;
    eligibility.claimedBy = user._id;
    eligibility.claimedAt = new Date();
    await eligibility.save();

    await logActivity({
      actor: user,
      action: 'student.register_claimed',
      entity: 'User',
      entityId: user._id,
      detail: `Student ${eligibility.name} (${eligibility.rollNumber}) registered via allowlist.`,
    });

    const token = signToken(user);
    res.status(201).json({ token, user: user.toPublic() });
  })
);

router.get(
  '/auth/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user.toPublic() });
  })
);

router.patch(
  '/auth/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const allowed = ['name', 'phone', 'avatarColor', 'isAvailable', 'semester', 'section'];
    for (const key of allowed) if (key in req.body) req.user[key] = req.body[key];
    await req.user.save();
    res.json({ user: req.user.toPublic() });
  })
);

router.post(
  '/auth/change-password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Provide current and a new password (min 6 chars)' });
    }
    const user = await User.findById(req.user._id).select('+password');
    const ok = await user.comparePassword(currentPassword);
    if (!ok) return res.status(400).json({ error: 'Current password is incorrect' });
    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated' });
  })
);

/* ------------------------ NOTIFICATIONS ------------------------- */

router.get(
  '/notifications',
  requireAuth,
  asyncHandler(async (req, res) => {
    const items = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    const unread = await Notification.countDocuments({ recipient: req.user._id, read: false });
    res.json({ items, unread });
  })
);

router.post(
  '/notifications/:id/read',
  requireAuth,
  asyncHandler(async (req, res) => {
    await Notification.updateOne({ _id: req.params.id, recipient: req.user._id }, { read: true });
    res.json({ success: true });
  })
);

router.post(
  '/notifications/read-all',
  requireAuth,
  asyncHandler(async (req, res) => {
    await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
    res.json({ success: true });
  })
);

/* ------------------------ STUDENT PROFILE ----------------------- */

router.get(
  '/students/me/academics',
  requireAuth,
  requireRole('student'),
  asyncHandler(async (req, res) => {
    const me = req.user;
    const tickets = await Ticket.find({ student: me._id }).sort({ createdAt: -1 }).lean();
    const advisor = me.advisor ? await User.findById(me.advisor).select('name designation email').lean() : null;
    res.json({
      student: {
        name: me.name,
        rollNumber: me.rollNumber,
        department: me.department,
        year: me.year,
        semester: me.semester,
        section: me.section,
        cgpa: me.cgpa,
        attendance: me.attendance,
        email: me.email,
        phone: me.phone,
      },
      advisor,
      ticketCount: tickets.length,
      resolvedCount: tickets.filter((t) => ['resolved', 'closed'].includes(t.status)).length,
    });
  })
);

/* ------------------- PUBLIC INSTITUTIONAL APIS ------------------ */

router.get(
  '/departments',
  asyncHandler(async (_req, res) => {
    const list = await Department.find({ isActive: true }).populate('hod', 'name designation email').sort({ name: 1 }).lean();
    res.json({ departments: list });
  })
);

router.get(
  '/subjects',
  asyncHandler(async (req, res) => {
    const { department, semester } = req.query;
    const filter = { isActive: true };
    if (department) filter.department = department;
    if (semester) filter.semester = Number(semester);
    const list = await Subject.find(filter).sort({ semester: 1, code: 1 }).lean();
    res.json({ subjects: list });
  })
);

router.get(
  '/announcements/public',
  asyncHandler(async (_req, res) => {
    const list = await Announcement.find({ isActive: true })
      .populate('author', 'name designation')
      .sort({ publishedAt: -1 })
      .limit(6)
      .lean();
    res.json({ announcements: list });
  })
);

router.get(
  '/resources/public',
  asyncHandler(async (req, res) => {
    const { department, subject, semester, type, q } = req.query;
    const filter = { isApproved: true, isPublic: true };
    if (department) filter.department = department;
    if (subject) filter.subject = subject;
    if (semester) filter.semester = Number(semester);
    if (type) filter.resourceType = type;
    if (q) filter.$text = { $search: q };

    const items = await Resource.find(filter)
      .populate('uploadedBy', 'name designation')
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    res.json({ items });
  })
);

router.get(
  '/projects/public',
  asyncHandler(async (_req, res) => {
    const list = await Project.find({ status: { $in: ['in_progress', 'completed'] } })
      .populate('mentor', 'name designation')
      .populate('members.student', 'name rollNumber')
      .sort({ updatedAt: -1 })
      .limit(8)
      .lean();
    res.json({ projects: list });
  })
);

router.get(
  '/faculty/directory/public',
  asyncHandler(async (req, res) => {
    const { department = 'Computer Science and Engineering' } = req.query;
    const list = await User.find({
      role: { $in: ['faculty', 'hod'] },
      department,
      isActive: true,
    })
      .select('name designation qualification teachingExperienceYears phone email subjects level hodOf')
      .sort({ level: -1, teachingExperienceYears: -1 })
      .lean();
    res.json({ faculty: list });
  })
);

router.get(
  '/stats/public',
  asyncHandler(async (_req, res) => {
    const [departments, subjects, faculty, articles, resources, projects, resolvedTickets] = await Promise.all([
      Department.countDocuments({ isActive: true }),
      Subject.countDocuments({ isActive: true }),
      User.countDocuments({ role: { $in: ['faculty', 'hod'] }, isActive: true }),
      KbArticle.countDocuments({ status: 'published' }),
      Resource.countDocuments({ isApproved: true }),
      Project.countDocuments(),
      Ticket.countDocuments({ status: { $in: ['resolved', 'closed'] } }),
    ]);

    res.json({
      departments,
      subjects,
      faculty,
      articles,
      resources,
      projects,
      resolvedTickets,
    });
  })
);

export default router;
