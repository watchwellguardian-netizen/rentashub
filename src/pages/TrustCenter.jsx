import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { APP_NAME } from "../lib/brand.js";
import { trustAdapter } from "../lib/adapters/trustAdapter.js";
import { useAuth } from "../state/AuthContext.jsx";

function ScorePanel({ title, score }) {
  if (!score) return null;
  return (
    <article className="asset-card">
      <div>
        <span className={`status-badge ${score.riskLevel === "low" ? "" : "neutral"}`}>{score.riskLevel} risk</span>
        <h3>{title}</h3>
        <p><strong>{score.score}/100 trust score</strong></p>
        <p>Version: {score.version}</p>
        {score.badges.length ? <p>Badges: {score.badges.join(", ")}</p> : <p className="muted">No reputation badges yet.</p>}
        {score.flags.length ? <p className="field-error">Risk flags: {score.flags.join(", ")}</p> : <p className="muted">No risk flags from local data.</p>}
      </div>
    </article>
  );
}

function Inputs({ score }) {
  if (!score) {
    return <section className="panel wide"><div className="empty-state"><strong>Trust score unavailable</strong><p>Trust data could not be loaded for this record.</p></div></section>;
  }
  return (
    <section className="panel wide">
      <div className="section-heading"><span>Score inputs</span></div>
      <div className="profile-grid">
        {Object.entries(score.inputs || {}).map(([key, value]) => <div key={key}><span>{key}</span><strong>{String(value)}</strong></div>)}
      </div>
      <p className="muted">Trust scoring is local and transparent in this version. It is not a final risk decision, official identity review, coverage decision, or legal decision.</p>
    </section>
  );
}

export function TrustOverview() {
  const { user } = useAuth();
  const [overview, setOverview] = useState({ suppliers: [], assets: [], customers: [] });
  useEffect(() => {
    document.title = `${APP_NAME} - Trust Center`;
    let active = true;
    Promise.resolve(trustAdapter.overview(window.localStorage, { user }))
      .then((next) => {
        if (active) setOverview(next);
      })
      .catch(() => {
        if (active) setOverview({ suppliers: [], assets: [], customers: [] });
      });
    return () => {
      active = false;
    };
  }, [user]);
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel wide">
        <p className="eyebrow">{APP_NAME}</p>
        <h1>Trust, Reputation & Risk Engine</h1>
        <p>Transparent local scoring for suppliers, customers, assets, badges, and risk flags.</p>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>Trust overview</span></div>
        <div className="metric-grid">
          <div><span>Suppliers scored</span><strong>{overview.suppliers.length}</strong></div>
          <div><span>Assets scored</span><strong>{overview.assets.length}</strong></div>
          <div><span>Customers scored</span><strong>{overview.customers.length}</strong></div>
        </div>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>Supplier trust</span></div>
        <div className="asset-list">{overview.suppliers.map((score) => <ScorePanel key={score.entityId} title={score.entityId} score={score} />)}</div>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>Asset trust</span></div>
        <div className="asset-list">{overview.assets.map((score) => <ScorePanel key={score.entityId} title={score.entityId} score={score} />)}</div>
      </section>
    </main>
  );
}

export function SupplierTrustPage() {
  const { supplierId } = useParams();
  const { user } = useAuth();
  const [score, setScore] = useState(null);
  useEffect(() => {
    document.title = `${APP_NAME} - Supplier Trust`;
    let active = true;
    Promise.resolve(trustAdapter.supplierScore(window.localStorage, supplierId, { user }))
      .then((next) => {
        if (active) setScore(next);
      })
      .catch(() => {
        if (active) setScore(null);
      });
    return () => {
      active = false;
    };
  }, [supplierId, user]);
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel"><p className="eyebrow">{APP_NAME}</p><h1>Supplier trust score</h1><p>{supplierId}</p></section>
      <section className="panel wide"><ScorePanel title="Supplier reputation" score={score} /></section>
      <Inputs score={score} />
    </main>
  );
}

export function CustomerTrustPage() {
  const { customerId } = useParams();
  const { user } = useAuth();
  const canView = user?.role === "admin" || user?.id === customerId;
  const [score, setScore] = useState(null);
  useEffect(() => {
    document.title = `${APP_NAME} - Customer Trust`;
    let active = true;
    if (canView) {
      Promise.resolve(trustAdapter.customerScore(window.localStorage, customerId, { user }))
        .then((next) => {
          if (active) setScore(next);
        })
        .catch(() => {
          if (active) setScore(null);
        });
    }
    return () => {
      active = false;
    };
  }, [customerId, user, canView]);
  if (!canView) return <main className="page center-page"><section className="panel narrow">Customer trust scores are limited to the customer and controlled admin review.</section></main>;

  return (
    <main className="page dashboard-grid">
      <section className="hero-panel"><p className="eyebrow">{APP_NAME}</p><h1>Customer trust score</h1><p>{customerId}</p></section>
      <section className="panel wide"><ScorePanel title="Customer reputation" score={score} /></section>
      <Inputs score={score} />
    </main>
  );
}

export function AssetTrustPage() {
  const { assetId } = useParams();
  const { user } = useAuth();
  const [score, setScore] = useState(null);
  useEffect(() => {
    document.title = `${APP_NAME} - Asset Trust`;
    let active = true;
    Promise.resolve(trustAdapter.assetScore(window.localStorage, assetId, { user }))
      .then((next) => {
        if (active) setScore(next);
      })
      .catch(() => {
        if (active) setScore(null);
      });
    return () => {
      active = false;
    };
  }, [assetId, user]);
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel"><p className="eyebrow">{APP_NAME}</p><h1>Asset trust score</h1><p>{assetId}</p></section>
      <section className="panel wide"><ScorePanel title="Asset reputation" score={score} /></section>
      <Inputs score={score} />
    </main>
  );
}

export function AdminRiskPage() {
  const { user } = useAuth();
  const [queue, setQueue] = useState([]);
  useEffect(() => {
    document.title = `${APP_NAME} - Risk Queue`;
    let active = true;
    Promise.resolve(trustAdapter.riskQueue(window.localStorage, { user }))
      .then((next) => {
        if (active) setQueue(next);
      })
      .catch(() => {
        if (active) setQueue([]);
      });
    return () => {
      active = false;
    };
  }, [user]);
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel wide">
        <p className="eyebrow">{APP_NAME}</p>
        <h1>Risk queue</h1>
        <p>Admin view of locally computed trust flags. No final risk decision or legal enforcement is performed.</p>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>Flagged trust records</span></div>
        {queue.length === 0 ? <div className="empty-state"><strong>No trust risks flagged</strong><p>Risk flags will appear as local scoring detects them.</p></div> : <div className="asset-list">{queue.map((score) => <ScorePanel key={`${score.entityType}-${score.entityId}`} title={`${score.entityType}: ${score.entityId}`} score={score} />)}</div>}
      </section>
    </main>
  );
}
