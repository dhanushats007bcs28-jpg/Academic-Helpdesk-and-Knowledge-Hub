import { useEffect, useState } from 'react';
import api from '../../api/client.js';
import Layout from '../../layouts/Layout.jsx';
import { useShellData } from '../../App.jsx';
import { Spinner, Empty } from '../../components/ui.jsx';
import { Activity, User } from 'lucide-react';

const TONE = {
  'ticket.create': 'blue', 'ticket.resolved': 'green', 'ticket.escalate': 'red', 'sla.auto_escalate': 'red',
  'user.create.student': 'purple', 'user.create.faculty': 'purple', 'user.create.hod': 'purple',
  'user.update': 'orange', 'user.delete': 'red', 'user.activate': 'green', 'user.deactivate': 'orange',
  'system.broadcast': 'teal', 'system.seed': 'muted', 'kb.create': 'purple', 'kb.update': 'orange', 'kb.delete': 'red',
};

export default function AdminActivity() {
  const { unread, badges } = useShellData();
  const [items, setItems] = useState(null);

  useEffect(() => { api.get('/admin/activity').then(({ data }) => setItems(data.items)).catch(() => setItems([])); }, []);
  if (!items) return <Layout unread={unread} extraBadges={badges}><Spinner /></Layout>;

  return (
    <Layout unread={unread} extraBadges={badges}>
      <div className="page-head"><div><h1>Activity Log</h1><p>Complete audit trail of administrative and system actions.</p></div></div>

      <div className="card">
        {items.length === 0 ? <Empty text="No activity recorded yet" /> : (
          <div className="card-body" style={{ display: 'grid', gap: 10 }}>
            {items.map((a) => (
              <div key={a._id} style={{ display: 'flex', gap: 14, padding: '13px 16px', border: '1px solid var(--line)', borderRadius: 12, background: '#fff' }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: '#eef3f9', display: 'grid', placeItems: 'center', color: 'var(--blue)', flexShrink: 0 }}>
                  <Activity size={19} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className={`pill ${TONE[a.action] || 'muted'}`}>{a.action}</span>
                    <span style={{ fontSize: 13.5, color: 'var(--muted)' }}>
                      by <strong style={{ color: '#1a3450' }}><User size={12} style={{ verticalAlign: -2 }} /> {a.actor?.name || 'System'}</strong>
                      {a.actorRole && <span> ({a.actorRole})</span>}
                    </span>
                  </div>
                  {a.detail && <div style={{ fontSize: 13.5, marginTop: 5, color: '#3b5670' }}>{a.detail}</div>}
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 5 }}>
                    {a.entity && <span>{a.entity} · </span>}{new Date(a.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
