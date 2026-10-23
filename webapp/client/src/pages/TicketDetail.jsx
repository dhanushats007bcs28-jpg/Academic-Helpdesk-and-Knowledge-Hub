import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { errText } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Layout from '../layouts/Layout.jsx';
import { useShellData } from '../App.jsx';
import { StatusPill, PriorityPill, Modal, Spinner, ConfidenceBar } from '../components/ui.jsx';
import { ArrowLeft, Send, ArrowUpCircle, CheckCircle2, Clock, User as UserIcon, Sparkles, MessageSquare } from 'lucide-react';

export default function TicketDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { unread, badges } = useShellData();
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [showEscalate, setShowEscalate] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [showResolve, setShowResolve] = useState(false);
  const [summary, setSummary] = useState('');
  const [ratingModal, setRatingModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const [showKbModal, setShowKbModal] = useState(false);
  const [kbTitle, setKbTitle] = useState('');
  const [kbAnswer, setKbAnswer] = useState('');
  const [kbCategory, setKbCategory] = useState('');
  const [kbTags, setKbTags] = useState('');

  const load = async () => {
    try {
      const { data } = await api.get(`/tickets/${id}`);
      setTicket(data.ticket);
      setMessages(data.messages);
      if (data.ticket.resolution?.summary) {
        setSummary(data.ticket.resolution.summary);
        setKbAnswer(data.ticket.resolution.summary);
      }
      setKbTitle(data.ticket.subject || '');
      setKbCategory(data.ticket.category || 'General');
    } catch (e) { toast.error(errText(e)); }
  };

  const publishToKb = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/tickets/${id}/convert-to-kb`, {
        title: kbTitle,
        question: ticket.description,
        answer: kbAnswer,
        category: kbCategory,
        tags: kbTags.split(',').map((t) => t.trim()).filter(Boolean),
      });
      toast.success(data.message || 'Article published to Knowledge Base!');
      setShowKbModal(false);
      await load();
    } catch (e) { toast.error(errText(e)); } finally { setBusy(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const sendReply = async () => {
    if (!reply.trim()) return;
    setBusy(true);
    try {
      await api.post(`/tickets/${id}/messages`, { body: reply });
      setReply(''); await load(); toast.success('Reply sent');
    } catch (e) { toast.error(errText(e)); } finally { setBusy(false); }
  };

  const escalate = async () => {
    setBusy(true);
    try {
      const { data } = await api.post(`/tickets/${id}/escalate`, { reason: escalateReason });
      toast.success(`Escalated to ${data.escalatedTo} (level ${data.level})`);
      setShowEscalate(false); setEscalateReason(''); await load();
    } catch (e) { toast.error(errText(e)); } finally { setBusy(false); }
  };

  const resolve = async () => {
    setBusy(true);
    try {
      await api.patch(`/tickets/${id}/status`, { status: 'resolved', summary });
      toast.success('Ticket resolved'); setShowResolve(false); await load();
    } catch (e) { toast.error(errText(e)); } finally { setBusy(false); }
  };

  const setStatus = async (status) => {
    try { await api.patch(`/tickets/${id}/status`, { status }); toast.success(`Marked ${status}`); await load(); }
    catch (e) { toast.error(errText(e)); }
  };

  const submitRating = async () => {
    setBusy(true);
    try {
      await api.post(`/tickets/${id}/feedback`, { rating, comment });
      toast.success('Thanks for your feedback'); setRatingModal(false); await load();
    } catch (e) { toast.error(errText(e)); } finally { setBusy(false); }
  };

  if (!ticket) return <Layout unread={unread} extraBadges={badges}><Spinner /></Layout>;

  const isStudent = user.role === 'student';
  const isHandler = String(ticket.assignedTo?._id) === String(user._id);
  const canAct = (user.role === 'faculty' || user.role === 'hod' || user.role === 'admin') && (isHandler || user.role === 'admin');
  const slaOverdue = ticket.slaDueAt && new Date(ticket.slaDueAt) < new Date() && !['resolved', 'closed'].includes(ticket.status);
  const slaHrsLeft = ticket.slaDueAt ? (new Date(ticket.slaDueAt) - new Date()) / 3600000 : null;

  return (
    <Layout unread={unread} extraBadges={badges}>
      <button className="link-btn" style={{ marginBottom: 16 }} onClick={() => nav(-1)}>
        <ArrowLeft size={16} /> Back
      </button>

      <div className="page-head">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="t-id">{ticket.ticketCode}</span>
            <StatusPill status={ticket.status} />
            <PriorityPill priority={ticket.priority} />
          </h1>
          <p>{ticket.subject}</p>
        </div>
        <div className="head-actions">
          {canAct && ticket.status !== 'resolved' && ticket.status !== 'closed' && (
            <>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowResolve(true)}><CheckCircle2 size={16} /> Resolve</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setStatus('waiting_student')}><Clock size={16} /> Waiting on Student</button>
              {ticket.assignmentLevel < 3 && (
                <button className="btn btn-dark btn-sm" onClick={() => setShowEscalate(true)}><ArrowUpCircle size={16} /> Escalate</button>
              )}
            </>
          )}
          {canAct && ['resolved', 'closed'].includes(ticket.status) && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowKbModal(true)} style={{ background: '#7c3aed' }}>
              <Sparkles size={16} /> Convert to KB Guide
            </button>
          )}
          {isStudent && ['resolved'].includes(ticket.status) && !ticket.feedback?.rating && (
            <button className="btn btn-primary btn-sm" onClick={() => setRatingModal(true)}>Rate Resolution</button>
          )}
        </div>
      </div>

      {slaOverdue && (
        <div className="alert danger"><Clock size={20} /><div><b>24-working-hour SLA breached</b>Escalation is applied automatically by the system.</div></div>
      )}
      {!slaOverdue && slaHrsLeft != null && slaHrsLeft < 6 && !['resolved', 'closed'].includes(ticket.status) && (
        <div className="alert warn"><Clock size={20} /><div><b>SLA at risk</b>{slaHrsLeft.toFixed(1)} working hours remaining.</div></div>
      )}

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 22 }}>
          <div className="card">
            <div className="card-head"><h3><MessageSquare size={18} style={{ verticalAlign: -3, marginRight: 8 }} />Conversation</h3>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>{messages.length} message(s)</span></div>
            <div className="card-body" style={{ maxHeight: 480, overflowY: 'auto' }}>
              {messages.length === 0 && <p style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>No replies yet.</p>}
              {messages.map((m) => (
                <div key={m._id} className={`message ${m.author?._id === user._id ? 'mine' : ''}`}>
                  <div className="avatar" style={{ background: m.authorRole === 'faculty' ? '#0891b2' : m.authorRole === 'hod' ? '#7c3aed' : '#f59e0b' }}>
                    {m.author?.name?.split(' ').slice(0, 2).map((n) => n[0]).join('')}
                  </div>
                  <div className="bubble">
                    <div className="who">
                      {m.author?.name} · {m.author?.designation || m.authorRole}
                      {m.type === 'internal_note' && <span className="pill muted" style={{ marginLeft: 8 }}>Internal note</span>}
                    </div>
                    <p>{m.body}</p>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>{new Date(m.createdAt).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
            {ticket.status !== 'closed' && (
              <div style={{ padding: '0 22px 22px', display: 'flex', gap: 12 }}>
                <textarea className="input" style={{ minHeight: 60 }} placeholder="Write a reply…" value={reply} onChange={(e) => setReply(e.target.value)} />
                <button className="btn btn-primary" disabled={busy || !reply.trim()} onClick={sendReply}><Send size={17} /></button>
              </div>
            )}
          </div>

          {ticket.kbMatches?.length > 0 && (
            <div className="card">
              <div className="card-head"><h3><Sparkles size={18} style={{ verticalAlign: -3, marginRight: 8 }} />Knowledge Base Matches (text analytics)</h3></div>
              <div className="card-body">
                {ticket.kbMatches.map((m, i) => (
                  <div key={i} style={{ paddingBottom: 16, marginBottom: 16, borderBottom: i < ticket.kbMatches.length - 1 ? '1px solid var(--line)' : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, marginBottom: 8 }}>
                      <strong style={{ fontSize: 14.5 }}>{m.title}</strong>
                    </div>
                    {typeof m.score === 'number' && <ConfidenceBar score={m.score} />}
                    {m.article?.answer && <p style={{ fontSize: 13.5, color: '#3b5670', marginTop: 10 }}>{String(m.article.answer).slice(0, 220)}…</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gap: 22 }}>
          <div className="card">
            <div className="card-head"><h3>Details</h3></div>
            <div className="card-body">
              <div className="kv">
                <div><div className="k">Student</div><div className="v">{ticket.student?.name}<br /><span style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 400 }}>{ticket.student?.rollNumber}</span></div></div>
                <div><div className="k">Category</div><div className="v">{ticket.category}</div></div>
                <div><div className="k">Department</div><div className="v">{ticket.department || '—'}</div></div>
                <div><div className="k">Raised On</div><div className="v" style={{ fontSize: 13.5 }}>{new Date(ticket.createdAt).toLocaleString()}</div></div>
                <div><div className="k">Assigned To</div><div className="v">{ticket.assignedTo?.name || 'Unassigned'}<br /><span style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 400 }}>{ticket.assignedTo?.designation} · L{ticket.assignmentLevel}</span></div></div>
                <div><div className="k">SLA (24 working hrs)</div><div className="v" style={{ fontSize: 13.5 }}>{ticket.slaDueAt ? new Date(ticket.slaDueAt).toLocaleString() : '—'}</div></div>
              </div>
              <div style={{ marginTop: 20 }}><div className="k" style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600, marginBottom: 6 }}>DESCRIPTION</div>
                <p style={{ color: '#2b455f', fontSize: 14.5 }}>{ticket.description}</p></div>
              {ticket.assignmentExplanation && (
                <div style={{ marginTop: 14, background: '#f0f9ff', padding: '10px 14px', borderRadius: 8, border: '1px solid #bae6fd' }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0369a1', marginBottom: 4, letterSpacing: '0.04em' }}>
                    EXPLAINABLE FACULTY ASSIGNMENT RATIONALE
                  </div>
                  <div style={{ fontSize: 12.5, color: '#0c4a6e', lineHeight: 1.5 }}>{ticket.assignmentExplanation}</div>
                </div>
              )}
              {ticket.queryLemmas?.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  <div className="k" style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600, marginBottom: 8 }}>NLP KEYWORDS (after stop-word removal + lemmatization)</div>
                  <div className="chip-row">{ticket.queryLemmas.slice(0, 14).map((t, i) => <span key={i} className="chip blue">{t}</span>)}</div>
                </div>
              )}
            </div>
          </div>

          {ticket.escalationHistory?.length > 0 && (
            <div className="card">
              <div className="card-head"><h3>Escalation Trail</h3></div>
              <div className="card-body">
                <div className="timeline">
                  {ticket.escalationHistory.map((h, i) => (
                    <div className="tl-item" key={i}>
                      <div className="tl-title">{h.to?.name || '—'} <span className="pill purple" style={{ marginLeft: 6 }}>Level {h.level}</span></div>
                      <div className="tl-meta">{h.reason}</div>
                      <div className="tl-meta">{new Date(h.at).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {ticket.resolution?.summary && (
            <div className="card">
              <div className="card-head"><h3><CheckCircle2 size={18} style={{ verticalAlign: -3, marginRight: 8 }} />Resolution</h3></div>
              <div className="card-body"><p style={{ color: '#2b455f', fontSize: 14.5 }}>{ticket.resolution.summary}</p>
                {ticket.feedback?.rating && <div style={{ marginTop: 14 }}><div className="k">Student Rating</div><div className="v">{'★'.repeat(ticket.feedback.rating)}{'☆'.repeat(5 - ticket.feedback.rating)} · {ticket.feedback.comment}</div></div>}
              </div>
            </div>
          )}
        </div>
      </div>

      {showEscalate && (
        <Modal title="Escalate Ticket" onClose={() => setShowEscalate(false)}
          footer={<><button className="btn btn-ghost" onClick={() => setShowEscalate(false)}>Cancel</button>
            <button className="btn btn-dark" disabled={busy} onClick={escalate}>Escalate to Level {ticket.assignmentLevel + 1}</button></>}>
          <div className="alert info"><ArrowUpCircle size={20} /><div>Bottom-up escalation moves this ticket up one rung: faculty → senior faculty → HOD.</div></div>
          <div className="field"><label>Reason for escalation</label>
            <textarea value={escalateReason} onChange={(e) => setEscalateReason(e.target.value)} placeholder="Explain why this needs a higher level of expertise…" /></div>
        </Modal>
      )}

      {showResolve && (
        <Modal title="Resolve Ticket" onClose={() => setShowResolve(false)}
          footer={<><button className="btn btn-ghost" onClick={() => setShowResolve(false)}>Cancel</button>
            <button className="btn btn-success" disabled={busy || !summary.trim()} onClick={resolve}>Mark Resolved</button></>}>
          <div className="field"><label>Resolution summary</label>
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Describe the resolution — this is shown to the student and becomes searchable." /></div>
        </Modal>
      )}

      {ratingModal && (
        <Modal title="Rate this resolution" onClose={() => setRatingModal(false)}
          footer={<><button className="btn btn-ghost" onClick={() => setRatingModal(false)}>Later</button>
            <button className="btn btn-primary" disabled={busy} onClick={submitRating}>Submit Feedback</button></>}>
          <div className="field"><label>How satisfied are you?</label>
            <div style={{ fontSize: 34, letterSpacing: 6, cursor: 'pointer' }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} onClick={() => setRating(n)} style={{ color: n <= rating ? '#f59e0b' : '#cbd5e1' }}>★</span>
              ))}
            </div></div>
          <div className="field"><label>Comment (optional)</label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Anything you'd like to add…" /></div>
        </Modal>
      )}

      {showKbModal && (
        <Modal
          title="Convert Faculty Answer to Knowledge Hub Guide"
          onClose={() => setShowKbModal(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setShowKbModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" disabled={busy || !kbAnswer.trim()} onClick={publishToKb}>
                Publish Knowledge Article
              </button>
            </>
          }
        >
          <div style={{ display: 'grid', gap: 14 }}>
            <p style={{ fontSize: 13, color: '#64748b' }}>
              Promote this resolved answer into an official knowledge base guide. The NLP engine will automatically index tokens and lemmas for future student search matching.
            </p>
            <div className="field">
              <label>Article Title</label>
              <input value={kbTitle} onChange={(e) => setKbTitle(e.target.value)} required />
            </div>
            <div className="form-row">
              <div className="field">
                <label>Category</label>
                <input value={kbCategory} onChange={(e) => setKbCategory(e.target.value)} required />
              </div>
              <div className="field">
                <label>Tags (comma-separated)</label>
                <input value={kbTags} onChange={(e) => setKbTags(e.target.value)} placeholder="e.g. dbms, normalization, 3nf" />
              </div>
            </div>
            <div className="field">
              <label>Answer Explanation Body</label>
              <textarea value={kbAnswer} onChange={(e) => setKbAnswer(e.target.value)} rows={6} required />
            </div>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
