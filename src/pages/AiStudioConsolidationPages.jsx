import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import Button from "../components/Button.jsx";
import { APP_NAME } from "../lib/brand.js";
import { AI_PROVIDER_STATUS, DOCUMENTATION_SUBJECTS, SYSTEM_STATUS_CATEGORIES, WORKFLOW_GUIDES, getA4TruthStatus, getRoleGuidance, searchDocumentation } from "../lib/aiStudioConsolidation.js";
import { useAuth } from "../state/AuthContext.jsx";

const CONSOLIDATION_NAV = [
  ["/ai-assistant", "AI Assistant"],
  ["/documentation", "Documentation"],
  ["/workflows", "Workflows"],
];

function ConsolidationShell({ title, children }) {
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel wide">
        <p className="eyebrow">{APP_NAME} A3-X</p>
        <h1>{title}</h1>
        <p>AI Studio consolidation is non-production. It adds native guidance, documentation, workflows, and status visibility without activating providers or bypassing A4 gates.</p>
      </section>
      <section className="panel wide">
        <div className="navrail admin-nav">
          {CONSOLIDATION_NAV.map(([route, label]) => <NavLink key={route} to={route} className={({ isActive }) => `navitem ${isActive ? "active" : ""}`}>{label}</NavLink>)}
        </div>
      </section>
      {children}
    </main>
  );
}

function StatusBadge({ status }) {
  return <span className="status-badge neutral">{status}</span>;
}

export function RoleAwareAiAssistantPage() {
  const { user } = useAuth();
  const guidance = getRoleGuidance(user);
  const a4 = getA4TruthStatus();
  const [query, setQuery] = useState("How do I know whether payments or Supabase are live?");
  const results = useMemo(() => searchDocumentation({ query }), [query]);

  useEffect(() => {
    document.title = `${APP_NAME} - AI Assistant`;
  }, []);

  return (
    <ConsolidationShell title="Role-aware AI Assistant">
      <section className="panel wide">
        <div className="section-heading"><span>{guidance.title}</span><StatusBadge status={AI_PROVIDER_STATUS.status} /></div>
        <p>{guidance.summary}</p>
        <p className="muted">{AI_PROVIDER_STATUS.summary}</p>
        <div className="profile-grid">
          {guidance.allowedTopics.map((topic) => <div key={topic}><span>Allowed topic</span><strong>{topic}</strong></div>)}
          {guidance.technical ? <div><span>Technical guidance</span><strong>{guidance.technical.title}</strong></div> : null}
        </div>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>Documentation fallback</span><StatusBadge status="Active" /></div>
        <form className="form-grid" onSubmit={(event) => event.preventDefault()}>
          <label className="form-span">Ask a RentasHub question<input value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        </form>
        <div className="asset-list">
          {results.slice(0, 6).map((item) => (
            <article className="asset-card" key={item.id}>
              <div><StatusBadge status={item.status} /><h3>{item.module}</h3><p>{item.summary}</p></div>
            </article>
          ))}
        </div>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>{a4.gate}</span><StatusBadge status={a4.status} /></div>
        <p>{a4.message}</p>
        <p className="muted">The assistant must not invent booking, payment, escrow, dispute, provider, or infrastructure status.</p>
      </section>
    </ConsolidationShell>
  );
}

export function DocumentationPage() {
  const [query, setQuery] = useState("");
  const [module, setModule] = useState("all");
  const results = useMemo(() => searchDocumentation({ query, module }), [query, module]);

  useEffect(() => {
    document.title = `${APP_NAME} - Documentation`;
  }, []);

  return (
    <ConsolidationShell title="Searchable RentasHub Documentation">
      <section className="panel wide form-grid">
        <label>Search<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search release gates, payments, auth, storage..." /></label>
        <label>Module<select value={module} onChange={(event) => setModule(event.target.value)}><option value="all">All modules</option>{DOCUMENTATION_SUBJECTS.map((item) => <option key={item.id} value={item.id}>{item.module}</option>)}</select></label>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>{results.length} documentation subjects</span></div>
        <div className="asset-list">
          {results.map((item) => (
            <article className="asset-card" key={item.id}>
              <div><StatusBadge status={item.status} /><h3>{item.module}</h3><p>{item.summary}</p></div>
            </article>
          ))}
        </div>
      </section>
    </ConsolidationShell>
  );
}

export function WorkflowGuidesPage() {
  useEffect(() => {
    document.title = `${APP_NAME} - Workflow Guides`;
  }, []);

  return (
    <ConsolidationShell title="Read-only Workflow Guides">
      <section className="panel wide">
        <div className="section-heading"><span>Workflow matrix</span><StatusBadge status="Active" /></div>
        <p className="muted">These guides are read-only and do not create transactions, bookings, payments, escrow records, disputes, or provider actions.</p>
        <div className="asset-list">
          {WORKFLOW_GUIDES.map((workflow) => (
            <article className="asset-card" key={workflow.id}>
              <div>
                <StatusBadge status={workflow.status} />
                <h3>{workflow.name}</h3>
                <p><strong>Actors:</strong> {workflow.actors.join(", ")}</p>
                <p><strong>Stages:</strong> {workflow.stages.join(" -> ")}</p>
                <p><strong>Allowed transitions:</strong> {workflow.transitions.join("; ")}</p>
                <p><strong>Cancellation/failure paths:</strong> {workflow.failures.join("; ")}</p>
                <p><strong>Permissions:</strong> {workflow.permissions.join("; ")}</p>
                <p className="muted">Creates transactions: {workflow.createsTransactions ? "yes" : "no"}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </ConsolidationShell>
  );
}

export function AdminSystemStatusPage() {
  const a4 = getA4TruthStatus();
  useEffect(() => {
    document.title = `${APP_NAME} - Admin System Status`;
  }, []);

  return (
    <main className="page dashboard-grid admin-center">
      <section className="hero-panel wide">
        <p className="eyebrow">RentasHub Admin</p>
        <h1>System status</h1>
        <p>Truthful status dashboard for RC-0.6A. This page does not activate infrastructure, providers, payments, escrow, or production certification.</p>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>{a4.gate}</span><StatusBadge status={a4.status} /></div>
        <p>{a4.message}</p>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>System categories</span></div>
        <div className="asset-list">
          {SYSTEM_STATUS_CATEGORIES.map((item) => (
            <article className="asset-card" key={item.id}>
              <div><StatusBadge status={item.status} /><h3>{item.category}</h3><p>{item.evidence}</p></div>
            </article>
          ))}
        </div>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>Allowed status labels</span></div>
        <div className="card-actions">
          {["Active", "Partial", "Local/Simulated", "Configured but inactive", "Credential required", "Infrastructure required", "Not implemented", "Not certified"].map((label) => <Button key={label} variant="secondary" disabled>{label}</Button>)}
        </div>
      </section>
    </main>
  );
}
