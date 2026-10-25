import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../utils/helpers.js';
import { User } from '../models/User.js';
import { Project } from '../models/Project.js';
import { Notification } from '../models/Notification.js';
import { MentorshipRequest } from '../models/MentorshipRequest.js';
import { ProjectSubmission } from '../models/ProjectSubmission.js';
import { ProjectMessage } from '../models/ProjectMessage.js';

const router = Router();
router.use(requireAuth);

const id = (value) => String(value?._id || value || '');
const isMember = (project, userId) => (project.members || []).some((m) => id(m.student) === id(userId));
const canSeeProject = (project, user) => {
  if (!project || !user) return false;
  if (user.role === 'admin') return true;
  if (id(project.mentor) === id(user._id)) return true;
  if (user.role === 'hod' && (project.department === (user.hodOf || user.department))) return true;
  return isMember(project, user._id);
};
const notify = (recipient, title, body, type, link, meta = {}) => Notification.create({ recipient, title, body, type, link, meta });
const populateProject = (query) => query.populate('mentor', 'name designation email department').populate('members.student', 'name rollNumber email department year semester').populate('createdBy', 'name');

router.get('/directory', asyncHandler(async (req, res) => {
  const filter = { role: { $in: ['faculty', 'hod'] }, isActive: true };
  if (req.query.department) filter.department = req.query.department;
  const faculty = await User.find(filter).select('name email designation department subjects level hodOf').sort({ name: 1 }).lean();
  res.json({ faculty });
}));

router.get('/mentorship-requests', asyncHandler(async (req, res) => {
  const filter = req.user.role === 'student' ? { student: req.user._id } : { mentor: req.user._id };
  if (!['student', 'faculty', 'hod'].includes(req.user.role)) return res.json({ requests: [] });
  const requests = await MentorshipRequest.find(filter).populate('student', 'name email rollNumber department year semester').populate('mentor', 'name email designation department').sort({ createdAt: -1 }).lean();
  res.json({ requests });
}));

router.post('/mentorship-requests', requireRole('student'), asyncHandler(async (req, res) => {
  const { mentorId, message = '' } = req.body || {};
  if (!mentorId) return res.status(400).json({ error: 'Choose a staff mentor first.' });
  const mentor = await User.findOne({ _id: mentorId, role: { $in: ['faculty', 'hod'] }, isActive: true });
  if (!mentor) return res.status(404).json({ error: 'The selected staff member was not found or is inactive.' });
  if (mentor.department && req.user.department && mentor.department !== req.user.department) return res.status(400).json({ error: 'Please select a mentor from your department.' });
  const existing = await MentorshipRequest.findOne({ student: req.user._id, mentor: mentor._id, status: { $in: ['pending', 'approved'] } });
  if (existing) return res.status(409).json({ error: existing.status === 'approved' ? 'You already have an approved mentorship with this staff member.' : 'Your request to this staff member is already pending.' });
  const request = await MentorshipRequest.create({ student: req.user._id, mentor: mentor._id, message: String(message).slice(0, 1500) });
  await notify(mentor._id, 'New mentorship request', `${req.user.name} has requested you as their project mentor.`, 'mentorship', '/faculty/projects', { requestId: String(request._id) });
  res.status(201).json({ request });
}));

router.patch('/mentorship-requests/:requestId', requireRole('faculty', 'hod'), asyncHandler(async (req, res) => {
  const { decision } = req.body || {};
  if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ error: 'Decision must be approved or rejected.' });
  const request = await MentorshipRequest.findOne({ _id: req.params.requestId, mentor: req.user._id, status: 'pending' });
  if (!request) return res.status(404).json({ error: 'Pending mentorship request not found.' });
  request.status = decision;
  request.decidedAt = new Date();
  await request.save();
  await notify(request.student, `Mentorship request ${decision}`, `${req.user.name} ${decision} your mentorship request.`, 'mentorship', '/student/projects', { requestId: String(request._id) });
  res.json({ request });
}));

router.get('/projects', asyncHandler(async (req, res) => {
  let filter;
  if (req.user.role === 'student') filter = { 'members.student': req.user._id };
  else if (req.user.role === 'faculty') filter = { mentor: req.user._id };
  else if (req.user.role === 'hod') filter = { department: req.user.hodOf || req.user.department };
  else filter = {};
  // Private workspace: return only projects the current user is authorized to manage or join.
  const projects = await populateProject(Project.find(filter)).sort({ updatedAt: -1 }).lean();

  // College-wide gallery: expose only completed, explicitly published project details.
  // Do not include student/staff email addresses or internal progress/chat data.
  const published = await Project.find({ published: true, status: 'completed' })
    .select('title description department semester category mentor members.name members.role members.student published publishedAt repositoryUrl documentationUrl')
    .populate('mentor', 'name designation department')
    .populate('members.student', 'name')
    .sort({ publishedAt: -1 })
    .limit(50)
    .lean();
  res.json({ projects, published });
}));

router.post('/projects', requireRole('student'), asyncHandler(async (req, res) => {
  const { title, description, mentorId, category = 'mini_project', semester, repositoryUrl = '', documentationUrl = '', memberEmails = [] } = req.body || {};
  if (!title?.trim() || !description?.trim() || !mentorId) return res.status(400).json({ error: 'Project title, description, and approved mentor are required.' });
  const approved = await MentorshipRequest.findOne({ student: req.user._id, mentor: mentorId, status: 'approved' });
  if (!approved) return res.status(403).json({ error: 'The selected staff member must approve your mentorship request before you create a project with them.' });
  const mentor = await User.findOne({ _id: mentorId, role: { $in: ['faculty', 'hod'] }, isActive: true });
  if (!mentor) return res.status(404).json({ error: 'Mentor not found.' });
  const emails = Array.isArray(memberEmails) ? [...new Set(memberEmails.map((e) => String(e).trim().toLowerCase()).filter(Boolean))].slice(0, 9) : [];
  const teammates = emails.length ? await User.find({ email: { $in: emails }, role: 'student', isActive: true, department: req.user.department }).select('_id name rollNumber email department year semester') : [];
  if (teammates.length !== emails.length) return res.status(400).json({ error: 'One or more teammate emails were not found as active students in your department.' });
  const members = [{ student: req.user._id, rollNumber: req.user.rollNumber, name: req.user.name, role: 'Team Lead' }, ...teammates.filter((u) => id(u._id) !== id(req.user._id)).map((u) => ({ student: u._id, rollNumber: u.rollNumber, name: u.name, role: 'Team Member' }))];
  const project = await Project.create({ title: title.trim().slice(0, 180), description: description.trim().slice(0, 5000), department: req.user.department || mentor.department || 'Common', batch: req.user.batch || '', semester: Number(semester || req.user.semester || 1), category, mentor: mentor._id, members, status: 'in_progress', repositoryUrl: String(repositoryUrl).slice(0, 500), documentationUrl: String(documentationUrl).slice(0, 500), createdBy: req.user._id });
  for (const member of members) {
    if (id(member.student) !== id(req.user._id)) await notify(member.student, 'Added to a project team', `You have been added to project “${project.title}”.`, 'project', '/student/projects', { projectId: String(project._id) });
  }
  await notify(mentor._id, 'New project started', `${req.user.name} created “${project.title}” under your mentorship.`, 'project', '/faculty/projects', { projectId: String(project._id) });
  res.status(201).json({ project: await populateProject(Project.findById(project._id)).lean() });
}));

router.get('/projects/:projectId/submissions', asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  if (!canSeeProject(project, req.user)) return res.status(403).json({ error: 'You do not have access to this project.' });
  const submissions = await ProjectSubmission.find({ project: project._id }).select('-attachments.data').populate('submittedBy', 'name rollNumber').populate('reviewedBy', 'name designation').sort({ weekNumber: -1, createdAt: -1 }).lean();
  res.json({ submissions });
}));

router.post('/projects/:projectId/submissions', requireRole('student'), asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  if (!isMember(project, req.user._id)) return res.status(403).json({ error: 'Only project team members can submit weekly progress.' });
  if (project.published || project.status === 'completed') return res.status(400).json({ error: 'This project is completed and no longer accepts weekly submissions.' });
  const { weekNumber, title, description, completedTasks = [], attachments = [] } = req.body || {};
  const week = Number(weekNumber);
  if (!Number.isInteger(week) || week < 1 || week > 52 || !title?.trim() || !description?.trim()) return res.status(400).json({ error: 'Provide a valid week number, title, and description.' });
  if (!Array.isArray(attachments) || attachments.length > 3) return res.status(400).json({ error: 'Attach up to three files per weekly submission.' });
  const safeAttachments = [];
  for (const file of attachments) {
    const name = String(file?.name || 'attachment').replace(/[\\/]/g, '_').slice(0, 180);
    const mimeType = String(file?.mimeType || 'application/octet-stream').slice(0, 120);
    const data = String(file?.data || '');
    if (!data.startsWith('data:') || !data.includes(';base64,') || !/^data:(application\/pdf|text\/plain|image\/(png|jpeg|webp)|application\/(zip|vnd.openxmlformats-officedocument.wordprocessingml.document|vnd.openxmlformats-officedocument.presentationml.presentation|vnd.openxmlformats-officedocument.spreadsheetml.sheet));base64,/i.test(data)) return res.status(400).json({ error: `Unsupported attachment type: ${name}. Use PDF, DOCX, PPTX, XLSX, TXT, ZIP, PNG, JPEG, or WEBP.` });
    const base64 = data.split(',')[1] || '';
    const size = Math.floor(base64.length * 3 / 4);
    if (size > 1024 * 1024) return res.status(400).json({ error: `${name} exceeds the 1 MB per-file limit.` });
    safeAttachments.push({ name, mimeType, size, data });
  }
  const submission = await ProjectSubmission.create({ project: project._id, submittedBy: req.user._id, weekNumber: week, title: title.trim().slice(0, 180), description: description.trim().slice(0, 5000), completedTasks: Array.isArray(completedTasks) ? completedTasks.map((t) => String(t).trim().slice(0, 500)).filter(Boolean).slice(0, 20) : [], attachments: safeAttachments });
  await notify(project.mentor, 'Weekly project submission', `${req.user.name} submitted Week ${week} progress for “${project.title}”.`, 'project_review', `/${req.user.role}/projects`, { projectId: String(project._id), submissionId: String(submission._id) });
  for (const member of project.members) if (id(member.student) !== id(req.user._id)) await notify(member.student, 'Team weekly update', `${req.user.name} submitted Week ${week} progress for “${project.title}”.`, 'project', '/student/projects', { projectId: String(project._id), submissionId: String(submission._id) });
  res.status(201).json({ submission: { ...submission.toObject(), attachments: submission.attachments.map((a) => ({ _id: a._id, name: a.name, mimeType: a.mimeType, size: a.size })) } });
}));

router.patch('/submissions/:submissionId/review', requireRole('faculty', 'hod'), asyncHandler(async (req, res) => {
  const { status, mentorFeedback = '', nextSteps = '' } = req.body || {};
  if (!['under_review', 'changes_requested', 'approved'].includes(status)) return res.status(400).json({ error: 'Choose a valid review status.' });
  const submission = await ProjectSubmission.findById(req.params.submissionId);
  if (!submission) return res.status(404).json({ error: 'Submission not found.' });
  const project = await Project.findById(submission.project);
  if (!project || !canSeeProject(project, req.user) || (req.user.role === 'faculty' && id(project.mentor) !== id(req.user._id))) return res.status(403).json({ error: 'Only the assigned mentor can review this submission.' });
  submission.status = status;
  submission.mentorFeedback = String(mentorFeedback).trim().slice(0, 5000);
  submission.nextSteps = String(nextSteps).trim().slice(0, 3000);
  submission.reviewedBy = req.user._id;
  submission.reviewedAt = new Date();
  await submission.save();
  for (const member of project.members) await notify(member.student, 'Mentor reviewed weekly progress', `Week ${submission.weekNumber} for “${project.title}”: ${status.replace('_', ' ')}.`, 'project_review', '/student/projects', { projectId: String(project._id), submissionId: String(submission._id) });
  res.json({ submission: await ProjectSubmission.findById(submission._id).select('-attachments.data').populate('submittedBy', 'name rollNumber').populate('reviewedBy', 'name designation').lean() });
}));

router.get('/submissions/:submissionId/attachments/:attachmentId', asyncHandler(async (req, res) => {
  const submission = await ProjectSubmission.findById(req.params.submissionId).select('+attachments.data');
  if (!submission) return res.status(404).json({ error: 'Submission not found.' });
  const project = await Project.findById(submission.project);
  if (!canSeeProject(project, req.user)) return res.status(403).json({ error: 'You do not have access to this attachment.' });
  const file = submission.attachments.id(req.params.attachmentId);
  if (!file) return res.status(404).json({ error: 'Attachment not found.' });
  const base64 = file.data.split(',')[1];
  res.json({ name: file.name, mimeType: file.mimeType, data: base64 });
}));

router.get('/projects/:projectId/messages', asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  if (!canSeeProject(project, req.user)) return res.status(403).json({ error: 'You do not have access to this project chat.' });
  const messages = await ProjectMessage.find({ project: project._id }).populate('sender', 'name role profileImage').sort({ createdAt: 1 }).limit(200).lean();
  res.json({ messages });
}));

router.post('/projects/:projectId/messages', asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  if (!canSeeProject(project, req.user)) return res.status(403).json({ error: 'You do not have access to this project chat.' });
  const message = String(req.body?.message || '').trim();
  if (!message) return res.status(400).json({ error: 'Message cannot be empty.' });
  const saved = await ProjectMessage.create({ project: project._id, sender: req.user._id, message: message.slice(0, 3000) });
  const recipients = new Set([id(project.mentor), ...(project.members || []).map((m) => id(m.student))]);
  recipients.delete(id(req.user._id));
  await Promise.all([...recipients].map((recipient) => notify(recipient, `New message in ${project.title}`, `${req.user.name}: ${message.slice(0, 120)}`, 'project_chat', `/${req.user.role}/projects`, { projectId: String(project._id), messageId: String(saved._id) })));
  res.status(201).json({ message: await ProjectMessage.findById(saved._id).populate('sender', 'name role profileImage').lean() });
}));

router.patch('/projects/:projectId/publish', asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  if (!canSeeProject(project, req.user)) return res.status(403).json({ error: 'You do not have access to this project.' });
  if (project.status !== 'completed') return res.status(400).json({ error: 'Mark the project as completed before publishing it.' });
  if (req.user.role === 'student' && !isMember(project, req.user._id)) return res.status(403).json({ error: 'Only project team members can publish this project.' });
  project.published = true;
  project.publishedAt = new Date();
  await project.save();
  res.json({ project: await populateProject(Project.findById(project._id)).lean() });
}));

router.patch('/projects/:projectId/status', requireRole('faculty', 'hod'), asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  if (!canSeeProject(project, req.user) || (req.user.role === 'faculty' && id(project.mentor) !== id(req.user._id))) return res.status(403).json({ error: 'Only the assigned mentor can update project status.' });
  const { status } = req.body || {};
  if (!['in_progress', 'under_review', 'completed'].includes(status)) return res.status(400).json({ error: 'Invalid project status.' });
  project.status = status;
  await project.save();
  for (const member of project.members) await notify(member.student, 'Project status updated', `Your project “${project.title}” is now ${status.replace('_', ' ')}.`, 'project', '/student/projects', { projectId: String(project._id) });
  res.json({ project: await populateProject(Project.findById(project._id)).lean() });
}));

export default router;
