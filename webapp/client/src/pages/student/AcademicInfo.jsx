import { useEffect, useState } from 'react';
import api from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Layout from '../../layouts/Layout.jsx';
import { useShellData } from '../../App.jsx';
import { Spinner, StatCard } from '../../components/ui.jsx';
import { GraduationCap, Calendar, Users, TrendingUp, BookOpen, Mail } from 'lucide-react';

export default function AcademicInfo() {
  const { user } = useAuth();
  const { unread, badges } = useShellData();
  const [data, setData] = useState(null);

  useEffect(() => { api.get('/students/me/academics').then(({ data }) => setData(data)).catch(() => {}); }, []);
  if (!data) return <Layout unread={unread} extraBadges={badges}><Spinner /></Layout>;

  const s = data.student;
  const att = s.attendance || 0;

  return (
    <Layout unread={unread} extraBadges={badges}>
      <div className="page-head"><div><h1>Academic Information</h1><p>Your enrolment, performance and advisor details.</p></div></div>

      <div className="stats-grid">
        <StatCard icon={TrendingUp} value={s.cgpa ?? '—'} label="Current CGPA" tone="green" />
        <StatCard icon={Calendar} value={`${att}%`} label="Attendance" tone={att >= 75 ? 'blue' : 'red'} />
        <StatCard icon={GraduationCap} value={`Sem ${s.semester || '—'}`} label={`Year ${s.year || '—'} · Section ${s.section || '—'}`} tone="purple" />
        <StatCard icon={BookOpen} value={data.ticketCount} label="Tickets Raised" tone="orange" />
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-head"><h3>Enrolment Details</h3></div>
          <div className="card-body">
            <div className="kv">
              <div><div className="k">Full Name</div><div className="v">{s.name}</div></div>
              <div><div className="k">Roll Number</div><div className="v">{s.rollNumber || '—'}</div></div>
              <div><div className="k">Department</div><div className="v">{s.department}</div></div>
              <div><div className="k">Year / Semester</div><div className="v">Year {s.year} · Semester {s.semester}</div></div>
              <div><div className="k">Section</div><div className="v">{s.section || '—'}</div></div>
              <div><div className="k">Email</div><div className="v" style={{ fontSize: 14 }}>{s.email}</div></div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gap: 22 }}>
          <div className="card">
            <div className="card-head"><h3>Attendance Overview</h3></div>
            <div className="card-body">
              {att < 75 && <div className="alert danger"><Calendar size={19} /><div><b>Below the 75% requirement</b>You may be ineligible for end-semester exams unless this is corrected.</div></div>}
              {att >= 75 && <div className="alert success"><Calendar size={19} /><div><b>You're eligible</b>Attendance is above the 75% requirement.</div></div>}
              <div className="progress-ring">
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13.5, fontWeight: 600 }}>
                    <span>Attendance</span><span>{att}%</span>
                  </div>
                  <div className="conf-bar" style={{ height: 10 }}><span style={{ width: `${Math.min(att, 100)}%`, background: att >= 75 ? 'var(--green)' : 'var(--red)' }} /></div>
                </div>
              </div>
            </div>
          </div>

          {data.advisor && (
            <div className="card">
              <div className="card-head"><h3>Faculty Advisor</h3></div>
              <div className="card-body">
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div className="avatar" style={{ width: 52, height: 52, background: '#0891b2' }}>{data.advisor.name.split(' ').slice(0,2).map(n=>n[0]).join('')}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{data.advisor.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>{data.advisor.designation}</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}><Mail size={12} style={{ verticalAlign: -2 }} /> {data.advisor.email}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
