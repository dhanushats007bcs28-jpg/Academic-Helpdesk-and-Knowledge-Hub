import { X, Inbox } from 'lucide-react';

export function StatusPill({ status }) {
  const label = {
    open: 'Open', assigned: 'Assigned', in_progress: 'In Progress',
    waiting_student: 'Waiting on Student', escalated: 'Escalated',
    resolved: 'Resolved', closed: 'Closed',
  }[status] || status;
  return <span className={`pill ${status}`}>{label}</span>;
}

export function PriorityPill({ priority }) {
  return <span className={`pill ${priority}`}>{priority?.charAt(0).toUpperCase() + priority?.slice(1)}</span>;
}

export function StatCard({ icon: Icon, value, label, tone = 'blue', trend }) {
  const tones = {
    blue: { bg: 'var(--blue-soft)', fg: 'var(--blue)' },
    green: { bg: 'var(--green-soft)', fg: 'var(--green)' },
    orange: { bg: 'var(--orange-soft)', fg: 'var(--orange)' },
    purple: { bg: 'var(--purple-soft)', fg: 'var(--purple)' },
    red: { bg: 'var(--red-soft)', fg: 'var(--red)' },
    teal: { bg: 'var(--teal-soft)', fg: 'var(--teal)' },
  };
  const t = tones[tone] || tones.blue;
  return (
    <div className="stat-card">
      <div className="stat-top">
        <div className="stat-ico" style={{ background: t.bg, color: t.fg }}>{Icon && <Icon size={23} />}</div>
      </div>
      <h3>{value}</h3>
      <div className="stat-label">{label}</div>
      {trend && <div className={`stat-trend ${trend.down ? 'trend-down' : 'trend-up'}`}>{trend.text}</div>}
    </div>
  );
}

export function Modal({ title, children, onClose, footer, wide }) {
  return (
    <div className="modal-scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-lg' : ''}`}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="close-x" onClick={onClose} aria-label="Close"><X size={22} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Empty({ text = 'Nothing here yet', sub }) {
  return (
    <div className="empty">
      <Inbox size={46} />
      <p>{text}</p>
      {sub && <p style={{ fontSize: 13.5, marginTop: 6 }}>{sub}</p>}
    </div>
  );
}

export function Spinner() {
  return <div className="spinner" />;
}

export function ConfidenceBar({ score }) {
  const pct = Math.round((score || 0) * 100);
  const color = pct >= 55 ? 'var(--green)' : pct >= 35 ? 'var(--orange)' : 'var(--muted)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div className="conf-bar" style={{ flex: 1 }}>
        <span style={{ width: `${pct}%`, background: color }} />
      </div>
      <strong style={{ fontSize: 12.5, color, minWidth: 38 }}>{pct}%</strong>
    </div>
  );
}

export function SlaChip({ dueAt, status, remainingHours, workedHours }) {
  if (!dueAt || ['resolved', 'closed'].includes(status)) return <span className="pill muted">—</span>;
  const overdue = new Date(dueAt) < new Date();
  const hrs = remainingHours != null ? remainingHours : (new Date(dueAt) - new Date()) / 3600000;
  if (overdue) return <span className="pill critical" title={`Worked ${workedHours ?? '?'}h`}>SLA Breached</span>;
  return (
    <span className={`pill ${hrs <= 6 ? 'high' : 'info'}`} title={`${hrs.toFixed(1)} working hours remaining`}>
      {hrs.toFixed(1)}h left
    </span>
  );
}
