import { useEffect, useMemo, useState } from "react";
import Button from "../components/Button.jsx";
import { createSupportCase, getSupportOperationsSummary, getVisibleSupportCases, SUPPORT_CATEGORIES, SUPPORT_PRIORITIES, SUPPORT_STATUSES, updateSupportCaseStatus } from "../lib/supportService.js";
import { useAuth } from "../state/AuthContext.jsx";

function CaseCard({ supportCase, isAdmin, onStatus }) {
  return (
    <article className="asset-card">
      <div>
        <span className="status-badge neutral">{SUPPORT_STATUSES[supportCase.status]}</span>
        <h3>{supportCase.title}</h3>
        <p>{supportCase.category} / {SUPPORT_PRIORITIES[supportCase.priority].label} priority / SLA {supportCase.sla.slaHours}h</p>
        <p className="muted">Due {supportCase.sla.dueAt}. {supportCase.sla.breached ? "SLA attention required." : "Within local SLA window."}</p>
      </div>
      {isAdmin ? (
        <div className="card-actions">
          <Button variant="secondary" onClick={() => onStatus(supportCase.id, "waiting_on_customer")}>Wait on customer</Button>
          <Button variant="secondary" onClick={() => onStatus(supportCase.id, "escalated")}>Escalate local</Button>
          <Button onClick={() => onStatus(supportCase.id, "resolved")}>Resolve local</Button>
        </div>
      ) : null}
    </article>
  );
}

export default function SupportPage({ adminMode = false }) {
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", category: "general", priority: "normal" });
  const [error, setError] = useState("");
  const isAdmin = user?.role === "admin";

  const refresh = () => {
    setCases(getVisibleSupportCases(window.localStorage, user));
  };

  useEffect(() => {
    document.title = adminMode ? "RentasHub - Admin Support" : "RentasHub - Support";
    refresh();
  }, [adminMode, user]);

  const summary = useMemo(() => getSupportOperationsSummary(window.localStorage), [cases]);

  const submit = (event) => {
    event.preventDefault();
    const result = createSupportCase(window.localStorage, form, user);
    if (!result.valid) {
      setError(result.error);
      return;
    }
    setError("");
    setForm({ title: "", description: "", category: "general", priority: "normal" });
    refresh();
  };

  const onStatus = (caseId, status) => {
    const result = updateSupportCaseStatus(window.localStorage, caseId, status, user);
    if (!result.valid) {
      setError(result.error);
      return;
    }
    setError("");
    refresh();
  };

  const visibleCases = adminMode && isAdmin ? getVisibleSupportCases(window.localStorage, user) : cases;

  return (
    <main className="page dashboard-grid">
      <section className="hero-panel">
        <p className="eyebrow">RentasHub Support</p>
        <h1>{adminMode ? "Support operations queue" : "Support center"}</h1>
        <p>Local support cases, SLA tracking, escalation, and resolution controls. No live helpdesk, email, SMS, or call-center provider is active.</p>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>Support metrics</span></div>
        <div className="metric-grid">
          <div><span>Total cases</span><strong>{summary.total}</strong></div>
          <div><span>Open</span><strong>{summary.open}</strong></div>
          <div><span>Escalated</span><strong>{summary.escalated}</strong></div>
          <div><span>SLA attention</span><strong>{summary.breached}</strong></div>
        </div>
      </section>
      {!adminMode ? (
        <section className="panel">
          <div className="section-heading"><span>Open a support case</span></div>
          {error ? <p className="error-text">{error}</p> : null}
          <form className="form-grid" onSubmit={submit}>
            <label>Title<input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></label>
            <label>Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}>{SUPPORT_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
            <label>Priority<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}>{Object.entries(SUPPORT_PRIORITIES).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></label>
            <label className="form-span">Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
            <Button type="submit">Create local support case</Button>
          </form>
        </section>
      ) : null}
      <section className="panel wide">
        <div className="section-heading"><span>{adminMode ? "All local support cases" : "My support cases"}</span></div>
        {adminMode && !isAdmin ? <div className="empty-state"><strong>Admin access required</strong></div> : null}
        {error && adminMode ? <p className="error-text">{error}</p> : null}
        {visibleCases.length === 0 ? <div className="empty-state"><strong>No support cases</strong><p>Support requests and operational escalations will appear here.</p></div> : (
          <div className="asset-list">
            {visibleCases.map((supportCase) => <CaseCard key={supportCase.id} supportCase={supportCase} isAdmin={adminMode && isAdmin} onStatus={onStatus} />)}
          </div>
        )}
      </section>
    </main>
  );
}

export function AdminSupportPage() {
  return <SupportPage adminMode />;
}
