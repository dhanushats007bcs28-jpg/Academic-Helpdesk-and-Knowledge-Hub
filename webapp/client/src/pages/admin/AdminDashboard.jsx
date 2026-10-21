import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client.js';
import Layout from '../../layouts/Layout.jsx';
import { useShellData } from '../../App.jsx';
import { StatCard, StatusPill, Spinner, Empty } from '../../components/ui.jsx';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import {
  Ticket, Users, GraduationCap, Building2, BookOpen, AlertTriangle, ArrowRight, Activity as ActIcon, ShieldCheck,
} from 'lucide-react';

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#dc2626', '#0d9488', '#0891b2'];

export default function AdminDashboard() {
  const nav = useNavigate();
  const { unread, badges } = useShellData();
  const [data, setData] = useState(null);
  const [sla, setSla] = useState(null);

  useEffect(() => {
    api.get('/admin/analytics/overview').then(({ data }) => setData(data)).catch(() => {});
    api.get('/admin/sla').then(({ data }) => setSla(data)).catch(() => {});
  }, []);

  if (!data) return <Layout unread={unread} extraBadges={badges}><Spinner /></Layout>;
  const t = data.totals;

  return (
    <Layout unread={unread} extraBadges={badges}>
      <div className="page-head">
        <div><h1>Administrator Control Center</h1><p>Full oversight of users, queries, SLA compliance and system health.</p></div>
        <div className="head-actions">
          <span className="pill info"><ShieldCheck size={13} /> Admin</span>
          <button className="btn btn-primary btn-sm" onClick={() => nav('/admin/sla')}><AlertTriangle size={16} /> SLA Monitor</button>
        </div>
      </div>

      {sla?.summary?.overdue > 0 && (
        <div className="alert danger"><AlertTriangle size={20} /><div><b>{sla.summary.overdue} SLA breach(es) active</b>Live tickets past 24 working hours. Review the SLA monitor.</div></div>
      )}

      <div className="stats-grid">
        <StatCard icon={Ticket} value={t.totalTickets} label="Total Queries" tone="blue" />
        <StatCard icon={ActIcon} value={t.openTickets} label="Open Queries" tone="orange" />
        <StatCard icon={Users} value={t.faculty} label="Faculty Members" tone="purple" />
        <StatCard icon={Building2} value={t.hods} label="Heads of Dept." tone="teal" />
      </div>
      <div className="stats-grid">
        <StatCard icon={GraduationCap} value={t.students} label="Students" tone="green" />
        <StatCard icon={BookOpen} value={t.kbCount} label="KB Articles" tone="purple" />
        <StatCard icon={AlertTriangle} value={t.escalated} label="Escalated" tone="red" />
        <StatCard icon={CheckCircle2} value={`${data.resolutionRate}%`} label="Resolution Rate" tone="green" />
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-head"><h3>Query Volume by Category</h3><button className="link-btn" onClick={() => nav('/admin/analytics')}>Analytics <ArrowRight size={15} /></button></div>
          <div className="card-body" style={{ height: 320 }}>
            {data.byCategory.length === 0 ? <Empty text="No data" /> : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.byCategory.map((c) => ({ name: c._id, value: c.count }))}>
                  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} /><stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef3f8" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} fill="url(#g)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head"><h3>Tickets by Status</h3></div>
          <div className="card-body" style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.byStatus.map((s) => ({ name: s._id, value: s.count }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={55} paddingAngle={3}>
                  {data.byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
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

// small local icon to avoid extra import churn
function CheckCircle2(props) {
  return <svg width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>;
}
