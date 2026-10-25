import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Award, BookOpen, CheckCircle2, Clock, FileText, MessageCircle, Paperclip, Plus, RefreshCw, Send, Users, UserCheck, XCircle } from 'lucide-react';
import api, { errText } from '../../api/client.js';
import Layout from '../../layouts/Layout.jsx';
import { useShellData } from '../../App.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Spinner, Empty } from '../../components/ui.jsx';

const cardStyle = { padding: 20, display: 'grid', gap: 14 };
const fieldStyle = { width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 9, font: 'inherit', boxSizing: 'border-box' };
const buttonStyle = { border: 0, borderRadius: 9, padding: '10px 14px', cursor: 'pointer', fontWeight: 650, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7 };
const statusLabel = (s = '') => s.replaceAll('_', ' ');

export default function ProjectWorkspace() {
  const { user } = useAuth();
  const { unread, badges } = useShellData();
  const isStudent = user?.role === 'student';
  const isMentor = ['faculty', 'hod'].includes(user?.role);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [faculty, setFaculty] = useState([]);
  const [requests, setRequests] = useState([]);
  const [projects, setProjects] = useState([]);
  const [published, setPublished] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [tab, setTab] = useState('projects');
  const [mentorId, setMentorId] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [projectForm, setProjectForm] = useState({ title: '', description: '', mentorId: '', category: 'mini_project', semester: user?.semester || 1, repositoryUrl: '', documentationUrl: '', memberEmails: '' });
  const [submissionForm, setSubmissionForm] = useState({ weekNumber: 1, title: '', description: '', completedTasks: '', files: [] });
  const [reviewForm, setReviewForm] = useState({ status: 'under_review', mentorFeedback: '', nextSteps: '' });
  const [chatText, setChatText] = useState('');

  const selectedProject = useMemo(() => projects.find((p) => p._id === selectedId) || published.find((p) => p._id === selectedId) || null, [projects, published, selectedId]);
  const approvedMentorships = requests.filter((r) => r.status === 'approved');

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const jobs = [api.get('/project-pulse/projects')];
      if (isStudent) jobs.push(api.get('/project-pulse/directory', { params: { department: user?.department } }), api.get('/project-pulse/mentorship-requests'));
      if (isMentor) jobs.push(api.get('/project-pulse/mentorship-requests'));
      const result = await Promise.all(jobs);
      setProjects(result[0].data.projects || []);
      setPublished(result[0].data.published || []);
      let nextRequests = [];
      if (isStudent) {
        setFaculty(result[1].data.faculty || []);
        nextRequests = result[2].data.requests || [];
      } else if (isMentor) nextRequests = result[1].data.requests || [];
      setRequests(nextRequests);
      const allProjects = [...(result[0].data.projects || []), ...(result[0].data.published || [])];
      if (!allProjects.some((p) => p._id === selectedId)) setSelectedId(allProjects[0]?._id || '');
    } catch (e) { toast.error(errText(e)); }
    finally { setLoading(false); }
  }, [isStudent, isMentor, selectedId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const loadProjectDetails = useCallback(async (projectId) => {
    if (!projectId) { setSubmissions([]); setMessages([]); return; }
    try {
      const [s, m] = await Promise.all([
        api.get(`/project-pulse/projects/${projectId}/submissions`),
        api.get(`/project-pulse/projects/${projectId}/messages`),
      ]);
      setSubmissions(s.data.submissions || []);
      setMessages(m.data.messages || []);
    } catch (e) { toast.error(errText(e)); }
  }, []);

  useEffect(() => {
    loadProjectDetails(selectedId);
    if (!selectedId) return undefined;
    const timer = window.setInterval(() => loadProjectDetails(selectedId), 10000);
    return () => window.clearInterval(timer);
  }, [selectedId, loadProjectDetails]);

  const requestMentorship = async (e) => {
    e.preventDefault();
    if (!mentorId) return toast.error('Choose a staff mentor first.');
    setBusy(true);
    try {
      await api.post('/project-pulse/mentorship-requests', { mentorId, message: requestMessage });
      toast.success('Mentorship request sent to the selected staff member.');
      setRequestMessage(''); setMentorId(''); await loadAll();
    } catch (e) { toast.error(errText(e)); }
    finally { setBusy(false); }
  };

  const decideRequest = async (requestId, decision) => {
    try {
      await api.patch(`/project-pulse/mentorship-requests/${requestId}`, { decision });
      toast.success(`Request ${decision}.`); await loadAll();
    } catch (e) { toast.error(errText(e)); }
  };

  const createProject = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const { memberEmails, ...payload } = projectForm;
      payload.memberEmails = memberEmails.split(/[\n,;]/).map((s) => s.trim()).filter(Boolean);
      await api.post('/project-pulse/projects', payload);
      toast.success('Project and team created. Your mentor has been notified.');
      setProjectForm({ title: '', description: '', mentorId: '', category: 'mini_project', semester: user?.semester || 1, repositoryUrl: '', documentationUrl: '', memberEmails: '' });
      setTab('projects'); await loadAll();
    } catch (e) { toast.error(errText(e)); }
    finally { setBusy(false); }
  };

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length > 3) return toast.error('Choose up to three files.');
    const allowed = /\.(pdf|docx|pptx|xlsx|txt|zip|png|jpe?g|webp)$/i;
    if (files.some((f) => !allowed.test(f.name))) return toast.error('Supported files: PDF, DOCX, PPTX, XLSX, TXT, ZIP, PNG, JPEG, WEBP.');
    if (files.some((f) => f.size > 1024 * 1024)) return toast.error('Each file must be 1 MB or smaller.');
    const read = (file) => new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.onload = () => resolve({ name: file.name, mimeType: file.type || 'application/octet-stream', data: reader.result }); reader.onerror = reject; reader.readAsDataURL(file);
    });
    try { setSubmissionForm((s) => ({ ...s, files: [] })); const result = await Promise.all(files.map(read)); setSubmissionForm((s) => ({ ...s, files: result })); }
    catch { toast.error('Could not read the selected files.'); }
  };

  const submitWeekly = async (e) => {
    e.preventDefault(); if (!selectedProject) return;
    setBusy(true);
    try {
      await api.post(`/project-pulse/projects/${selectedProject._id}/submissions`, {
        weekNumber: Number(submissionForm.weekNumber), title: submissionForm.title, description: submissionForm.description,
        completedTasks: submissionForm.completedTasks.split('\n').map((x) => x.trim()).filter(Boolean), attachments: submissionForm.files,
      });
      toast.success('Weekly progress submitted to your mentor.');
      setSubmissionForm((s) => ({ ...s, title: '', description: '', completedTasks: '', files: [] }));
      await loadProjectDetails(selectedProject._id);
    } catch (e) { toast.error(errText(e)); }
    finally { setBusy(false); }
  };

  const reviewSubmission = async (e, submissionId) => {
    e.preventDefault(); setBusy(true);
    try {
      await api.patch(`/project-pulse/submissions/${submissionId}/review`, reviewForm);
      toast.success('Review sent to the project team.'); setReviewForm({ status: 'under_review', mentorFeedback: '', nextSteps: '' });
      await loadProjectDetails(selectedProject?._id);
    } catch (e) { toast.error(errText(e)); }
    finally { setBusy(false); }
  };

  const sendMessage = async (e) => {
    e.preventDefault(); if (!selectedProject || !chatText.trim()) return;
    try { await api.post(`/project-pulse/projects/${selectedProject._id}/messages`, { message: chatText }); setChatText(''); await loadProjectDetails(selectedProject._id); }
    catch (e) { toast.error(errText(e)); }
  };

  const downloadAttachment = async (submission, attachment) => {
    try {
      const { data } = await api.get(`/project-pulse/submissions/${submission._id}/attachments/${attachment._id}`);
      const bytes = Uint8Array.from(atob(data.data), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: data.mimeType }));
      const a = document.createElement('a'); a.href = url; a.download = data.name; a.click(); URL.revokeObjectURL(url);
    } catch (e) { toast.error(errText(e)); }
  };

  const publishProject = async () => {
    try { await api.patch(`/project-pulse/projects/${selectedProject._id}/publish`); toast.success('Project published to the completed-project gallery.'); await loadAll(); }
    catch (e) { toast.error(errText(e)); }
  };

  const updateStatus = async (status) => {
    try { await api.patch(`/project-pulse/projects/${selectedProject._id}/status`, { status }); toast.success('Project status updated.'); await loadAll(); }
    catch (e) { toast.error(errText(e)); }
  };

  const panelButton = (label, value) => <button type="button" onClick={() => setTab(value)} style={{ ...buttonStyle, background: tab === value ? '#1d4ed8' : '#e2e8f0', color: tab === value ? '#fff' : '#334155' }}>{label}</button>;

  return <Layout unread={unread} extraBadges={badges}>
    <div className="page-head"><div><h1>Project Pulse</h1><p>Find a mentor, build your team, track weekly progress, and share completed projects with your college.</p></div><button type="button" onClick={loadAll} style={{ ...buttonStyle, background: '#e2e8f0', color: '#334155' }}><RefreshCw size={16} /> Refresh</button></div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 18 }}>
      {panelButton('My / Mentored Projects', 'projects')}
      {isStudent && panelButton('Find a Mentor', 'mentors')}
      {isStudent && panelButton('Start a Project', 'create')}
      {isMentor && panelButton(`Mentorship Requests${requests.filter((r) => r.status === 'pending').length ? ` (${requests.filter((r) => r.status === 'pending').length})` : ''}`, 'requests')}
      {panelButton('Completed Project Gallery', 'gallery')}
    </div>

    {loading ? <Spinner /> : <>
      {tab === 'mentors' && isStudent && <div className="card" style={cardStyle}>
        <h2 style={{ margin: 0 }}>Request a project mentor</h2><p style={{ margin: 0, color: 'var(--muted)' }}>Choose a staff member from your department. You can start a mentored project after they approve your request.</p>
        <form onSubmit={requestMentorship} style={{ display: 'grid', gap: 12 }}>
          <select required value={mentorId} onChange={(e) => setMentorId(e.target.value)} style={fieldStyle}><option value="">Select staff mentor</option>{faculty.map((f) => <option key={f._id} value={f._id}>{f.name} — {f.designation || f.role} {f.department ? `(${f.department})` : ''}</option>)}</select>
          <textarea value={requestMessage} onChange={(e) => setRequestMessage(e.target.value)} placeholder="Briefly introduce your interests or project idea (optional)" rows={3} style={fieldStyle} />
          <div><button disabled={busy} type="submit" style={{ ...buttonStyle, background: '#1d4ed8', color: '#fff' }}><Send size={16} /> Send mentorship request</button></div>
        </form>
        <h3 style={{ marginBottom: 0 }}>My requests</h3>
        {requests.length === 0 ? <Empty text="No mentorship requests yet" sub="Choose a staff member above to get started." /> : requests.map((r) => <div key={r._id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}><div><strong>{r.mentor?.name}</strong><div style={{ color: 'var(--muted)', fontSize: 13 }}>{r.message || 'No message added'}</div></div><span className="pill" style={{ textTransform: 'capitalize' }}>{statusLabel(r.status)}</span></div>)}
      </div>}

      {tab === 'requests' && isMentor && <div className="card" style={cardStyle}><h2 style={{ margin: 0 }}>Mentorship requests</h2>{requests.filter((r) => r.status === 'pending').length === 0 ? <Empty text="No pending requests" sub="New student requests will appear here." /> : requests.filter((r) => r.status === 'pending').map((r) => <div key={r._id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 15, display: 'grid', gap: 8 }}><div><strong>{r.student?.name}</strong> <span style={{ color: 'var(--muted)', fontSize: 13 }}>· {r.student?.rollNumber || 'Student'} · Year {r.student?.year || '—'}</span></div><div style={{ fontSize: 14 }}>{r.message || 'No introductory message provided.'}</div><div style={{ display: 'flex', gap: 8 }}><button onClick={() => decideRequest(r._id, 'approved')} style={{ ...buttonStyle, background: '#dcfce7', color: '#166534' }}><CheckCircle2 size={16} /> Approve</button><button onClick={() => decideRequest(r._id, 'rejected')} style={{ ...buttonStyle, background: '#fee2e2', color: '#991b1b' }}><XCircle size={16} /> Reject</button></div></div>)}</div>}

      {tab === 'create' && isStudent && <div className="card" style={cardStyle}><h2 style={{ margin: 0 }}>Start a project</h2><p style={{ margin: 0, color: 'var(--muted)' }}>Only mentors who approved your request can be selected. Add teammate institutional email addresses separated by commas.</p>
        <form onSubmit={createProject} style={{ display: 'grid', gap: 12 }}>
          <input required maxLength={180} value={projectForm.title} onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })} placeholder="Project title" style={fieldStyle} />
          <textarea required maxLength={5000} rows={4} value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} placeholder="Project idea, problem statement, and intended outcome" style={fieldStyle} />
          <select required value={projectForm.mentorId} onChange={(e) => setProjectForm({ ...projectForm, mentorId: e.target.value })} style={fieldStyle}><option value="">Select an approved mentor</option>{approvedMentorships.map((r) => <option key={r._id} value={r.mentor?._id}>{r.mentor?.name}</option>)}</select>
          <select value={projectForm.category} onChange={(e) => setProjectForm({ ...projectForm, category: e.target.value })} style={fieldStyle}><option value="mini_project">Mini project</option><option value="capstone">Capstone</option><option value="research">Research</option><option value="industry_sponsored">Industry sponsored</option><option value="hackathon">Hackathon</option></select>
          <input type="number" min="1" max="8" value={projectForm.semester} onChange={(e) => setProjectForm({ ...projectForm, semester: e.target.value })} placeholder="Current semester" style={fieldStyle} />
          <textarea rows={2} value={projectForm.memberEmails} onChange={(e) => setProjectForm({ ...projectForm, memberEmails: e.target.value })} placeholder="Teammate emails (optional), separated by commas" style={fieldStyle} />
          <input value={projectForm.repositoryUrl} onChange={(e) => setProjectForm({ ...projectForm, repositoryUrl: e.target.value })} placeholder="GitHub repository URL (optional)" style={fieldStyle} />
          <input value={projectForm.documentationUrl} onChange={(e) => setProjectForm({ ...projectForm, documentationUrl: e.target.value })} placeholder="Demo / documentation URL (optional)" style={fieldStyle} />
          <div><button disabled={busy || !approvedMentorships.length} type="submit" style={{ ...buttonStyle, background: '#1d4ed8', color: '#fff' }}><Plus size={16} /> Create project and team</button>{!approvedMentorships.length && <p style={{ color: '#b45309', fontSize: 13 }}>You need an approved mentorship request before creating a project.</p>}</div>
        </form>
      </div>}

      {tab === 'projects' && <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 0.8fr) minmax(0, 1.7fr)', gap: 16, alignItems: 'start' }}>
        <div className="card" style={{ padding: 12 }}><div style={{ padding: 10, fontWeight: 750 }}> {isStudent ? 'My team projects' : 'Projects I mentor'} </div>{projects.length === 0 ? <Empty text="No projects yet" sub={isStudent ? 'Request a mentor to get started.' : 'Approved projects assigned to you appear here.'} /> : projects.map((p) => <button key={p._id} onClick={() => setSelectedId(p._id)} style={{ width: '100%', textAlign: 'left', border: selectedId === p._id ? '1px solid #2563eb' : '1px solid transparent', background: selectedId === p._id ? '#eff6ff' : 'transparent', padding: 12, borderRadius: 9, cursor: 'pointer', marginBottom: 5 }}><strong style={{ display: 'block', color: '#0f172a' }}>{p.title}</strong><span style={{ fontSize: 12, color: 'var(--muted)' }}>{p.mentor?.name || 'Mentor pending'} · {statusLabel(p.status)}</span></button>)}</div>
        {!selectedProject ? <div className="card" style={cardStyle}><Empty text="Choose a project" sub={isStudent ? 'Start by requesting a mentor or creating your first project.' : 'Projects under your mentorship will appear here.'} /></div> : <div style={{ display: 'grid', gap: 14 }}>
          <div className="card" style={cardStyle}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><div><span className="pill" style={{ textTransform: 'capitalize' }}>{statusLabel(selectedProject.status)}</span><h2 style={{ margin: '8px 0' }}>{selectedProject.title}</h2><div style={{ color: 'var(--muted)', fontSize: 13 }}>{selectedProject.department} · Semester {selectedProject.semester} · Mentor: {selectedProject.mentor?.name || '—'}</div></div><div style={{ display: 'flex', gap: 8, alignItems: 'start', flexWrap: 'wrap' }}>{isMentor && <select value={selectedProject.status} onChange={(e) => updateStatus(e.target.value)} style={{ ...fieldStyle, width: 'auto' }}><option value="in_progress">In progress</option><option value="under_review">Under review</option><option value="completed">Completed</option></select>}{selectedProject.status === 'completed' && !selectedProject.published && <button onClick={publishProject} style={{ ...buttonStyle, background: '#166534', color: '#fff' }}><Award size={16} /> Publish</button>}</div></div><p style={{ whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.6 }}>{selectedProject.description}</p><div><strong><Users size={15} style={{ verticalAlign: 'middle' }} /> Team members</strong><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>{(selectedProject.members || []).map((m) => <span key={m._id || m.student?._id} className="pill">{m.student?.name || m.name} {m.role === 'Team Lead' ? '· Lead' : ''}</span>)}</div></div>{selectedProject.published && <p style={{ color: '#166534', margin: 0 }}><CheckCircle2 size={15} style={{ verticalAlign: 'middle' }} /> Published in the completed-project gallery.</p>}</div>

          {isStudent && !selectedProject.published && selectedProject.status !== 'completed' && <form className="card" style={cardStyle} onSubmit={submitWeekly}><h3 style={{ margin: 0 }}><FileText size={18} style={{ verticalAlign: 'middle' }} /> Submit weekly progress</h3><div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 10 }}><input type="number" min="1" max="52" required value={submissionForm.weekNumber} onChange={(e) => setSubmissionForm({ ...submissionForm, weekNumber: e.target.value })} style={fieldStyle} /><input required value={submissionForm.title} onChange={(e) => setSubmissionForm({ ...submissionForm, title: e.target.value })} placeholder="Weekly task title" style={fieldStyle} /></div><textarea required rows={3} value={submissionForm.description} onChange={(e) => setSubmissionForm({ ...submissionForm, description: e.target.value })} placeholder="Describe what you completed and what you learned" style={fieldStyle} /><textarea rows={3} value={submissionForm.completedTasks} onChange={(e) => setSubmissionForm({ ...submissionForm, completedTasks: e.target.value })} placeholder="Completed tasks (one per line)" style={fieldStyle} /><label style={{ display: 'grid', gap: 6, fontSize: 13 }}><span><Paperclip size={15} style={{ verticalAlign: 'middle' }} /> Attach up to 3 files (max 1 MB each)</span><input type="file" multiple accept=".pdf,.docx,.pptx,.xlsx,.txt,.zip,.png,.jpg,.jpeg,.webp" onChange={(e) => handleFiles(e.target.files)} />{submissionForm.files.map((f) => <span key={f.name} style={{ color: 'var(--muted)' }}>{f.name}</span>)}</label><div><button disabled={busy} type="submit" style={{ ...buttonStyle, background: '#1d4ed8', color: '#fff' }}><Send size={16} /> Submit to mentor</button></div></form>}

          <div className="card" style={cardStyle}><h3 style={{ margin: 0 }}>Weekly submissions and mentor feedback</h3>{submissions.length === 0 ? <Empty text="No weekly submissions yet" sub="Submitted work and mentor reviews will be recorded here." /> : submissions.map((s) => <div key={s._id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, display: 'grid', gap: 8 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}><strong>Week {s.weekNumber}: {s.title}</strong><span className="pill" style={{ textTransform: 'capitalize' }}>{statusLabel(s.status)}</span></div><div style={{ color: 'var(--muted)', fontSize: 12 }}>Submitted by {s.submittedBy?.name || 'Team member'} · {new Date(s.createdAt).toLocaleDateString()}</div><p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{s.description}</p>{s.completedTasks?.length > 0 && <ul style={{ margin: 0, paddingLeft: 20 }}>{s.completedTasks.map((t, i) => <li key={i}>{t}</li>)}</ul>}{s.attachments?.length > 0 && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{s.attachments.map((a) => <button key={a._id} onClick={() => downloadAttachment(s, a)} style={{ ...buttonStyle, background: '#e2e8f0', color: '#334155' }}><Paperclip size={14} /> {a.name}</button>)}</div>}{s.mentorFeedback && <div style={{ background: '#f0f9ff', borderRadius: 8, padding: 10 }}><strong>Mentor feedback</strong><p style={{ whiteSpace: 'pre-wrap', margin: '4px 0 0' }}>{s.mentorFeedback}</p></div>}{s.nextSteps && <div style={{ background: '#fefce8', borderRadius: 8, padding: 10 }}><strong>Next steps / changes</strong><p style={{ whiteSpace: 'pre-wrap', margin: '4px 0 0' }}>{s.nextSteps}</p></div>}{isMentor && idOf(selectedProject.mentor) === idOf(user) && <form onSubmit={(e) => reviewSubmission(e, s._id)} style={{ display: 'grid', gap: 8, borderTop: '1px solid #e2e8f0', paddingTop: 10 }}><strong>Review this submission</strong><select value={reviewForm.status} onChange={(e) => setReviewForm({ ...reviewForm, status: e.target.value })} style={fieldStyle}><option value="under_review">Under review</option><option value="changes_requested">Changes requested</option><option value="approved">Approved</option></select><textarea rows={2} value={reviewForm.mentorFeedback} onChange={(e) => setReviewForm({ ...reviewForm, mentorFeedback: e.target.value })} placeholder="Feedback and suggested changes" style={fieldStyle} /><textarea rows={2} value={reviewForm.nextSteps} onChange={(e) => setReviewForm({ ...reviewForm, nextSteps: e.target.value })} placeholder="What should the team implement next?" style={fieldStyle} /><div><button type="submit" disabled={busy} style={{ ...buttonStyle, background: '#166534', color: '#fff' }}><CheckCircle2 size={15} /> Send review</button></div></form>}</div>)}</div>

          <div className="card" style={cardStyle}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><h3 style={{ margin: 0 }}><MessageCircle size={18} style={{ verticalAlign: 'middle' }} /> Project group chat</h3><button onClick={() => loadProjectDetails(selectedProject._id)} style={{ ...buttonStyle, background: '#e2e8f0', color: '#334155', padding: 7 }}><RefreshCw size={14} /></button></div><div style={{ display: 'grid', gap: 8, maxHeight: 320, overflowY: 'auto' }}>{messages.length === 0 ? <Empty text="No messages yet" sub="Start the project conversation with your team and mentor." /> : messages.map((m) => <div key={m._id} style={{ padding: 10, borderRadius: 9, background: idOf(m.sender) === idOf(user) ? '#eff6ff' : '#f8fafc', border: '1px solid #e2e8f0' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, color: 'var(--muted)' }}><strong>{m.sender?.name} · {m.sender?.role}</strong><span>{new Date(m.createdAt).toLocaleString()}</span></div><p style={{ whiteSpace: 'pre-wrap', margin: '5px 0 0' }}>{m.message}</p></div>)}</div><form onSubmit={sendMessage} style={{ display: 'flex', gap: 8 }}><input value={chatText} onChange={(e) => setChatText(e.target.value)} placeholder="Message the project group..." maxLength={3000} style={fieldStyle} /><button type="submit" disabled={!chatText.trim()} style={{ ...buttonStyle, background: '#1d4ed8', color: '#fff' }}><Send size={16} /></button></form></div>
        </div>}
      </div>}

      {tab === 'gallery' && <div className="card" style={cardStyle}><h2 style={{ margin: 0 }}><BookOpen size={20} style={{ verticalAlign: 'middle' }} /> Completed project gallery</h2><p style={{ color: 'var(--muted)', margin: 0 }}>Published projects from students across all years. Only projects marked completed can be published.</p>{published.length === 0 ? <Empty text="No published projects yet" sub="Completed projects will appear here when teams publish them at semester-end." /> : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>{published.map((p) => <button key={p._id} onClick={() => { setSelectedId(p._id); setTab('projects'); }} className="card" style={{ padding: 16, textAlign: 'left', cursor: 'pointer', border: '1px solid #e2e8f0' }}><span className="pill green">Completed</span><h3 style={{ margin: '8px 0' }}>{p.title}</h3><p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>{p.department} · Semester {p.semester}</p><p style={{ fontSize: 14 }}>{p.description}</p><div style={{ color: 'var(--muted)', fontSize: 12 }}>Mentor: {p.mentor?.name || '—'} · {p.members?.length || 0} team members</div>{p.repositoryUrl && <span style={{ color: '#1d4ed8', fontSize: 13 }}>Repository available</span>}</button>)}</div>}</div>}
    </>}
  </Layout>;
}

function idOf(value) { return String(value?._id || value || ''); }
