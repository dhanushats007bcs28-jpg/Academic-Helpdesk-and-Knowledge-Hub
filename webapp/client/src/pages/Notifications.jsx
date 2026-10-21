import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import Layout from '../layouts/Layout.jsx';
import { useShellData } from '../App.jsx';
import { Spinner, Empty } from '../components/ui.jsx';
import { Bell, CheckCheck, Ticket, ArrowUpCircle, MessageSquare, Clock, Sparkles, Info } from 'lucide-react';

const ICONS = { ticket: Ticket, assignment: Ticket, reply: MessageSquare, escalation: ArrowUpCircle, sla_warning: Clock, resolved: CheckCheck, kb: Sparkles, system: Info };
const TONES = { ticket: 'var(--blue)', assignment: 'var(--purple)', reply: 'var(--teal)', escalation: 'var(--red)', sla_warning: 'var(--orange)', resolved: 'var(--green)', kb: 'var(--purple)', system: 'var(--muted)' };

export default function Notifications() {
  const { user } = useAuth();
  const { badges } = useShellData();
  const nav = useNavigate();
  const [items, setItems] = useState(null);
  const [unread, setUnread] = useState(0);

  const load = async () => {
    const { data } = await api.get('/notifications');
    setItems(data.items); setUnread(data.unread);
  };
  useEffect(() => { load(); }, []);

  const markRead = async (n) => {
    if (!n.read) await api.post(`/notifications/${n.id || n._id}/read`);
    if (n.link) nav(n.link); else load();
  };
  const markAll = async () => { await api.post('/notifications/read-all'); load(); };

  if (!items) return <Layout unread={unread} extraBadges={badges}><Spinner /></Layout>;

  return (
    <Layout unread={unread} extraBadges={badges}>
      <div className="page-head">
        <div><h1>Notifications</h1><p>{unread} unread · SLA warnings, assignments, replies and escalations.</p></div>
        <div className="head-actions">{unread > 0 && <button className="btn btn-ghost btn-sm" onClick={markAll}><CheckCheck size={16} /> Mark all read</button>}</div>
      </div>

      <div className="card">
        {items.length === 0 ? <Empty text="No notifications yet" sub="You're all caught up." /> : (
          <div className="card-body" style={{ display: 'grid', gap: 12 }}>
            {items.map((n) => {
              const Icon = ICONS[n.type] || Bell;
              return (
                <div key={n.id || n._id} onClick={() => markRead(n)}
                  style={{ display: 'flex', gap: 14, padding: '15px 17px', borderRadius: 12, cursor: 'pointer',
                    background: n.read ? '#fff' : 'var(--blue-soft)', border: `1px solid ${n.read ? 'var(--line)' : '#cfe0fb'}` }}>
                  <div style={{ width: 42, height: 42, borderRadius: 12, display: 'grid', placeItems: 'center', background: '#fff', color: TONES[n.type] || 'var(--muted)', flexShrink: 0, border: '1px solid var(--line)' }}>
                    <Icon size={20} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14.5, color: '#1a3450' }}>{n.title}</div>
                    {n.body && <p style={{ fontSize: 13.5, marginTop: 3 }}>{n.body}</p>}
                    <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 6 }}>{new Date(n.createdAt).toLocaleString()}</div>
                  </div>
                  {!n.read && <span className="dot" style={{ background: 'var(--blue)', marginTop: 8 }} />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
