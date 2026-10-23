import { Router } from 'express';
import { User } from '../models/User.js';
import { Ticket } from '../models/Ticket.js';
import { KbArticle } from '../models/KbArticle.js';
import { ActivityLog } from '../models/ActivityLog.js';
import { Notification } from '../models/Notification.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler, logActivity } from '../utils/helpers.js';
import { preprocess } from '../services/nlp/engine.js';
import { workingMinutesBetween } from '../utils/workingHours.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

/* ------------------------- USER MANAGEMENT ---------------------- */
router.get(
  '/users',
  asyncHandler(async (req, res) => {
    const { role, q = '' } = req.query;
    const filter = {};
    if (role) filter.role = role;
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { rollNumber: { $regex: q, $options: 'i' } },
        { employeeId: { $regex: q, $options: 'i' } },
      ];
    }
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 }).lean();
    const counts = await User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]);
    res.json({
      items: users,
      counts: counts.reduce((acc, c) => ({ ...acc, [c._id]: c.count }), {}),
    });
  })
);

router.post(
  '/users',
  asyncHandler(async (req, res) => {
    const { name, email, password, role, ...rest } = req.body || {};
    if (!name || !email || !password || !role) return res.status(400).json({ error: 'name, email, password, role required' });
    const exists = await User.findOne({ email: String(email).toLowerCase() });
    if (exists) return res.status(409).json({ error: 'Email already in use' });
    const user = await User.create({ name, email, password, role, ...rest });
    await logActivity({ actor: req.user, action: `user.create.${role}`, entity: 'User', entityId: user._id, detail: name });
    res.status(201).json({ user: user.toPublic() });
  })
);

router.patch(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const patch = { ...req.body };
    delete patch.password; // password changes go through change-password / reset
    const user = await User.findByIdAndUpdate(req.params.id, patch, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    await logActivity({ actor: req.user, action: 'user.update', entity: 'User', entityId: user._id, detail: user.name });
    res.json({ user: user.toPublic() });
  })
);

router.post(
  '/users/:id/reset-password',
  asyncHandler(async (req, res) => {
    const { newPassword } = req.body || {};
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: 'Password min 6 chars' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.password = newPassword;
    await user.save();
    await logActivity({ actor: req.user, action: 'user.reset_password', entity: 'User', entityId: user._id, detail: user.name });
    res.json({ success: true });
  })
);

router.patch(
  '/users/:id/toggle-active',
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.isActive = !user.isActive;
    await user.save();
    await logActivity({ actor: req.user, action: user.isActive ? 'user.activate' : 'user.deactivate', entity: 'User', entityId: user._id, detail: user.name });
    res.json({ user: user.toPublic() });
  })
);

router.delete(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ error: 'Cannot delete an admin account' });
    await user.deleteOne();
    await logActivity({ actor: req.user, action: 'user.delete', entity: 'User', entityId: req.params.id, detail: user.name });
    res.json({ success: true });
  })
);

/* ------------------------- QUERY OVERSIGHT ---------------------- */
/** Every query ever asked, with filters — admin's window into the whole system. */
router.get(
  '/queries',
  asyncHandler(async (req, res) => {
    const { status, category, priority, level, q = '', page = 1, limit = 25 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (level) filter.assignmentLevel = Number(level);
    if (q) {
      filter.$or = [
        { subject: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { ticketCode: { $regex: q, $options: 'i' } },
      ];
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Ticket.find(filter)
        .populate('student', 'name rollNumber department')
        .populate('assignedTo', 'name designation role level')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Ticket.countDocuments(filter),
    ]);
    res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  })
);

/* --------------------------- SLA WATCH -------------------------- */
/** Live SLA board: which tickets are near / past the 24-working-hour breach. */
router.get(
  '/sla',
  asyncHandler(async (_req, res) => {
    const openTickets = await Ticket.find({ status: { $nin: ['resolved', 'closed'] } })
      .populate('student', 'name rollNumber')
      .populate('assignedTo', 'name designation level role')
      .sort({ slaDueAt: 1 })
      .lean();

    const now = new Date();
    const board = openTickets.map((t) => {
      const workedMin = t.assignedAt ? workingMinutesBetween(new Date(t.assignedAt), now) : 0;
      const remainingMin = t.slaHours * 60 - workedMin;
      return {
        ...t,
        workedHours: Number((workedMin / 60).toFixed(2)),
        remainingHours: Number((remainingMin / 60).toFixed(2)),
        overdue: t.slaDueAt && new Date(t.slaDueAt) < now,
        level: t.assignmentLevel,
      };
    });

    const summary = {
      total: board.length,
      overdue: board.filter((b) => b.overdue).length,
      atRisk: board.filter((b) => !b.overdue && b.remainingHours <= 6).length,
      escalated: board.filter((b) => b.status === 'escalated').length,
    };
    res.json({ tickets: board, summary });
  })
);

/** Manually trigger the SLA sweep (the cron does this automatically too). */
router.post(
  '/sla/run',
  asyncHandler(async (req, res) => {
    const { runSlaSweep } = await import('../services/sla.js');
    const result = await runSlaSweep(process.env);
    await logActivity({ actor: req.user, action: 'sla.manual_sweep', entity: 'System', detail: JSON.stringify(result) });
    res.json({ success: true, ...result });
  })
);

/* ------------------------ SYSTEM ANALYTICS ---------------------- */
router.get(
  '/analytics/overview',
  asyncHandler(async (_req, res) => {
    const [totalTickets, openTickets, resolved, escalated, students, faculty, hods, kbCount] = await Promise.all([
      Ticket.countDocuments(),
      Ticket.countDocuments({ status: { $nin: ['resolved', 'closed'] } }),
      Ticket.countDocuments({ status: { $in: ['resolved', 'closed'] } }),
      Ticket.countDocuments({ status: 'escalated' }),
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'faculty' }),
      User.countDocuments({ role: 'hod' }),
      KbArticle.countDocuments(),
    ]);

    const avg = await Ticket.aggregate([
      { $match: { 'feedback.rating': { $exists: true } } },
      { $group: { _id: null, avgRating: { $avg: '$feedback.rating' }, n: { $sum: 1 } } },
    ]);

    const resolutionRate = totalTickets ? Math.round((resolved / totalTickets) * 100) : 0;
    const kbAuto = await Ticket.countDocuments({ resolvedFromKb: true });

    const byCategory = await Ticket.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    const byStatus = await Ticket.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const byLevel = await Ticket.aggregate([
      { $group: { _id: '$assignmentLevel', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    const deptLoad = await User.aggregate([
      { $match: { role: 'faculty' } },
      { $group: { _id: '$department', load: { $sum: '$currentLoad' }, count: { $sum: 1 } } },
    ]);

    const topFaculty = await User.find({ role: { $in: ['faculty', 'hod'] } })
      .select('name designation role level currentLoad department maxOpenTickets')
      .sort({ currentLoad: -1 })
      .limit(10)
      .lean();

    res.json({
      totals: { totalTickets, openTickets, resolved, escalated, students, faculty, hods, kbCount, kbAuto },
      resolutionRate,
      avgRating: avg[0]?.avgRating ? Number(avg[0].avgRating.toFixed(2)) : null,
      ratingCount: avg[0]?.n || 0,
      byCategory,
      byStatus,
      byLevel,
      deptLoad,
      topFaculty,
    });
  })
);

/* --------------------------- ACTIVITY --------------------------- */
router.get(
  '/activity',
  asyncHandler(async (_req, res) => {
    const items = await ActivityLog.find()
      .populate('actor', 'name role')
      .sort({ createdAt: -1 })
      .limit(120)
      .lean();
    res.json({ items });
  })
);

/* ------------------- KNOWLEDGE BASE (ADMIN CRUD) ---------------- */
router.post(
  '/kb',
  asyncHandler(async (req, res) => {
    const { title, question, answer, category, department, subject, tags = [] } = req.body || {};
    if (!title || !question || !answer || !category) {
      return res.status(400).json({ error: 'title, question, answer, category required' });
    }
    const { tokens, lemmas } = preprocess(`${title} ${question} ${answer} ${tags.join(' ')}`);
    const article = await KbArticle.create({
      title, question, answer, category, department, subject, tags,
      tokenized: tokens, lemmas, source: 'admin', createdBy: req.user._id,
    });
    await logActivity({ actor: req.user, action: 'kb.create', entity: 'KbArticle', entityId: article._id, detail: title });
    res.status(201).json({ article });
  })
);

router.patch(
  '/kb/:id',
  asyncHandler(async (req, res) => {
    const patch = { ...req.body };
    const base = await KbArticle.findById(req.params.id);
    if (!base) return res.status(404).json({ error: 'Article not found' });
    const merged = { ...base.toObject(), ...patch };
    const { tokens, lemmas } = preprocess(
      `${merged.title} ${merged.question} ${merged.answer} ${(merged.tags || []).join(' ')}`
    );
    patch.tokenized = tokens;
    patch.lemmas = lemmas;
    const article = await KbArticle.findByIdAndUpdate(req.params.id, patch, { new: true });
    await logActivity({ actor: req.user, action: 'kb.update', entity: 'KbArticle', entityId: article._id, detail: article.title });
    res.json({ article });
  })
);

router.delete(
  '/kb/:id',
  asyncHandler(async (req, res) => {
    await KbArticle.findByIdAndDelete(req.params.id);
    await logActivity({ actor: req.user, action: 'kb.delete', entity: 'KbArticle', entityId: req.params.id });
    res.json({ success: true });
  })
);

/* ------------------- BROADCAST NOTIFICATION --------------------- */
router.post(
  '/broadcast',
  asyncHandler(async (req, res) => {
    const { title, body, role } = req.body || {};
    if (!title) return res.status(400).json({ error: 'title required' });
    const filter = role ? { role } : {};
    const users = await User.find(filter).select('_id').lean();
    await Notification.insertMany(
      users.map((u) => ({ recipient: u._id, title, body: body || '', type: 'system' }))
    );
    await logActivity({ actor: req.user, action: 'system.broadcast', entity: 'Notification', detail: title });
    res.json({ success: true, sent: users.length });
  })
);

/* ------------------- STUDENT ALLOWLIST MANAGEMENT --------------- */
router.get(
  '/allowlist',
  asyncHandler(async (req, res) => {
    const { q, isClaimed } = req.query;
    const { RegistrationEligibility } = await import('../models/RegistrationEligibility.js');
    const filter = {};
    if (isClaimed !== undefined && isClaimed !== '') filter.isClaimed = isClaimed === 'true';
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { rollNumber: { $regex: q, $options: 'i' } },
      ];
    }
    const items = await RegistrationEligibility.find(filter)
      .populate('claimedBy', 'name email lastLoginAt')
      .sort({ rollNumber: 1 })
      .lean();

    const counts = {
      total: await RegistrationEligibility.countDocuments(),
      claimed: await RegistrationEligibility.countDocuments({ isClaimed: true }),
      unclaimed: await RegistrationEligibility.countDocuments({ isClaimed: false }),
    };

    res.json({ items, counts });
  })
);

router.post(
  '/allowlist',
  asyncHandler(async (req, res) => {
    const { name, email, rollNumber, department = 'Computer Science and Engineering', batch = '2024-2028', semester = 5, section = 'A' } = req.body || {};
    if (!name || !email || !rollNumber) return res.status(400).json({ error: 'Name, email, and roll number are required' });
    const { RegistrationEligibility } = await import('../models/RegistrationEligibility.js');

    const exists = await RegistrationEligibility.findOne({ $or: [{ email: email.toLowerCase() }, { rollNumber }] });
    if (exists) return res.status(409).json({ error: 'Student with this email or roll number already in allowlist' });

    const item = await RegistrationEligibility.create({
      name, email: email.toLowerCase(), rollNumber, department, batch, semester, section,
    });
    res.status(201).json({ item });
  })
);

/* ------------------- BATCH DATA IMPORT HUB ----------------------- */
/** Dry-run preview and confirmed commit for CSV / JSON student & staff batches. */
router.post(
  '/import-data',
  asyncHandler(async (req, res) => {
    const { type, rows, commit = false } = req.body || {};
    if (!type || !Array.isArray(rows)) {
      return res.status(400).json({ error: 'type (students|faculty|subjects) and rows array required' });
    }

    const { RegistrationEligibility } = await import('../models/RegistrationEligibility.js');
    const { Subject } = await import('../models/Subject.js');

    const results = {
      totalRows: rows.length,
      validRows: 0,
      invalidRows: 0,
      errors: [],
      preview: [],
    };

    if (type === 'students') {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const rowNum = i + 1;
        const errs = [];
        if (!r.email) errs.push('Missing email');
        if (!r.rollNumber) errs.push('Missing rollNumber');
        if (!r.name) errs.push('Missing name');

        if (errs.length) {
          results.invalidRows++;
          results.errors.push({ row: rowNum, errors: errs, data: r });
          continue;
        }

        const email = String(r.email).trim().toLowerCase();
        const dup = await RegistrationEligibility.findOne({ $or: [{ email }, { rollNumber: r.rollNumber }] });
        if (dup && !commit) {
          errs.push(`Duplicate: ${dup.email === email ? 'Email' : 'Roll number'} already exists`);
        }

        if (errs.length) {
          results.invalidRows++;
          results.errors.push({ row: rowNum, errors: errs, data: r });
        } else {
          results.validRows++;
          if (commit) {
            await RegistrationEligibility.findOneAndUpdate(
              { email },
              {
                name: r.name,
                rollNumber: r.rollNumber,
                department: r.department || 'Computer Science and Engineering',
                departmentCode: r.departmentCode || 'CSE',
                batch: r.batch || '2024-2028',
                year: Number(r.year) || 3,
                semester: Number(r.semester) || 5,
                section: r.section || 'A',
                isActive: true,
              },
              { upsert: true, new: true }
            );
          } else {
            results.preview.push({ row: rowNum, name: r.name, email, rollNumber: r.rollNumber, status: 'Valid' });
          }
        }
      }
    }

    if (commit) {
      await logActivity({
        actor: req.user,
        action: `import.commit.${type}`,
        entity: 'ImportJob',
        detail: `Imported ${results.validRows} ${type} successfully.`,
      });
    }

    res.json({
      success: true,
      commit: !!commit,
      type,
      ...results,
    });
  })
);

/* ------------------- ANNOUNCEMENTS CRUD -------------------------- */
router.post(
  '/announcements',
  asyncHandler(async (req, res) => {
    const { title, content, department = 'All', category = 'academic', priority = 'normal', targetRoles = ['student', 'faculty', 'hod', 'admin'] } = req.body || {};
    if (!title || !content) return res.status(400).json({ error: 'Title and content required' });
    const { Announcement } = await import('../models/Announcement.js');

    const announcement = await Announcement.create({
      title, content, department, category, priority, targetRoles, author: req.user._id,
    });
    res.status(201).json({ announcement });
  })
);

export default router;
