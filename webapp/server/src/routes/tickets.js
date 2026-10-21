import { Router } from 'express';
import { Ticket } from '../models/Ticket.js';
import { KbArticle } from '../models/KbArticle.js';
import { TicketMessage } from '../models/TicketMessage.js';
import { User } from '../models/User.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { assignBottomUp, computeSla, notify } from '../services/assignment.js';
import { preprocess, matchKnowledgeBase, keywords, suggestCategory } from '../services/nlp/engine.js';
import { asyncHandler, logActivity } from '../utils/helpers.js';

const router = Router();

const nextTicketCode = async () => {
  const count = await Ticket.countDocuments();
  return `TKT-${String(count + 1).padStart(4, '0')}`;
};

/* ---------------------- NLP: KB match preview ------------------- */
/** Called as the student types. Never persists anything. */
router.post(
  '/kb/match',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { query = '' } = req.body || {};
    const { tokens, lemmas } = preprocess(query);
    const articles = await KbArticle.find().lean();
    const matches = matchKnowledgeBase(query, articles, { threshold: 0.14, limit: 5 });
    res.json({
      normalized: { tokens, lemmas, keywords: keywords(lemmas) },
      matches,
      hasAnswer: matches.some((m) => m.confidence !== 'low'),
    });
  })
);

/* ------------------------ KB search ----------------------------- */
router.get(
  '/kb',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { q = '', category = '' } = req.query;
    let articles;
    if (q) {
      const all = await KbArticle.find(category ? { category } : {}).lean();
      const ranked = matchKnowledgeBase(q, all, { threshold: 0.05, limit: 30 });
      const byId = new Map(all.map((a) => [String(a._id), a]));
      articles = ranked
        .map((r) => ({ ...byId.get(String(r.article)), score: r.score }))
        .filter(Boolean);
      if (!articles.length) articles = all.slice(0, 30);
    } else {
      articles = await KbArticle.find(category ? { category } : {}).sort({ views: -1 }).limit(50).lean();
    }
    res.json({ items: articles });
  })
);

router.get(
  '/kb/categories',
  requireAuth,
  asyncHandler(async (_req, res) => {
    const cats = await KbArticle.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json({ categories: cats.map((c) => ({ name: c._id, count: c.count })) });
  })
);

router.get(
  '/kb/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const article = await KbArticle.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    ).lean();
    if (!article) return res.status(404).json({ error: 'Article not found' });
    res.json({ article });
  })
);

/* --------------------- CREATE TICKET (student) ------------------ */
router.post(
  '/tickets',
  requireAuth,
  requireRole('student'),
  asyncHandler(async (req, res) => {
    const { subject, description, category = 'General', priority = 'medium', useKbAnswer = false, kbArticleId } =
      req.body || {};
    if (!subject || !description) return res.status(400).json({ error: 'Subject and description required' });

    const { tokens, lemmas } = preprocess(`${subject} ${description}`);
    const articles = await KbArticle.find().lean();
    const matches = matchKnowledgeBase(`${subject} ${description}`, articles, { threshold: 0.16, limit: 4 });

    // If the student accepted a KB answer, auto-close with a resolution.
    if (useKbAnswer) {
      const code = await nextTicketCode();
      const ticket = await Ticket.create({
        ticketCode: code,
        student: req.user._id,
        subject,
        description,
        category,
        priority,
        department: req.user.department || '',
        status: 'resolved',
        queryTokens: tokens,
        queryLemmas: lemmas,
        kbMatches: matches.map((m) => ({ article: m.article, score: m.score, title: m.title })),
        autoResolvedByKb: true,
        resolvedFromKb: true,
        resolution: {
          summary: matches[0]?.answer || 'Resolved from knowledge base',
          resolvedAt: new Date(),
        },
      });
      await notify(req.user._id, {
        title: 'Query answered from Knowledge Base',
        body: `Your query "${subject}" was resolved instantly from the knowledge base.`,
        type: 'kb',
        ticket: ticket._id,
        link: `/tickets/${ticket._id}`,
      });
      await logActivity({ actor: req.user, action: 'ticket.kb_resolved', entity: 'Ticket', entityId: ticket._id, detail: subject });
      return res.status(201).json({ ticket, autoResolved: true, matches });
    }

    const code = await nextTicketCode();
    const ticket = new Ticket({
      ticketCode: code,
      student: req.user._id,
      subject,
      description,
      category,
      priority,
      department: req.user.department || '',
      status: 'open',
      queryTokens: tokens,
      queryLemmas: lemmas,
      kbMatches: matches.map((m) => ({ article: m.article, score: m.score, title: m.title })),
    });

    // Bottom-up assignment.
    const { assignee, level, reason } = await assignBottomUp(ticket, { env: process.env });
    if (assignee) {
      ticket.assignedTo = assignee._id;
      ticket.assignedAt = new Date();
      ticket.assignmentLevel = level;
      ticket.status = 'assigned';
      ticket.escalationHistory.push({ to: assignee._id, level, reason, at: new Date() });
      await User.updateOne({ _id: assignee._id }, { $inc: { currentLoad: 1 } });
      await notify(assignee._id, {
        title: `New ticket assigned: ${code}`,
        body: `${req.user.name} raised "${subject}". SLA: 24 working hours.`,
        type: 'assignment',
        ticket: ticket._id,
        link: `/faculty/tickets/${ticket._id}`,
      });
    }

    // SLA starts when the ticket is created / assigned.
    computeSla(ticket, process.env, ticket.assignedAt || new Date());
    await ticket.save();

    await notify(req.user._id, {
      title: `Ticket ${code} created`,
      body: assignee ? `Assigned to ${assignee.name}. Track progress in My Tickets.` : 'Awaiting assignment.',
      type: 'ticket',
      ticket: ticket._id,
      link: `/tickets/${ticket._id}`,
    });
    await logActivity({ actor: req.user, action: 'ticket.create', entity: 'Ticket', entityId: ticket._id, detail: subject });

    res.status(201).json({ ticket, matches });
  })
);

/* -------------------------- LIST TICKETS ------------------------ */
router.get(
  '/tickets',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { status, category, priority, q = '', page = 1, limit = 20 } = req.query;
    const filter = {};

    if (req.user.role === 'student') filter.student = req.user._id;
    else if (req.user.role === 'faculty')
      filter.$or = [{ assignedTo: req.user._id }, { 'escalationHistory.from': req.user._id }];
    else if (req.user.role === 'hod') filter.department = req.user.hodOf || req.user.department;
    // admin sees all

    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;

    let query = Ticket.find(filter)
      .populate('student', 'name rollNumber department email')
      .populate('assignedTo', 'name designation email level role')
      .sort({ createdAt: -1 });

    if (q) {
      // text-ish search over subject/description
      query = Ticket.find({
        ...filter,
        $or: [
          { subject: { $regex: q, $options: 'i' } },
          { description: { $regex: q, $options: 'i' } },
          { ticketCode: { $regex: q, $options: 'i' } },
        ],
      })
        .populate('student', 'name rollNumber department email')
        .populate('assignedTo', 'name designation email level role')
        .sort({ createdAt: -1 });
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      query.skip(skip).limit(Number(limit)).lean(),
      Ticket.countDocuments(filter),
    ]);
    res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  })
);

/* ---------------------------- STATS ----------------------------- */
router.get(
  '/tickets/stats/summary',
  requireAuth,
  asyncHandler(async (req, res) => {
    const base = {};
    if (req.user.role === 'student') base.student = req.user._id;
    else if (req.user.role === 'faculty') base.assignedTo = req.user._id;
    else if (req.user.role === 'hod') base.department = req.user.hodOf || req.user.department;

    const [total, open, resolved, escalated, breaching] = await Promise.all([
      Ticket.countDocuments(base),
      Ticket.countDocuments({ ...base, status: { $in: ['open', 'assigned', 'in_progress', 'waiting_student'] } }),
      Ticket.countDocuments({ ...base, status: { $in: ['resolved', 'closed'] } }),
      Ticket.countDocuments({ ...base, status: 'escalated' }),
      Ticket.countDocuments({ ...base, slaDueAt: { $lt: new Date() }, status: { $nin: ['resolved', 'closed'] } }),
    ]);

    const byCategory = await Ticket.aggregate([
      { $match: base },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]);

    const recent = await Ticket.find(base)
      .populate('student', 'name rollNumber')
      .populate('assignedTo', 'name')
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    res.json({
      total,
      open,
      resolved,
      escalated,
      breaching,
      byCategory: byCategory.map((c) => ({ category: c._id, count: c.count })),
      recent,
    });
  })
);

/* -------------------------- SINGLE TICKET ----------------------- */
router.get(
  '/tickets/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const ticket = await Ticket.findById(req.params.id)
      .populate('student', 'name rollNumber department email year')
      .populate('assignedTo', 'name designation email level role subjects')
      .populate('escalationHistory.from', 'name role level')
      .populate('escalationHistory.to', 'name role level')
      .populate('kbMatches.article', 'title category answer')
      .lean();
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    // Authorisation: students only their own; faculty only assigned/escalated; hod dept; admin all.
    const uid = String(req.user._id);
    const allowed =
      req.user.role === 'admin' ||
      (req.user.role === 'student' && String(ticket.student?._id) === uid) ||
      (req.user.role === 'faculty' &&
        (String(ticket.assignedTo?._id) === uid ||
          ticket.escalationHistory.some((h) => String(h.from?._id) === uid))) ||
      (req.user.role === 'hod' && ticket.department === (req.user.hodOf || req.user.department));
    if (!allowed) return res.status(403).json({ error: 'Not authorised to view this ticket' });

    const messages = await TicketMessage.find({
      ticket: ticket._id,
      ...(req.user.role === 'student' ? { type: { $ne: 'internal_note' } } : {}),
    })
      .populate('author', 'name role designation')
      .sort({ createdAt: 1 })
      .lean();

    res.json({ ticket, messages });
  })
);

/* ----------------------- FACULTY ACTIONS ------------------------ */
router.patch(
  '/tickets/:id/status',
  requireAuth,
  requireRole('faculty', 'hod', 'admin'),
  asyncHandler(async (req, res) => {
    const { status, summary } = req.body || {};
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const isHandler = String(ticket.assignedTo) === String(req.user._id);
    if (!isHandler && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the assigned handler can update this ticket' });
    }

    ticket.status = status;
    if (!ticket.firstResponseAt && ['in_progress', 'waiting_student', 'resolved'].includes(status)) {
      ticket.firstResponseAt = new Date();
    }
    if (['resolved', 'closed'].includes(status)) {
      ticket.resolution = { summary: summary || ticket.resolution?.summary || '', resolvedBy: req.user._id, resolvedAt: new Date() };
      await User.updateOne({ _id: ticket.assignedTo }, { $inc: { currentLoad: -1 } });
      await notify(ticket.student, {
        title: `Ticket ${ticket.ticketCode} ${status}`,
        body: summary || `Your ticket has been ${status} by ${req.user.name}.`,
        type: 'resolved',
        ticket: ticket._id,
        link: `/tickets/${ticket._id}`,
      });
    }
    await ticket.save();
    await logActivity({ actor: req.user, action: `ticket.${status}`, entity: 'Ticket', entityId: ticket._id, detail: ticket.subject });
    res.json({ ticket });
  })
);

/** Reply to a ticket (student or handler). */
router.post(
  '/tickets/:id/messages',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { body, type = 'reply' } = req.body || {};
    if (!body) return res.status(400).json({ error: 'Message body required' });
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const msg = await TicketMessage.create({
      ticket: ticket._id,
      author: req.user._id,
      authorRole: req.user.role,
      body,
      type: req.user.role === 'student' ? 'reply' : type,
    });

    if (!ticket.firstResponseAt && req.user.role !== 'student') ticket.firstResponseAt = new Date();
    if (req.user.role !== 'student' && ticket.status === 'assigned') ticket.status = 'in_progress';
    await ticket.save();

    // notify the other party
    const recipient = req.user.role === 'student' ? ticket.assignedTo : ticket.student;
    if (recipient) {
      await notify(recipient, {
        title: `New reply on ${ticket.ticketCode}`,
        body: body.slice(0, 120),
        type: 'reply',
        ticket: ticket._id,
        link: `/tickets/${ticket._id}`,
      });
    }
    const populated = await msg.populate('author', 'name role designation');
    res.status(201).json({ message: populated });
  })
);

/** Faculty/HOD escalate further up the ladder (bottom-up -> senior -> HOD). */
router.post(
  '/tickets/:id/escalate',
  requireAuth,
  requireRole('faculty', 'hod', 'admin'),
  asyncHandler(async (req, res) => {
    const { reason = 'Requires higher-level expertise' } = req.body || {};
    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    const nextLevel = (ticket.assignmentLevel || 1) + 1;
    if (nextLevel > 3) return res.status(400).json({ error: 'Already at the highest escalation level (HOD)' });

    const { assignee, level } = await assignBottomUp(ticket, {
      env: process.env,
      excludeIds: [ticket.assignedTo],
      minLevel: nextLevel,
    });
    if (!assignee) return res.status(400).json({ error: 'No handler available at next level' });

    const previous = ticket.assignedTo;
    ticket.assignmentLevel = Math.max(level, nextLevel);
    ticket.assignedTo = assignee._id;
    ticket.status = 'escalated';
    ticket.escalationHistory.push({ from: previous, to: assignee._id, level: ticket.assignmentLevel, reason, at: new Date() });
    computeSla(ticket, process.env, new Date());
    await ticket.save();

    if (previous) await User.updateOne({ _id: previous }, { $inc: { currentLoad: -1 } });
    await User.updateOne({ _id: assignee._id }, { $inc: { currentLoad: 1 } });

    await notify(assignee._id, {
      title: `Ticket escalated to you: ${ticket.ticketCode}`,
      body: reason,
      type: 'escalation',
      ticket: ticket._id,
      link: `/faculty/tickets/${ticket._id}`,
    });
    await notify(ticket.student, {
      title: `Ticket ${ticket.ticketCode} escalated`,
      body: `Your query was escalated to ${assignee.name} for specialised handling.`,
      type: 'escalation',
      ticket: ticket._id,
      link: `/tickets/${ticket._id}`,
    });
    await logActivity({ actor: req.user, action: 'ticket.escalate', entity: 'Ticket', entityId: ticket._id, detail: reason });

    res.json({ ticket, escalatedTo: assignee.name, level: ticket.assignmentLevel });
  })
);

/** Student feedback / rating after resolution. */
router.post(
  '/tickets/:id/feedback',
  requireAuth,
  requireRole('student'),
  asyncHandler(async (req, res) => {
    const { rating, comment } = req.body || {};
    const ticket = await Ticket.findOne({ _id: req.params.id, student: req.user._id });
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    ticket.feedback = { rating, comment, at: new Date() };
    if (ticket.status === 'resolved') ticket.status = 'closed';
    await ticket.save();
    res.json({ ticket });
  })
);

/** Student's own ticket history with analytics. */
router.get(
  '/tickets/mine/history',
  requireAuth,
  requireRole('student'),
  asyncHandler(async (req, res) => {
    const tickets = await Ticket.find({ student: req.user._id })
      .populate('assignedTo', 'name designation')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ items: tickets });
  })
);

export default router;
