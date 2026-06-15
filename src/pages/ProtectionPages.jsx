import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../components/Button.jsx";
import { resolveBookingContext } from "../lib/bookingService.js";
import { assetAdapter } from "../lib/adapters/assetAdapter.js";
import { protectionAdapter } from "../lib/adapters/protectionAdapter.js";
import { getInspectionsByBooking } from "../lib/inspectionService.js";
import {
  CLAIM_STATUSES,
  CLAIM_TYPES,
  PROTECTION_NOTICE,
  canSubmitClaim,
  canViewClaim,
  canViewBookingProtection,
  canSelectBookingProtection,
  calculateProtectionPlanCost,
  resolveClaimContext,
} from "../lib/protectionService.js";
import { useAuth } from "../state/AuthContext.jsx";

function ProtectionShell({ title, children }) {
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel">
        <p className="eyebrow">RentasHub Protection</p>
        <h1>{title}</h1>
        <p>{PROTECTION_NOTICE}</p>
      </section>
      {children}
    </main>
  );
}

function PlanCard({ plan, booking, checked, onToggle }) {
  const cost = booking ? calculateProtectionPlanCost(plan, booking) : null;
  return (
    <article className="asset-card">
      <div>
        <span className="status-badge neutral">{plan.type}</span>
        <h3>{plan.name}</h3>
        <p>{plan.coverageSummary}</p>
        <p className="muted">Exclusions: {plan.exclusions}</p>
        <p className="muted">Deductible: {plan.deductible}</p>
        <p className="muted">Price model: {plan.priceModel}{cost !== null ? ` / JMD ${cost.toLocaleString()}` : ""}</p>
      </div>
      {onToggle ? (
        <label className="checkbox-line">
          <input type="checkbox" checked={checked} onChange={(event) => onToggle(plan.id, event.target.checked)} />
          Select this option
        </label>
      ) : null}
    </article>
  );
}

export function ProtectionOverview() {
  const navigate = useNavigate();
  useEffect(() => {
    document.title = "RentasHub - Protection";
  }, []);
  return (
    <ProtectionShell title="Insurance & Protection Framework">
      <section className="panel wide">
        <div className="section-heading"><span>Protection overview</span></div>
        <p>Review simulated damage waiver, liability, theft, roadside, equipment, event, and property protection options before booking payment.</p>
        <p className="muted">No underwriting, legal claim filing, payout, escrow, or insurance provider integration is active.</p>
        <div className="form-actions">
          <Button onClick={() => navigate("/protection/plans")}>View plans</Button>
          <Button variant="secondary" onClick={() => navigate("/claims")}>View claims</Button>
        </div>
      </section>
    </ProtectionShell>
  );
}

export function ProtectionPlansPage() {
  const plans = protectionAdapter.listPlans();
  useEffect(() => {
    document.title = "RentasHub - Protection Plans";
  }, []);
  return (
    <ProtectionShell title="Protection plans">
      <section className="panel wide">
        <div className="section-heading"><span>Available local plans</span></div>
        <div className="asset-list">{plans.map((plan) => <PlanCard key={plan.id} plan={plan} />)}</div>
      </section>
    </ProtectionShell>
  );
}

export function BookingProtectionPage() {
  const { bookingId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [context, setContext] = useState({ booking: null, listing: null });
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = () => {
    const next = resolveBookingContext(window.localStorage, bookingId);
    if (!next.booking) {
      setError("Booking was not found.");
      return;
    }
    if (!canViewBookingProtection(user, next.booking, next.listing)) {
      setError("You cannot view protection for this booking.");
      return;
    }
    setContext(next);
    setSelected(next.booking.protectionPlanIds || []);
  };

  useEffect(() => {
    document.title = "RentasHub - Booking Protection";
    load();
  }, [bookingId, user?.id]);

  const toggle = (planId, checked) => {
    setSelected((current) => (checked ? [...new Set([...current, planId])] : current.filter((item) => item !== planId)));
  };

  const save = () => {
    const result = protectionAdapter.selectBookingProtection(window.localStorage, { user, bookingId, planIds: selected });
    if (!result.valid) {
      setError(result.error);
      return;
    }
    setContext((current) => ({ ...current, booking: result.booking }));
    setNotice("Simulated protection selection saved.");
  };

  if (error) return <main className="page center-page"><section className="panel narrow error-panel">{error}</section></main>;
  if (!context.booking) return <main className="page center-page">Loading booking protection...</main>;

  const plans = protectionAdapter.recommendedPlansForCategory(context.listing?.category);
  const allPlans = protectionAdapter.listPlans();
  const estimate = selected.reduce((total, planId) => total + calculateProtectionPlanCost(allPlans.find((plan) => plan.id === planId), context.booking), 0);
  const canSelect = canSelectBookingProtection(user, context.booking);

  return (
    <ProtectionShell title="Choose booking protection">
      <section className="panel wide">
        <div className="section-heading"><span>{context.booking.assetTitle}</span></div>
        <p className="muted">{canSelect ? "Protection can be selected before simulated payment." : "Protection context is read-only for this user or booking state."} This does not create a policy, legal coverage, or payout right.</p>
        <div className="metric-grid">
          <div><span>Rental subtotal</span><strong>JMD {Number(context.booking.estimatedCost || 0).toLocaleString()}</strong></div>
          <div><span>Protection estimate</span><strong>JMD {estimate.toLocaleString()}</strong></div>
          <div><span>Listing protection</span><strong>{(context.listing?.protectionRequirement || "optional").replace("_", " ")}</strong></div>
        </div>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>Recommended options</span></div>
        <div className="asset-list">{plans.map((plan) => <PlanCard key={plan.id} plan={plan} booking={context.booking} checked={selected.includes(plan.id)} onToggle={canSelect ? toggle : null} />)}</div>
        {notice ? <p className="status-badge neutral">{notice}</p> : null}
        <div className="form-actions">
          <Button variant="secondary" onClick={() => navigate(canSelect ? `/booking/${bookingId}/payment` : `/booking/${bookingId}`)}>{canSelect ? "Back to payment" : "Back to booking"}</Button>
          {canSelect ? <Button onClick={save}>Save protection selection</Button> : null}
        </div>
      </section>
    </ProtectionShell>
  );
}

export function AssetProtectionPage() {
  const { assetId } = useParams();
  const listing = assetAdapter.getById(window.localStorage, assetId);
  const protection = protectionAdapter.getProtectionAvailabilitySummary(listing);
  useEffect(() => {
    document.title = "RentasHub - Asset Protection";
  }, []);
  if (!listing) return <main className="page center-page"><section className="panel narrow">Asset was not found.</section></main>;
  return (
    <ProtectionShell title="Asset protection">
      <section className="panel wide">
        <div className="section-heading"><span>{listing.title}</span></div>
        <div className="metric-grid">
          <div><span>Category</span><strong>{listing.category}</strong></div>
          <div><span>Supplier setting</span><strong>{protection.status.replace("_", " ")}</strong></div>
          <div><span>Recommended plans</span><strong>{protection.recommendedPlans.length}</strong></div>
        </div>
      </section>
      <section className="panel wide">
        <div className="asset-list">{protection.recommendedPlans.map((plan) => <PlanCard key={plan.id} plan={plan} />)}</div>
      </section>
    </ProtectionShell>
  );
}

export function ClaimsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const claims = protectionAdapter.listClaims(window.localStorage).filter((claim) => canViewClaim(user, claim));
  useEffect(() => {
    document.title = "RentasHub - Claims";
  }, []);
  return (
    <ProtectionShell title="Protection claims">
      <section className="panel wide">
        <div className="section-heading"><span>Your claims</span></div>
        {claims.length === 0 ? <div className="empty-state"><strong>No claims yet</strong><p>Claims submitted for your bookings or assets will appear here.</p></div> : (
          <div className="asset-list">
            {claims.map((claim) => <article className="asset-card" key={claim.id}><div><span className="status-badge neutral">{claim.status}</span><h3>{claim.claimType}</h3><p>{claim.description}</p></div><Button onClick={() => navigate(`/claim/${claim.id}`)}>View claim</Button></article>)}
          </div>
        )}
      </section>
    </ProtectionShell>
  );
}

export function NewClaimPage() {
  const { bookingId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const context = resolveBookingContext(window.localStorage, bookingId);
  const inspections = getInspectionsByBooking(window.localStorage, bookingId);
  const [form, setForm] = useState({ claimType: "damage", description: "", linkedInspectionId: "", linkedDisputeId: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "RentasHub - New Claim";
  }, []);

  if (!canSubmitClaim(user, context.booking, context.listing)) {
    return <main className="page center-page"><section className="panel narrow error-panel">You cannot submit a claim for this booking.</section></main>;
  }

  const submit = (event) => {
    event.preventDefault();
    const result = protectionAdapter.submitClaim(window.localStorage, { user, bookingId, input: form });
    if (!result.valid) {
      setError(result.error || Object.values(result.errors || {})[0] || "Claim could not be submitted.");
      return;
    }
    navigate(`/claim/${result.claim.id}`);
  };

  return (
    <ProtectionShell title="Submit simulated claim">
      <form className="panel wide asset-form" onSubmit={submit}>
        <div className="section-heading"><span>{context.booking.assetTitle}</span></div>
        <p className="muted">No real claim filing, payout, or legal adjudication is performed.</p>
        {error ? <p className="field-error">{error}</p> : null}
        <div className="form-grid">
          <label>
            Claim type
            <select value={form.claimType} onChange={(event) => setForm((current) => ({ ...current, claimType: event.target.value }))}>
              {CLAIM_TYPES.map((type) => <option key={type} value={type}>{type.replace("_", " ")}</option>)}
            </select>
          </label>
          <label>
            Linked inspection
            <select value={form.linkedInspectionId} onChange={(event) => setForm((current) => ({ ...current, linkedInspectionId: event.target.value }))}>
              <option value="">No inspection linked</option>
              {inspections.map((inspection) => <option key={inspection.id} value={inspection.id}>{inspection.type} / {inspection.conditionStatus}</option>)}
            </select>
          </label>
          <label>
            Linked dispute ID placeholder
            <input value={form.linkedDisputeId} onChange={(event) => setForm((current) => ({ ...current, linkedDisputeId: event.target.value }))} />
          </label>
          <label className="form-span">
            Description
            <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} />
          </label>
          <div className="photo-placeholder form-span">
            Evidence metadata placeholder
            <p>Photo, document, and inspection evidence upload will connect to storage later.</p>
          </div>
        </div>
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={() => navigate(`/booking/${bookingId}`)}>Cancel</Button>
          <Button type="submit">Submit simulated claim</Button>
        </div>
      </form>
    </ProtectionShell>
  );
}

export function ClaimDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const context = resolveClaimContext(window.localStorage, id);
  useEffect(() => {
    document.title = "RentasHub - Claim Detail";
  }, []);
  if (!canViewClaim(user, context.claim)) return <main className="page center-page"><section className="panel narrow error-panel">You cannot view this claim.</section></main>;
  const { claim, booking, listing } = context;
  return (
    <ProtectionShell title="Claim detail">
      <section className="panel wide">
        <div className="section-heading"><span>{claim.claimType}</span></div>
        <div className="profile-grid">
          <div><span>Status</span><strong>{claim.status}</strong></div>
          <div><span>Booking</span><strong>{booking?.assetTitle || claim.bookingId}</strong></div>
          <div><span>Asset</span><strong>{listing?.title || claim.assetId}</strong></div>
          <div><span>Linked inspection</span><strong>{claim.linkedInspectionId || "None"}</strong></div>
          <div><span>Linked dispute</span><strong>{claim.linkedDisputeId || "None"}</strong></div>
        </div>
        <p>{claim.description}</p>
        <p className="muted">Evidence: {claim.evidence?.map((item) => item.name).join(", ")}</p>
      </section>
    </ProtectionShell>
  );
}

export function AdminClaimsPage() {
  const { user } = useAuth();
  const [claims, setClaims] = useState(() => protectionAdapter.listClaims(window.localStorage));
  const [notice, setNotice] = useState("");

  const updateStatus = (claimId, status) => {
    const result = protectionAdapter.adminUpdateClaimStatus(window.localStorage, claimId, status, user);
    if (!result.valid) {
      setNotice(result.error);
      return;
    }
    setClaims(protectionAdapter.listClaims(window.localStorage));
    setNotice("Simulated claim status updated. No payout or legal decision was made.");
  };

  useEffect(() => {
    document.title = "RentasHub - Admin Claims";
  }, []);

  return (
    <ProtectionShell title="Admin claims">
      <section className="panel wide">
        <div className="section-heading"><span>All simulated claims</span></div>
        <p className="muted">Admin claim actions are simulated/local only. No real payout, underwriting, legal claim approval, or claim denial is executed.</p>
        {notice ? <p className="status-badge neutral">{notice}</p> : null}
        {claims.length === 0 ? <div className="empty-state"><strong>No claims submitted</strong><p>Submitted claims will appear here for simulated review.</p></div> : (
          <div className="asset-list">
            {claims.map((claim) => (
              <article className="asset-card" key={claim.id}>
                <div>
                  <span className="status-badge neutral">{claim.status}</span>
                  <h3>{claim.claimType}</h3>
                  <p>{claim.description}</p>
                </div>
                <div className="card-actions">
                  {CLAIM_STATUSES.filter((status) => status !== "draft").map((status) => <Button key={status} variant="secondary" onClick={() => updateStatus(claim.id, status)}>{status.replace("_placeholder", "").replace("_", " ")}</Button>)}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </ProtectionShell>
  );
}
