import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api, { errText } from '../../api/client.js';
import Layout from '../../layouts/Layout.jsx';
import { useShellData } from '../../App.jsx';
import { Modal, Spinner, Empty, StatCard } from '../../components/ui.jsx';
import { Plus, Search, Pencil, Trash2, BookOpen, Eye, Sparkles } from 'lucide-react';

const BLANK = { title: '', question: '', answer: '', category: 'General', department: 'Common', subject: '', tags: '' };

export default function AdminKnowledge() {
  const { unread, badges } = useShellData();
  const [items, setItems] = useState(null);
  const [cats, setCats] = useState([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [modal, setModal] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const qs = new URLSearchParams();
    if (q) qs.set('q', q);
    if (category) qs.set('category', category);
    const { data } = await api.get(`/kb?${qs}`);
    setItems(data.items || []);
  };
  useEffect(() => { api.get('/kb/categories').then(({ data }) => setCats(data.categories)); }, []);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); /* eslint-disable-next-line */ }, [q, category]);

  const save = async () => {
    const { data: d, mode, id } = modal;
    if (!d.title || !d.question || !d.answer || !d.category) { toast.error('Title, question, answer and category are required'); return; }
    setBusy(true);
    try {
      const payload = { ...d, tags: typeof d.tags === 'string' ? d.tags.split(',').map((t) => t.trim()).filter(Boolean) : d.tags };
      if (mode === 'create') await api.post('/admin/kb', payload);
      else await api.patch(`/admin/kb/${id}`, payload);
      toast.success(mode === 'create' ? 'Article created' : 'Article updated');
      setModal(null); await load();
    } catch (e) { toast.error(errText(e)); } finally { setBusy(false); }
  };

  const remove = async (a) => {
    if (!confirm(`Delete "${a.title}"?`)) return;
    try { await api.delete(`/admin/kb/${a._id}`); await load(); toast.success('Deleted'); }
    catch (e) { toast.error(errText(e)); }
  };

  const totalViews = items?.reduce((s, a) => s + (a.views || 0), 0) || 0;

  return (
    <Layout unread={unread} extraBadges={badges}>
      <div className="page-head">
        <div><h1>Knowledge Base Management</h1><p>Articles here power instant auto-resolution via NLP matching. Keep them accurate and well-tagged.</p></div>
        <div className="head-actions"><button className="btn btn-primary" onClick={() => setModal({ mode: 'create', data: { ...BLANK } })}><Plus size={17} /> New Article</button></div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', maxWidth: 820 }}>
        <StatCard icon={BookOpen} value={items?.length ?? '—'} label="Articles (filtered)" tone="blue" />
        <StatCard icon={Sparkles} value={cats.length} label="Categories" tone="purple" />
        <StatCard icon={Eye} value={totalViews} label="Total Views" tone="green" />
      </div>

      <div className="filters">
        <div style={{ position: 'relative', flex: 1, minWidth: 280 }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search articles…" style={{ width: '100%', paddingRight: 44 }} />
          <Search size={18} style={{ position: 'absolute', right: 14, top: 12, color: 'var(--muted)' }} />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {cats.map((c) => <option key={c.name} value={c.name}>{c.name} ({c.count})</option>)}
        </select>
      </div>

      {!items ? <Spinner /> : items.length === 0 ? (
        <div className="card"><Empty text="No articles found" sub="Create your first knowledge base article." /></div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th>Title</th><th>Category</th><th>Subject</th><th>Source</th><th>Views</th><th>Actions</th></tr></thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a._id}>
                    <td className="t-strong" style={{ maxWidth: 340 }}>{a.title}</td>
                    <td><span className="pill purple">{a.category}</span></td>
                    <td>{a.subject || '—'}</td>
                    <td><span className={`pill ${a.source === 'seed' ? 'muted' : 'info'}`}>{a.source}</span></td>
                    <td>{a.views}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-xs" onClick={() => setModal({ mode: 'edit', id: a._id, data: { ...a, tags: (a.tags || []).join(', ') } })}><Pencil size={14} /></button>
                        <button className="btn btn-ghost btn-xs" style={{ color: 'var(--red)' }} onClick={() => remove(a)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && (
        <Modal title={modal.mode === 'create' ? 'New Knowledge Base Article' : 'Edit Article'} wide onClose={() => setModal(null)}
          footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
            <button className="btn btn-primary" disabled={busy} onClick={save}>{modal.mode === 'create' ? 'Create Article' : 'Save Changes'}</button></>}>
          <div className="field"><label>Title</label><input value={modal.data.title || ''} onChange={(e) => setModal({ ...modal, data: { ...modal.data, title: e.target.value } })} /></div>
          <div className="field"><label>Canonical Question</label><input value={modal.data.question || ''} onChange={(e) => setModal({ ...modal, data: { ...modal.data, question: e.target.value } })} placeholder="How is this usually asked?" /></div>
          <div className="form-row-3">
            <div className="field"><label>Category</label>
              <select value={modal.data.category || 'General'} onChange={(e) => setModal({ ...modal, data: { ...modal.data, category: e.target.value } })}>
                {['General','Database','Programming','Subject','Assignment','Examination','Technical','Administrative'].map((c) => <option key={c}>{c}</option>)}
              </select></div>
            <div className="field"><label>Department</label><input value={modal.data.department || ''} onChange={(e) => setModal({ ...modal, data: { ...modal.data, department: e.target.value } })} /></div>
            <div className="field"><label>Subject</label><input value={modal.data.subject || ''} onChange={(e) => setModal({ ...modal, data: { ...modal.data, subject: e.target.value } })} /></div>
          </div>
          <div className="field"><label>Answer</label><textarea style={{ minHeight: 180 }} value={modal.data.answer || ''} onChange={(e) => setModal({ ...modal, data: { ...modal.data, answer: e.target.value } })} placeholder="Write a clear, complete answer. This text is indexed by the NLP matcher." /></div>
          <div className="field"><label>Tags (comma separated)</label><input value={modal.data.tags || ''} onChange={(e) => setModal({ ...modal, data: { ...modal.data, tags: e.target.value } })} placeholder="normalization, 3nf, dbms" /></div>
          <div className="alert info"><Sparkles size={18} /><div>Tokenization, stop-word removal and lemmatization are applied automatically on save — so the richer the text, the better the matching.</div></div>
        </Modal>
      )}
    </Layout>
  );
}
