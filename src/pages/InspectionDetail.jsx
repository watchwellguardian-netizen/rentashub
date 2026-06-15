import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Button from "../components/Button.jsx";
import { inspectionAdapter } from "../lib/adapters/inspectionAdapter.js";
import {
  INSPECTION_REVIEW_STATUSES,
  canReviewInspection,
  canViewInspection,
} from "../lib/inspectionService.js";
import { useAuth } from "../state/AuthContext.jsx";

export default function InspectionDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [context, setContext] = useState({ inspection: null, booking: null, listing: null });
  const [reviewNotes, setReviewNotes] = useState("");
  const [error, setError] = useState(null);
  const reviewMode = location.pathname.endsWith("/review");

  useEffect(() => {
    document.title = reviewMode ? "RentasHub - Review Inspection" : "RentasHub - Inspection";
  }, [reviewMode]);

  const reload = () => {
    let active = true;
    Promise.resolve(inspectionAdapter.getContext(window.localStorage, id, { user }))
      .then((next) => {
        if (!active) return;
        if (!next.inspection) {
          setError("Inspection record was not found.");
          return;
        }
        if (!canViewInspection(user, next.inspection, next.booking, next.listing)) {
          setError("You do not have permission to view this inspection.");
          return;
        }
        if (reviewMode && !canReviewInspection(user, next.inspection, next.booking, next.listing)) {
          setError("You cannot review inspections for another supplier's asset.");
          return;
        }
        setContext(next);
      })
      .catch((err) => {
        if (active) setError(err.message || "Inspection record was not found.");
      });
    return () => {
      active = false;
    };
  };

  useEffect(() => {
    return reload();
  }, [id, reviewMode, user]);

  const decide = async (status) => {
    try {
      const result = await Promise.resolve(inspectionAdapter.review(window.localStorage, id, status, user, reviewNotes));
      if (!result.valid) {
        setError(result.error);
        return;
      }
      reload();
    } catch (err) {
      setError(err.message || "Inspection API mode could not update this review.");
    }
  };

  if (error) return <main className="page center-page"><section className="panel narrow error-panel">{error}</section></main>;
  if (!context.inspection) return <main className="page center-page">Loading inspection detail...</main>;

  const { inspection, booking, listing } = context;
  const canReview = canReviewInspection(user, inspection, booking, listing);

  return (
    <main className="page dashboard-grid">
      <section className="hero-panel">
        <p className="eyebrow">RentasHub</p>
        <h1>{inspection.type === "check-in" ? "Check-in inspection" : "Check-out inspection"}</h1>
        <p>{inspection.assetTitle}</p>
        <span className="role-pill">{INSPECTION_REVIEW_STATUSES[inspection.supplierReview.status]}</span>
      </section>

      <section className="panel">
        <div className="section-heading"><span>Inspection summary</span></div>
        <p><strong>Condition:</strong> {inspection.conditionStatus}</p>
        <p><strong>Timestamp:</strong> {inspection.timestamp}</p>
        <p><strong>Submitted by:</strong> {inspection.submittedByRole} / {inspection.submittedByUserId}</p>
        <p className="muted">Booking: {booking?.id}</p>
      </section>

      <section className="panel">
        <div className="section-heading"><span>Asset and location</span></div>
        <p><strong>{inspection.categoryLabel}</strong></p>
        <p>{listing?.location || "Location not set"}</p>
        <p className="muted">GPS-ready location: {inspection.location.label || "Not entered"}</p>
      </section>

      <section className="panel wide">
        <div className="section-heading"><span>Checklist</span></div>
        <div className="preview-list">
          {Object.entries(inspection.checklist).map(([item, checked]) => (
            <div className="preview-item" key={item}><strong>{checked ? "Complete" : "Not checked"}</strong><span>{item}</span></div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-heading"><span>Meters and accessories</span></div>
        <p><strong>Fuel/battery/charge:</strong> {inspection.fuelBatteryLevel || "Not entered"}</p>
        <p><strong>Odometer:</strong> {inspection.odometer || "Not applicable"}</p>
        <p><strong>Engine hours:</strong> {inspection.engineHours || "Not applicable"}</p>
        <p><strong>Accessories included:</strong> {inspection.accessoriesIncluded || "Not entered"}</p>
        <p><strong>Missing accessories:</strong> {inspection.missingAccessories || "Not entered"}</p>
      </section>

      <section className="panel">
        <div className="section-heading"><span>Photos and notes</span></div>
        <p><strong>Photos:</strong> {inspection.photos.length} upload-ready placeholder record(s)</p>
        <p><strong>Customer notes:</strong> {inspection.customerNotes || "None"}</p>
        <p><strong>Damage notes:</strong> {inspection.damageNotes || "None"}</p>
      </section>

      <section className="panel wide">
        <div className="section-heading"><span>Supplier review</span></div>
        <p>Status: {INSPECTION_REVIEW_STATUSES[inspection.supplierReview.status]}</p>
        {inspection.supplierReview.placeholder ? <p className="muted">{inspection.supplierReview.placeholder}</p> : null}
        {canReview ? (
          <div className="form-grid">
            <label className="form-span">Review notes
              <textarea value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} placeholder="Add inspection review notes." />
            </label>
            <div className="form-actions">
              <Button onClick={() => decide("accepted")}>Accept inspection</Button>
              <Button variant="ghost" onClick={() => decide("flagged")}>Flag for follow-up</Button>
            </div>
          </div>
        ) : null}
        <div className="form-actions">
          <Button variant="secondary" onClick={() => navigate(`/booking/${booking.id}`)}>Back to booking</Button>
        </div>
      </section>
    </main>
  );
}
