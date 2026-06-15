import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../components/Button.jsx";
import { bookingAdapter } from "../lib/adapters/bookingAdapter.js";
import { disputeAdapter } from "../lib/adapters/disputeAdapter.js";
import { DISPUTE_NOTICE, DISPUTE_REASONS, DISPUTE_STATUSES, canOpenDispute, canViewDispute } from "../lib/disputeService.js";
import { useAuth } from "../state/AuthContext.jsx";

function DisputeShell({ title, children }) {
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel">
        <p className="eyebrow">RentasHub Disputes</p>
        <h1>{title}</h1>
        <p>{DISPUTE_NOTICE}</p>
      </section>
      {children}
    </main>
  );
}

function DisputeCard({ dispute, onOpen }) {
  return (
    <article className="asset-card">
      <div>
        <span className="status-badge neutral">{String(dispute.status || "submitted").replaceAll("_", " ")}</span>
        <h3>{String(dispute.reason || "other").replaceAll("_", " ")}</h3>
        <p>{dispute.summary || "No summary provided."}</p>
        <p className="muted">Booking: {dispute.bookingId} / Asset: {dispute.assetId}</p>
      </div>
      <Button onClick={onOpen}>View dispute</Button>
    </article>
  );
}

export function DisputesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState({ disputes: [], loading: true, error: "" });

  useEffect(() => {
    document.title = "RentasHub - Disputes";
    let active = true;
    Promise.resolve(disputeAdapter.listVisible(window.localStorage, user, { user }))
      .then((disputes) => {
        if (active) setState({ disputes, loading: false, error: "" });
      })
      .catch((error) => {
        if (active) setState({ disputes: [], loading: false, error: error.message || "Disputes could not be loaded." });
      });
    return () => {
      active = false;
    };
  }, [user]);

  if (state.loading) return <main className="page center-page">Loading disputes...</main>;
  if (state.error) return <main className="page center-page"><section className="panel narrow error-panel">{state.error}</section></main>;

  return (
    <DisputeShell title="Dispute center">
      <section className="panel wide">
        <div className="section-heading"><span>Your simulated disputes</span></div>
        {state.disputes.length === 0 ? (
          <div className="empty-state"><strong>No disputes yet</strong><p>Disputes connected to your bookings or assets will appear here.</p></div>
        ) : (
          <div className="asset-list">
            {state.disputes.map((dispute) => <DisputeCard key={dispute.id} dispute={dispute} onOpen={() => navigate(`/dispute/${dispute.id}`)} />)}
          </div>
        )}
      </section>
    </DisputeShell>
  );
}

export function NewDisputePage() {
  const { bookingId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [context, setContext] = useState({ booking: null, listing: null, loading: true, error: "" });
  const [form, setForm] = useState({ reason: "damage", summary: "" });
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    document.title = "RentasHub - New Dispute";
    let active = true;
    Promise.resolve(bookingAdapter.resolveContext(window.localStorage, bookingId, { user }))
      .then((next) => {
        if (!active) return;
        if (!next.booking) setContext({ booking: null, listing: null, loading: false, error: "Booking was not found." });
        else if (!canOpenDispute(user, next.booking, next.listing)) setContext({ ...next, loading: false, error: "You cannot open a dispute for this booking." });
        else setContext({ ...next, loading: false, error: "" });
      })
      .catch((error) => {
        if (active) setContext({ booking: null, listing: null, loading: false, error: error.message || "Booking was not found." });
      });
    return () => {
      active = false;
    };
  }, [bookingId, user]);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitError("");
    try {
      const result = await Promise.resolve(disputeAdapter.open(window.localStorage, { user, bookingId, booking: context.booking, input: form }, { user }));
      if (!result.valid) {
        setSubmitError(result.error || Object.values(result.errors || {})[0] || "Dispute could not be submitted.");
        return;
      }
      navigate(`/dispute/${result.dispute.id}`);
    } catch (error) {
      setSubmitError(error.message || "Dispute could not be submitted.");
    }
  };

  if (context.loading) return <main className="page center-page">Loading dispute form...</main>;
  if (context.error) return <main className="page center-page"><section className="panel narrow error-panel">{context.error}</section></main>;

  return (
    <DisputeShell title="Open simulated dispute">
      <form className="panel wide asset-form" onSubmit={submit}>
        <div className="section-heading"><span>{context.booking.assetTitle}</span></div>
        <p className="muted">Use this to record a local/API-pilot dispute for review. Evidence uploads remain metadata placeholders.</p>
        {submitError ? <p className="field-error">{submitError}</p> : null}
        <div className="form-grid">
          <label>
            Reason
            <select value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}>
              {DISPUTE_REASONS.map((reason) => <option key={reason} value={reason}>{reason.replaceAll("_", " ")}</option>)}
            </select>
          </label>
          <label className="form-span">
            Summary
            <textarea value={form.summary} maxLength={1200} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))} />
          </label>
          <div className="photo-placeholder form-span">
            Evidence metadata placeholder
            <p>Photo and document uploads will connect to real file storage later.</p>
          </div>
        </div>
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={() => navigate(`/booking/${bookingId}`)}>Cancel</Button>
          <Button type="submit">Submit simulated dispute</Button>
        </div>
      </form>
    </DisputeShell>
  );
}

export function DisputeDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState({ dispute: null, context: null, loading: true, error: "" });

  useEffect(() => {
    document.title = "RentasHub - Dispute Detail";
    let active = true;
    Promise.resolve(disputeAdapter.getById(window.localStorage, id, { user }))
      .then((dispute) => {
        if (!active) return;
        if (!dispute || !canViewDispute(user, dispute)) {
          setState({ dispute: null, context: null, loading: false, error: "You cannot view this dispute." });
          return;
        }
        let context = null;
        try {
          context = disputeAdapter.resolveContext(window.localStorage, id);
        } catch {
          context = null;
        }
        setState({ dispute, context, loading: false, error: "" });
      })
      .catch((error) => {
        if (active) setState({ dispute: null, context: null, loading: false, error: error.message || "Dispute was not found." });
      });
    return () => {
      active = false;
    };
  }, [id, user]);

  if (state.loading) return <main className="page center-page">Loading dispute...</main>;
  if (state.error) return <main className="page center-page"><section className="panel narrow error-panel">{state.error}</section></main>;

  const { dispute, context } = state;
  return (
    <DisputeShell title="Dispute detail">
      <section className="panel wide">
        <div className="section-heading"><span>{String(dispute.reason).replaceAll("_", " ")}</span></div>
        <div className="profile-grid">
          <div><span>Status</span><strong>{String(dispute.status).replaceAll("_", " ")}</strong></div>
          <div><span>Booking</span><strong>{context?.booking?.assetTitle || dispute.bookingId}</strong></div>
          <div><span>Asset</span><strong>{context?.listing?.title || dispute.assetId}</strong></div>
          <div><span>Opened by</span><strong>{dispute.openedByRole || "participant"}</strong></div>
        </div>
        <p>{dispute.summary}</p>
        <p className="muted">Evidence: {(dispute.evidence || []).map((item) => item.name).join(", ") || "No evidence metadata yet."}</p>
        {dispute.adminNotes ? <p className="muted">Admin note: {dispute.adminNotes}</p> : null}
        <div className="form-actions">
          <Button variant="secondary" onClick={() => navigate("/disputes")}>Back to disputes</Button>
        </div>
      </section>
    </DisputeShell>
  );
}

export function AdminDisputesPage() {
  const { user } = useAuth();
  const [state, setState] = useState({ disputes: [], loading: true, error: "", notice: "" });
  const [notes, setNotes] = useState({});

  const load = () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    return Promise.resolve(disputeAdapter.adminList(window.localStorage, user, { user }))
      .then((disputes) => setState({ disputes, loading: false, error: "", notice: "" }))
      .catch((error) => setState({ disputes: [], loading: false, error: error.message || "Admin disputes could not be loaded.", notice: "" }));
  };

  useEffect(() => {
    document.title = "RentasHub - Admin Disputes";
    load();
  }, [user]);

  const updateStatus = async (disputeId, status) => {
    try {
      const result = await Promise.resolve(disputeAdapter.adminUpdateStatus(window.localStorage, disputeId, status, user, notes[disputeId] || "", { user }));
      if (!result.valid) {
        setState((current) => ({ ...current, notice: result.error || "Dispute status could not be updated." }));
        return;
      }
      await load();
      setState((current) => ({ ...current, notice: "Simulated dispute status updated. No payout, escrow, or legal decision was made." }));
    } catch (error) {
      setState((current) => ({ ...current, notice: error.message || "Dispute status could not be updated." }));
    }
  };

  if (state.loading) return <main className="page center-page">Loading admin disputes...</main>;
  if (state.error) return <main className="page center-page"><section className="panel narrow error-panel">{state.error}</section></main>;

  return (
    <DisputeShell title="Admin disputes">
      <section className="panel wide">
        <div className="section-heading"><span>Simulated dispute review</span></div>
        <p className="muted">Admin dispute actions are local/API-pilot only. They do not execute arbitration, payment release, refund, escrow, or legal adjudication.</p>
        {state.notice ? <p className="status-badge neutral">{state.notice}</p> : null}
        {state.disputes.length === 0 ? <div className="empty-state"><strong>No disputes submitted</strong><p>Submitted disputes will appear here for controlled review.</p></div> : (
          <div className="asset-list">
            {state.disputes.map((dispute) => (
              <article className="asset-card" key={dispute.id}>
                <div>
                  <span className="status-badge neutral">{String(dispute.status).replaceAll("_", " ")}</span>
                  <h3>{String(dispute.reason).replaceAll("_", " ")}</h3>
                  <p>{dispute.summary}</p>
                  <label>
                    Admin note
                    <input value={notes[dispute.id] || ""} onChange={(event) => setNotes((current) => ({ ...current, [dispute.id]: event.target.value }))} />
                  </label>
                </div>
                <div className="card-actions">
                  {DISPUTE_STATUSES.filter((status) => status !== "submitted").map((status) => (
                    <Button key={status} variant="secondary" onClick={() => updateStatus(dispute.id, status)}>{status.replace("_placeholder", "").replaceAll("_", " ")}</Button>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </DisputeShell>
  );
}
