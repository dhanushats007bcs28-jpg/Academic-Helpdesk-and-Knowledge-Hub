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

/** HOD: Academic Pulse — Knowledge Gap Detection & Recurring Query Intelligence. */
router.get(
  '/department/recurring',
  requireRole('hod', 'faculty'),
  asyncHandler(async (req, res) => {
    const dept = req.user.hodOf || req.user.department || 'Computer Science and Engineering';
    const { KbArticle } = await import('../models/KbArticle.js');
    const [tickets, articles] = await Promise.all([
      Ticket.find({ department: dept }).select('subject queryLemmas category status createdAt').lean(),
      KbArticle.find({ department: { $in: [dept, 'Common'] } }).select('title category tags lemmas').lean(),
    ]);

    const clusters = {};
    for (const t of tickets) {
      const key = (t.queryLemmas || []).slice(0, 3).sort().join(' ') || t.category;
      if (!key) continue;
      clusters[key] = clusters[key] || {
        keywords: key.split(' '),
        count: 0,
        sample: t.subject,
        category: t.category,
        unresolvedCount: 0,
      };
      clusters[key].count++;
      if (!['resolved', 'closed'].includes(t.status)) clusters[key].unresolvedCount++;
    }

    // Correlate with KB coverage to detect genuine knowledge gaps
    const pulseItems = Object.values(clusters).map((c) => {
      const matchedArticle = articles.find((a) =>
        c.keywords.some((kw) => (a.tags || []).includes(kw) || (a.lemmas || []).includes(kw))
      );
      const isKnowledgeGap = !matchedArticle;
      const severity = c.count >= 3 && isKnowledgeGap ? 'critical' : isKnowledgeGap ? 'moderate' : 'covered';
      return {
        ...c,
        hasKbArticle: !!matchedArticle,
        matchedArticleTitle: matchedArticle ? matchedArticle.title : null,
        isKnowledgeGap,
        severity,
        recommendation: isKnowledgeGap
          ? `High student demand: Consider publishing a verified guide on "${c.sample}".`
          : `Covered by article: "${matchedArticle.title}".`,
      };
    });

    const sorted = pulseItems.sort((a, b) => b.count - a.count);
    const knowledgeGaps = sorted.filter((p) => p.isKnowledgeGap);

    res.json({
      recurring: sorted.slice(0, 12),
      knowledgeGaps: knowledgeGaps.slice(0, 6),
      totalQueriesAnalyzed: tickets.length,
      totalGapsDetected: knowledgeGaps.length,
    });
  })
);

/* ----------------------- PROJECT PULSE -------------------------- */
router.get(
  '/projects',
  asyncHandler(async (req, res) => {
    const { Project } = await import('../models/Project.js');
    const filter = req.user.role === 'hod'
      ? { department: req.user.hodOf || req.user.department }
      : { mentor: req.user._id };
    const projects = await Project.find(filter)
      .populate('mentor', 'name designation email')
      .populate('members.student', 'name rollNumber email')
      .sort({ updatedAt: -1 })
      .lean();
    res.json({ projects });
  })
);

router.post(
  '/projects/:id/feedback',
  asyncHandler(async (req, res) => {
    const { content } = req.body || {};
    if (!content) return res.status(400).json({ error: 'Feedback content required' });
    const { Project } = await import('../models/Project.js');
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    project.mentorFeedback.push({
      mentor: req.user._id,
      content,
      createdAt: new Date(),
    });
    await project.save();
    res.json({ project });
  })
);

router.patch(
  '/projects/:id/milestones/:mIndex',
  asyncHandler(async (req, res) => {
    const { isCompleted } = req.body || {};
    const { Project } = await import('../models/Project.js');
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const idx = Number(req.params.mIndex);
    if (project.milestones[idx]) {
      project.milestones[idx].isCompleted = !!isCompleted;
      project.milestones[idx].completedAt = isCompleted ? new Date() : null;
      await project.save();
    }
    res.json({ project });
  })
);

export default router;
