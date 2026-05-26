import { useState, useEffect, useCallback } from 'react';
import './App.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const STATUS_ORDER = ['open', 'in_progress', 'resolved', 'closed'];

const STATUS_META = {
  open:        { label: 'Open',        color: '#4f6ef7' },
  in_progress: { label: 'In Progress', color: '#a78bfa' },
  resolved:    { label: 'Resolved',    color: '#34d399' },
  closed:      { label: 'Closed',      color: '#525c72' },
};

const PRIORITY_COLORS = {
  low: '#34d399', medium: '#fbbf24', high: '#f97316', urgent: '#ef4444',
};

function formatAge(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function getAllowedTransitions(status) {
  const idx = STATUS_ORDER.indexOf(status);
  const transitions = [];
  if (idx < STATUS_ORDER.length - 1) transitions.push({ to: STATUS_ORDER[idx + 1], dir: 'forward' });
  if (idx > 0) transitions.push({ to: STATUS_ORDER[idx - 1], dir: 'backward' });
  return transitions;
}

function TransitionLabel({ to, dir }) {
  const arrows = { forward: '→', backward: '←' };
  const labels = {
    open: 'Open', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed',
  };
  return <>{arrows[dir]} {labels[to]}</>;
}

function StatStrip({ stats }) {
  if (!stats) return null;
  const statusItems = Object.entries(stats.byStatus || {});
  return (
    <div className="stats-strip">
      {statusItems.map(([status, count]) => (
        <div className="stat-pill" key={status}>
          <span className="stat-dot" style={{ background: STATUS_META[status]?.color || '#888' }} />
          <span className="stat-label">{STATUS_META[status]?.label || status}</span>
          <span className="stat-value">{count}</span>
        </div>
      ))}
      <div className="stat-pill breach-pill">
        <span>🔥</span>
        <span className="stat-label">SLA Breached</span>
        <span className="stat-value">{stats.openSlaBreached ?? 0}</span>
      </div>
    </div>
  );
}

function TicketCard({ ticket, onTransition, onDelete }) {
  const [moving, setMoving] = useState(false);
  const transitions = getAllowedTransitions(ticket.status);

  async function handleTransition(toStatus) {
    setMoving(true);
    await onTransition(ticket._id, toStatus);
    setMoving(false);
  }

  return (
    <div className={`ticket-card${ticket.slaBreached ? ' breached' : ''}`}>
      <div className="card-top">
        <span className="card-subject">{ticket.subject}</span>
        <span className={`priority-badge ${ticket.priority}`}>{ticket.priority}</span>
      </div>

      <div className="card-meta">
        <span className="meta-item">
          <span className="meta-icon">⏱</span>
          {formatAge(ticket.ageMinutes)}
        </span>
        <span className="meta-item">
          <span className="meta-icon">✉</span>
          {ticket.customerEmail}
        </span>
        {ticket.slaBreached && (
          <span className="breach-badge">⚠ SLA Breached</span>
        )}
      </div>

      <div className="card-actions">
        {transitions.map(({ to, dir }) => (
          <button
            key={to}
            className={`transition-btn ${dir}`}
            disabled={moving}
            onClick={() => handleTransition(to)}
          >
            <TransitionLabel to={to} dir={dir} />
          </button>
        ))}
        <button className="delete-btn" onClick={() => onDelete(ticket._id)} title="Delete ticket">✕</button>
      </div>
    </div>
  );
}

const EMPTY_FORM = { subject: '', description: '', customerEmail: '', priority: '' };

function CreateForm({ onCreated, onClose }) {
  const [fields, setFields] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  function validate(f) {
    const e = {};
    if (!f.subject.trim()) e.subject = 'Subject is required.';
    if (!f.description.trim()) e.description = 'Description is required.';
    if (!f.customerEmail.trim()) {
      e.customerEmail = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.customerEmail)) {
      e.customerEmail = 'Enter a valid email address.';
    }
    if (!f.priority) e.priority = 'Priority is required.';
    return e;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFields(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const e2 = validate(fields);
    if (Object.keys(e2).length) { setErrors(e2); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create ticket.');
      onCreated(data);
      setFields(EMPTY_FORM);
      setErrors({});
    } catch (err) {
      setErrors({ form: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="create-form-wrapper">
      <form className="create-form" onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label className="form-label">Subject</label>
          <input
            className={`form-input${errors.subject ? ' error' : ''}`}
            name="subject"
            value={fields.subject}
            onChange={handleChange}
            placeholder="Brief summary of the issue"
          />
          {errors.subject && <span className="form-error">⚠ {errors.subject}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Customer Email</label>
          <input
            className={`form-input${errors.customerEmail ? ' error' : ''}`}
            name="customerEmail"
            type="email"
            value={fields.customerEmail}
            onChange={handleChange}
            placeholder="customer@example.com"
          />
          {errors.customerEmail && <span className="form-error">⚠ {errors.customerEmail}</span>}
        </div>

        <div className="form-group full-width">
          <label className="form-label">Description</label>
          <textarea
            className={`form-textarea${errors.description ? ' error' : ''}`}
            name="description"
            value={fields.description}
            onChange={handleChange}
            placeholder="Detailed description of the issue..."
          />
          {errors.description && <span className="form-error">⚠ {errors.description}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Priority</label>
          <select
            className={`form-select${errors.priority ? ' error' : ''}`}
            name="priority"
            value={fields.priority}
            onChange={handleChange}
          >
            <option value="">Select priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
          {errors.priority && <span className="form-error">⚠ {errors.priority}</span>}
        </div>

        <div className="form-actions full-width">
          <button className="btn-submit" type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : '+ Create Ticket'}
          </button>
          <button className="btn-cancel" type="button" onClick={onClose}>Cancel</button>
          {errors.form && <span className="form-error">⚠ {errors.form}</span>}
        </div>
      </form>
    </div>
  );
}

export default function App() {
  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [globalError, setGlobalError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState('');
  const [breachedOnly, setBreachedOnly] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API}/tickets/stats`);
      const data = await res.json();
      setStats(data);
    } catch (_) {}
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (priorityFilter) params.set('priority', priorityFilter);
      if (breachedOnly) params.set('breached', 'true');
      const res = await fetch(`${API}/tickets?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load tickets.');
      const data = await res.json();
      setTickets(data);
      setGlobalError('');
    } catch (err) {
      setGlobalError(err.message);
    } finally {
      setLoading(false);
    }
  }, [priorityFilter, breachedOnly]);

  useEffect(() => { fetchTickets(); fetchStats(); }, [fetchTickets, fetchStats]);

  function handleCreated(newTicket) {
    const enriched = {
      ...newTicket,
      ageMinutes: 0,
      slaBreached: false,
    };
    setTickets(prev => [enriched, ...prev]);
    fetchStats();
    setShowForm(false);
  }

  async function handleTransition(id, toStatus) {
    try {
      const res = await fetch(`${API}/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: toStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Transition failed.');
      setTickets(prev =>
        prev.map(t => {
          if (t._id !== id) return t;
          const now = Date.now();
          const created = new Date(data.createdAt).getTime();
          const ageMinutes = Math.floor((now - created) / 60000);
          const SLA = { urgent: 60, high: 240, medium: 1440, low: 4320 };
          return { ...data, ageMinutes, slaBreached: ageMinutes > SLA[data.priority] };
        })
      );
      fetchStats();
    } catch (err) {
      setGlobalError(err.message);
    }
  }

  async function handleDelete(id) {
    try {
      const res = await fetch(`${API}/tickets/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed.');
      setTickets(prev => prev.filter(t => t._id !== id));
      fetchStats();
    } catch (err) {
      setGlobalError(err.message);
    }
  }

  const columns = STATUS_ORDER.map(status => ({
    status,
    meta: STATUS_META[status],
    tickets: tickets.filter(t => t.status === status),
  }));

  return (
    <>
      <header className="app-header">
        <div className="app-logo">🎫</div>
        <h1 className="app-title">DeskFlow</h1>
        <span className="app-subtitle">Support Ticket Board</span>
      </header>

      <StatStrip stats={stats} />

      <div className="controls-bar">
        <span className="controls-label">Filters</span>
        <select
          className="filter-select"
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
        >
          <option value="">All Priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <label className="breach-checkbox-label">
          <input
            type="checkbox"
            checked={breachedOnly}
            onChange={e => setBreachedOnly(e.target.checked)}
          />
          SLA Breached Only
        </label>
      </div>

      <div className="create-section">
        <button className="create-toggle-btn" onClick={() => setShowForm(v => !v)}>
          {showForm ? '✕ Cancel' : '+ New Ticket'}
        </button>
        {showForm && (
          <CreateForm onCreated={handleCreated} onClose={() => setShowForm(false)} />
        )}
      </div>

      {globalError && <div className="global-error">⚠ {globalError}</div>}

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /></div>
      ) : (
        <main className="board">
          {columns.map(({ status, meta, tickets: col }) => (
            <section className="column" key={status}>
              <div className="column-header">
                <div className="column-title">
                  <span className="column-dot" style={{ background: meta.color }} />
                  {meta.label}
                </div>
                <span className="column-count">{col.length}</span>
              </div>
              <div className="cards-list">
                {col.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-icon">📭</span>
                    <span>No tickets</span>
                  </div>
                ) : (
                  col.map(ticket => (
                    <TicketCard
                      key={ticket._id}
                      ticket={ticket}
                      onTransition={handleTransition}
                      onDelete={handleDelete}
                    />
                  ))
                )}
              </div>
            </section>
          ))}
        </main>
      )}
    </>
  );
}
