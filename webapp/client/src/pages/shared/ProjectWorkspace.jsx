import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  Layers,
  Users,
  CheckCircle2,
  Clock,
  Calendar,
  MessageSquare,
  Plus,
  Send,
  Loader2,
  Award,
} from 'lucide-react';
import api, { errText } from '../../api/client.js';
import Layout from '../../layouts/Layout.jsx';
import { useShellData } from '../../App.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { Spinner, Empty, Modal } from '../../components/ui.jsx';

export default function ProjectWorkspace() {
  const { user } = useAuth();
  const { unread, badges } = useShellData();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedbackText, setFeedbackText] = useState('');
  const [busy, setBusy] = useState(false);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const endpoint = ['faculty', 'hod'].includes(user?.role) ? '/faculty/projects' : '/projects/public';
      const { data } = await api.get(endpoint);
      const list = data.projects || [];
      setProjects(list);
      if (list.length > 0 && !selectedProject) {
        setSelectedProject(list[0]);
      } else if (selectedProject) {
        const updated = list.find((p) => p._id === selectedProject._id);
        if (updated) setSelectedProject(updated);
      }
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line
  }, [user]);

  const toggleMilestone = async (mIndex, currentStatus) => {
    if (!selectedProject) return;
    try {
      await api.patch(`/faculty/projects/${selectedProject._id}/milestones/${mIndex}`, {
        isCompleted: !currentStatus,
      });
      toast.success('Milestone updated');
      loadProjects();
    } catch (e) {
      toast.error(errText(e));
    }
  };

  const handleAddFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackText.trim() || !selectedProject) return;
    setBusy(true);
    try {
      await api.post(`/faculty/projects/${selectedProject._id}/feedback`, {
        content: feedbackText.trim(),
      });
      toast.success('Feedback recorded for student team');
      setFeedbackText('');
      loadProjects();
    } catch (e) {
      toast.error(errText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout unread={unread} extraBadges={badges}>
      <div className="page-head">
        <div>
          <h1>Project Pulse — Academic Collaboration Workspace</h1>
          <p>
            Track student innovation projects, milestone deliverables, task allocation, and faculty mentor evaluations.
          </p>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : projects.length === 0 ? (
        <div className="card">
          <Empty text="No active projects found" sub="Approved student projects will appear here." />
        </div>
      ) : (
        <div className="grid-2" style={{ alignItems: 'start', gridTemplateColumns: '320px 1fr' }}>
          {/* Project List Sidebar */}
          <div className="card" style={{ padding: 12 }}>
            <div style={{ padding: '8px 12px', fontWeight: 700, fontSize: 13, color: 'var(--muted)', textTransform: 'uppercase' }}>
              Academic Projects
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              {projects.map((p) => (
                <div
                  key={p._id}
                  onClick={() => setSelectedProject(p)}
                  style={{
                    padding: 14,
                    borderRadius: 10,
                    cursor: 'pointer',
                    background: selectedProject?._id === p._id ? 'var(--blue-soft)' : 'transparent',
                    border: selectedProject?._id === p._id ? '1px solid var(--blue)' : '1px solid transparent',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14, color: selectedProject?._id === p._id ? 'var(--blue)' : '#0f172a' }}>
                    {p.title}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                    Mentor: {p.mentor?.name} · {p.members?.length || 0} students
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Project Detail Workspace */}
          {selectedProject && (
            <div style={{ display: 'grid', gap: 20 }}>
              <div className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
                  <div>
                    <span className="pill green" style={{ textTransform: 'uppercase', fontSize: 11, fontWeight: 700, marginBottom: 8, display: 'inline-block' }}>
                      {selectedProject.status?.replace('_', ' ')}
                    </span>
                    <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{selectedProject.title}</h2>
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                      {selectedProject.department} · Batch {selectedProject.batch} (Sem {selectedProject.semester})
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: 14.5, color: '#475569', lineHeight: 1.6, marginBottom: 20 }}>
                  {selectedProject.description}
                </p>

                {/* Team Members */}
                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={16} /> Team Members &amp; Mentor
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                    <div>
                      <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>FACULTY MENTOR</span>
                      <div style={{ fontWeight: 600, fontSize: 13.5 }}>{selectedProject.mentor?.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{selectedProject.mentor?.designation}</div>
                    </div>
                    {selectedProject.members?.map((m, i) => (
                      <div key={i}>
                        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>{m.role?.toUpperCase()}</span>
                        <div style={{ fontWeight: 600, fontSize: 13.5 }}>{m.name || m.student?.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--blue)', fontFamily: 'monospace' }}>
                          {m.rollNumber || m.student?.rollNumber}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Milestones */}
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Calendar size={18} /> Project Milestones &amp; Deliverables
                  </h3>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {selectedProject.milestones?.map((m, i) => (
                      <div
                        key={i}
                        style={{
                          padding: 14,
                          borderRadius: 10,
                          border: '1px solid #e2e8f0',
                          background: m.isCompleted ? '#f0fdf4' : '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {['faculty', 'hod'].includes(user?.role) ? (
                            <input
                              type="checkbox"
                              checked={m.isCompleted}
                              onChange={() => toggleMilestone(i, m.isCompleted)}
                              style={{ width: 18, height: 18, cursor: 'pointer' }}
                            />
                          ) : m.isCompleted ? (
                            <CheckCircle2 size={18} style={{ color: '#16a34a' }} />
                          ) : (
                            <Clock size={18} style={{ color: '#94a3b8' }} />
                          )}
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14, textDecoration: m.isCompleted ? 'line-through' : 'none', color: m.isCompleted ? '#166534' : '#0f172a' }}>
                              {m.title}
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{m.description}</div>
                          </div>
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                          Due: {new Date(m.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mentor Feedback Section */}
              <div className="card" style={{ padding: 22 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <MessageSquare size={18} /> Mentor Reviews &amp; Feedback
                </h3>

                <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
                  {(!selectedProject.mentorFeedback || selectedProject.mentorFeedback.length === 0) ? (
                    <span style={{ color: 'var(--muted)', fontSize: 13.5 }}>No mentor feedback recorded yet.</span>
                  ) : (
                    selectedProject.mentorFeedback.map((fb, idx) => (
                      <div key={idx} style={{ background: '#f8fafc', padding: 14, borderRadius: 10, border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12, color: 'var(--muted)' }}>
                          <strong>{selectedProject.mentor?.name}</strong>
                          <span>{new Date(fb.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p style={{ fontSize: 13.5, color: '#334155', margin: 0 }}>{fb.content}</p>
                      </div>
                    ))
                  )}
                </div>

                {['faculty', 'hod'].includes(user?.role) && (
                  <form onSubmit={handleAddFeedback} style={{ display: 'flex', gap: 10 }}>
                    <input
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Add mentor observation, guidance, or evaluation note for the team..."
                      style={{ flex: 1 }}
                    />
                    <button type="submit" className="btn btn-primary btn-sm" disabled={busy || !feedbackText.trim()}>
                      {busy ? <Loader2 size={16} className="spin" /> : <Send size={15} />} Submit Feedback
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
