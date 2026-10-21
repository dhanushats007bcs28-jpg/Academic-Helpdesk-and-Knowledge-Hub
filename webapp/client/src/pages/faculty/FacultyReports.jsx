import { useEffect, useState } from 'react';
import api from '../../api/client.js';
import Layout from '../../layouts/Layout.jsx';
import { useShellData } from '../../App.jsx';
import { Spinner, StatCard } from '../../components/ui.jsx';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { Ticket, CheckCircle2, Clock, Star } from 'lucide-react';

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#dc2626', '#0d9488'];

export default function FacultyReports() {
  const { unread, badges } = useShellData();
  const [stats, setStats] = useState(null);
  const [work, setWork] = useState(null);

  useEffect(() => {
    api.get('/tickets/stats/summary').then(({ data }) => setStats(data)).catch(() => {});
    api.get('/faculty/workload').then(({ data }) => setWork(data)).catch(() => {});
  }, []);

  if (!stats || !work) return <Layout unread={unread} extraBadges={badges}><Spinner /></Layout>;

  const catData = stats.byCategory.map((c) => ({ name: c.category, value: c.count }));

  return (
    <Layout unread={unread} extraBadges={badges}>
      <div className="page-head"><div><h1>My Reports</h1><p>Performance and workload insights for your assigned tickets.</p></div></div>

      <div className="stats-grid">
        <StatCard icon={Ticket} value={stats.total} label="Tickets Handled" tone="blue" />
        <StatCard icon={CheckCircle2} value={stats.resolved} label="Resolved" tone="green" />
        <StatCard icon={Clock} value={stats.open} label="Open" tone="orange" />
        <StatCard icon={Star} value={stats.total ? `${Math.round((stats.resolved / stats.total) * 100)}%` : '0%'} label="Resolution Rate" tone="purple" />
      </div>

      <div className="grid-2-even" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-head"><h3>Tickets by Category</h3></div>
          <div className="card-body" style={{ height: 320 }}>
            {catData.length === 0 ? <p>No data yet.</p> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={catData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef3f8" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#2563eb" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Workload Composition</h3></div>
          <div className="card-body" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={[
                  { name: 'Open', value: stats.open },
                  { name: 'Resolved', value: stats.resolved },
                  { name: 'Escalated', value: stats.escalated },
                  { name: 'SLA Breached', value: stats.breaching },
                ].filter((d) => d.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={55} paddingAngle={3}>
                  {[0,1,2,3].map((i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Layout>
  );
}
