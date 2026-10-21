import { Router } from 'express';
import { User } from '../models/User.js';
import { Ticket } from '../models/Ticket.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/helpers.js';

const router = Router();
router.use(requireAuth, requireRole('faculty', 'hod'));

/** Handler's queue with workload + SLA context. */
router.get(
  '/workload',
  asyncHandler(async (req, res) => {
    const me = await User.findById(req.user._id).lean();
    const tickets = await Ticket.find({ assignedTo: req.user._id, status: { $nin: ['resolved', 'closed'] } })
      .populate('student', 'name rollNumber department')
      .sort({ slaDueAt: 1 })
      .lean();

    const now = Date.now();
    const enriched = tickets.map((t) => ({
      ...t,
      overdue: t.slaDueAt ? new Date(t.slaDueAt).getTime() < now : false,
      hoursToDue: t.slaDueAt ? Number(((new Date(t.slaDueAt) - now) / 3600000).toFixed(1)) : null,
    }));

    res.json({
      me: { name: me.name, designation: me.designation, level: me.level, isAvailable: me.isAvailable, currentLoad: me.currentLoad, maxOpenTickets: me.maxOpenTickets, subjects: me.subjects },
      queue: enriched,
      stats: {
        open: enriched.length,
        overdue: enriched.filter((t) => t.overdue).length,
        highPriority: enriched.filter((t) => ['high', 'critical'].includes(t.priority)).length,
      },
    });
  })
);

/** Faculty availability toggle. */
router.patch(
  '/availability',
  asyncHandler(async (req, res) => {
    req.user.isAvailable = !!req.body.isAvailable;
    await req.user.save();
    res.json({ isAvailable: req.user.isAvailable });
  })
);

/** Faculty's own subject specialities (used by assignment scoring). */
router.patch(
  '/subjects',
  asyncHandler(async (req, res) => {
    req.user.subjects = Array.isArray(req.body.subjects) ? req.body.subjects : req.user.subjects;
    await req.user.save();
    res.json({ subjects: req.user.subjects });
  })
);

/* ------------------------- HOD-SCOPED VIEWS --------------------- */
router.get(
  '/department/overview',
  requireRole('hod'),
  asyncHandler(async (req, res) => {
    const dept = req.user.hodOf || req.user.department;
    const [faculty, tickets, students] = await Promise.all([
      User.find({ role: { $in: ['faculty', 'hod'] }, department: dept }).select('-password').lean(),
      Ticket.find({ department: dept })
        .populate('student', 'name rollNumber')
        .populate('assignedTo', 'name designation level')
        .sort({ createdAt: -1 })
        .lean(),
      User.find({ role: 'student', department: dept }).select('-password').lean(),
    ]);

    const byStatus = tickets.reduce((acc, t) => ({ ...acc, [t.status]: (acc[t.status] || 0) + 1 }), {});
    const bySubject = tickets.reduce((acc, t) => ({ ...acc, [t.category]: (acc[t.category] || 0) + 1 }), {});
    const now = Date.now();

    res.json({
      department: dept,
      faculty: faculty.map((f) => ({
        ...f,
        openTickets: tickets.filter((t) => String(t.assignedTo?._id) === String(f._id) && !['resolved', 'closed'].includes(t.status)).length,
        resolvedTickets: tickets.filter((t) => String(t.assignedTo?._id) === String(f._id) && ['resolved', 'closed'].includes(t.status)).length,
      })),
      tickets: tickets.map((t) => ({ ...t, overdue: t.slaDueAt ? new Date(t.slaDueAt).getTime() < now : false })),
      studentCount: students.length,
      byStatus,
      bySubject,
      workloadDistribution: faculty.map((f) => ({ name: f.name, load: f.currentLoad, role: f.role, level: f.level })),
    });
  })
);

/** HOD: recurring-query detection via NLP clustering of ticket lemmas. */
router.get(
  '/department/recurring',
  requireRole('hod'),
  asyncHandler(async (req, res) => {
    const dept = req.user.hodOf || req.user.department;
    const tickets = await Ticket.find({ department: dept }).select('subject queryLemmas category createdAt').lean();

    const clusters = {};
    for (const t of tickets) {
      const key = (t.queryLemmas || []).slice(0, 3).sort().join(' ') || t.category;
      clusters[key] = clusters[key] || { keywords: key.split(' '), count: 0, sample: t.subject, category: t.category };
      clusters[key].count++;
    }
    const recurring = Object.values(clusters).sort((a, b) => b.count - a.count).slice(0, 10);
    res.json({ recurring });
  })
);

export default router;
