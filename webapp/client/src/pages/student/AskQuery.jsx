import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api, { errText } from '../../api/client.js';
import Layout from '../../layouts/Layout.jsx';
import { useShellData } from '../../App.jsx';
import { ConfidenceBar } from '../../components/ui.jsx';
import { Sparkles, Send, Search, BookOpen, CheckCircle2, Wand2, Loader2, ArrowRight } from 'lucide-react';

const CATEGORIES = ['General', 'Database', 'Programming', 'Subject', 'Assignment', 'Examination', 'Technical', 'Administrative'];

export default function AskQuery() {
  const nav = useNavigate();
  const { unread, badges } = useShellData();
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [priority, setPriority] = useState('medium');
  const [matches, setMatches] = useState([]);
  const [nlp, setNlp] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedKb, setSelectedKb] = useState(null);
  const debounce = useRef(null);

  // Live text-analytics preview as the student types.
  useEffect(() => {
    const text = `${subject} ${description}`.trim();
    if (text.length < 8) { setMatches([]); setNlp(null); return; }
    clearTimeout(debounce.current);
    setAnalyzing(true);
    debounce.current = setTimeout(async () => {
      try {
        const { data } = await api.post('/kb/match', { query: text });
        setMatches(data.matches || []);
        setNlp(data.normalized);
      } catch { /* ignore */ } finally { setAnalyzing(false); }
    }, 500);
    return () => clearTimeout(debounce.current);
  }, [subject, description]);

  const topMatch = matches[0];
  const strongMatch = topMatch && topMatch.score >= 0.45;

  const submit = async (useKbAnswer = false) => {
    if (!subject.trim() || !description.trim()) { toast.error('Please add a subject and description'); return; }
    setSubmitting(true);
    try {
      const { data } = await api.post('/tickets', {
        subject, description, category, priority,
        useKbAnswer, kbArticleId: useKbAnswer ? topMatch?.article : undefined,
      });
      if (data.autoResolved) {
        toast.success('Answered instantly from the knowledge base!');
        nav(`/tickets/${data.ticket._id}`);
      } else {
        toast.success(`Ticket ${data.ticket.ticketCode} created and assigned`);
        nav(`/tickets/${data.ticket._id}`);
      }
    } catch (e) { toast.error(errText(e)); } finally { setSubmitting(false); }
  };

  return (
    <Layout unread={unread} extraBadges={badges}>
      <div className="page-head">
        <div><h1>Ask a Query</h1><p>Describe your question — we'll instantly search the knowledge base before routing it to faculty.</p></div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-head"><h3>Your Question</h3><span className="pill info"><Wand2 size={13} /> Text analytics on</span></div>
          <div className="card-body">
            <div className="field">
              <label>Subject</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. How do I decompose a relation into 3NF?" />
            </div>
            <div className="form-row">
              <div className="field">
                <label>Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="field">
                <label>Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="low">Low</option><option value="medium">Medium</option>
                  <option value="high">High</option><option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div className="field">
              <label>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Give as much context as you can — what you tried, what's unclear, and where you're stuck." />
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" disabled={submitting || !subject.trim() || !description.trim()} onClick={() => submit(false)}>
                {submitting ? <Loader2 size={17} className="spin" /> : <Send size={17} />} Submit to Faculty
              </button>
              {strongMatch && (
                <button className="btn btn-success" disabled={submitting} onClick={() => submit(true)}>
                  <CheckCircle2 size={17} /> Accept KB Answer &amp; Resolve
                </button>
              )}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 22 }}>
          <div className="card">
            <div className="card-head">
              <h3>{analyzing ? 'Analysing…' : 'Knowledge Base Matches'}</h3>
              {analyzing && <Loader2 size={17} className="spin" style={{ color: 'var(--blue)' }} />}
            </div>
            <div className="card-body">
              {!nlp && !analyzing && <p style={{ fontSize: 14 }}>Start typing to see live matches from the knowledge base.</p>}
              {nlp && (
                <>
                  {nlp.keywords?.length > 0 && (
                    <div style={{ marginBottom: 18 }}>
                      <div style={{ fontSize: 12.5, color: 'var(--muted)', fontWeight: 600, marginBottom: 8 }}>
                        EXTRACTED KEY TERMS (stop-words removed, lemmatized)
                      </div>
                      <div className="chip-row">{nlp.keywords.map((k, i) => <span key={i} className="chip blue">{k}</span>)}</div>
                    </div>
                  )}
                  {matches.length === 0 && (
                    <div className="alert info"><Search size={19} /><div><b>No strong match found</b>Your question will be routed to the right faculty member.</div></div>
                  )}
                  {matches.map((m, i) => (
                    <div key={i} onClick={() => setSelectedKb(m)}
                      style={{ padding: 15, borderRadius: 12, border: `1.5px solid ${m.score >= 0.45 ? '#b9ecd1' : 'var(--line)'}`,
                        background: m.score >= 0.45 ? 'var(--green-soft)' : '#fff', marginBottom: 12, cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                        <strong style={{ fontSize: 14.5, color: '#1a3450' }}>{m.title}</strong>
                        <span className={`pill ${m.confidence === 'high' ? 'resolved' : m.confidence === 'medium' ? 'medium' : 'muted'}`}>{m.confidence}</span>
                      </div>
                      <ConfidenceBar score={m.score} />
                      {m.explanation && (
                        <div style={{ background: 'rgba(37,99,235,0.06)', borderRadius: 8, padding: '8px 10px', marginTop: 8, fontSize: 12, color: '#1e40af', border: '1px solid rgba(37,99,235,0.12)' }}>
                          <span style={{ fontWeight: 600 }}>Why this matched: </span>{m.explanation}
                        </div>
                      )}
                      <p style={{ fontSize: 13, color: '#3b5670', marginTop: 8 }}>{String(m.answer).slice(0, 150)}…</p>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {strongMatch && (
            <div className="alert success">
              <Sparkles size={20} />
              <div><b>We found a strong match!</b>You can resolve this instantly with the knowledge base answer above — or still submit it to faculty if you need more detail.</div>
            </div>
          )}

          <div className="card">
            <div className="card-head"><h3>How routing works</h3></div>
            <div className="card-body">
              <div className="timeline">
                <div className="tl-item"><div className="tl-title">1 · Instant KB search</div><div className="tl-meta">Your query is tokenized, stop-words removed and lemmatized, then matched by TF-IDF cosine similarity.</div></div>
                <div className="tl-item"><div className="tl-title">2 · Bottom-up assignment</div><div className="tl-meta">Unanswered queries go to junior faculty first, then senior faculty, then the HOD.</div></div>
                <div className="tl-item"><div className="tl-title">3 · 24-working-hour SLA</div><div className="tl-meta">If faculty don't respond within 24 working hours, the ticket auto-escalates.</div></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedKb && (
        <div className="modal-scrim" onClick={(e) => e.target === e.currentTarget && setSelectedKb(null)}>
          <div className="modal">
            <div className="modal-head"><h3>{selectedKb.title}</h3><button className="close-x" onClick={() => setSelectedKb(null)}>×</button></div>
            <div className="modal-body">
              <span className="pill purple" style={{ marginBottom: 14, display: 'inline-flex' }}><BookOpen size={13} /> {selectedKb.category}</span>
              <p style={{ color: '#2b455f', fontSize: 15, lineHeight: 1.7 }}>{selectedKb.answer}</p>
            </div>
            <div className="modal-foot">
              <button className="btn btn-ghost" onClick={() => setSelectedKb(null)}>Close</button>
              <button className="btn btn-primary" onClick={() => nav('/student/knowledge')}>Open Full Knowledge Base <ArrowRight size={16} /></button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
