import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { requireAuth, requireRole, signToken } from '../middleware/auth.js';
import { Notification } from '../models/Notification.js';
import { Ticket } from '../models/Ticket.js';
import { KbArticle } from '../models/KbArticle.js';
import { asyncHandler } from '../utils/helpers.js';

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

router.post(
  '/auth/register',
  asyncHandler(async (req, res) => {
    const { name, email, password, role = 'student', ...rest } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing required fields' });

    // Public self-registration is students only. Faculty/HOD/admin are admin-provisioned.
    if (role !== 'student') {
      return res.status(403).json({ error: 'Only student self-registration is allowed' });
    }
    const exists = await User.findOne({ email: String(email).toLowerCase() });
    if (exists) return res.status(409).json({ error: 'Email already registered' });

    const user = await User.create({ name, email, password, role: 'student', ...rest });
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

export default router;
