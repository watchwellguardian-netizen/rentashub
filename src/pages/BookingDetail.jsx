import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Button from "../components/Button.jsx";
import { bookingAdapter } from "../lib/adapters/bookingAdapter.js";
import { inspectionAdapter } from "../lib/adapters/inspectionAdapter.js";
import { BOOKING_STATUSES, canManageBooking, canViewBooking } from "../lib/bookingService.js";
import { PROTECTION_NOTICE, getProtectionPlanById } from "../lib/protectionService.js";
import { useAuth } from "../state/AuthContext.jsx";

export default function BookingDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [context, setContext] = useState({ booking: null, listing: null });
  const [inspections, setInspections] = useState([]);
  const [error, setError] = useState(null);

  const manageMode = location.pathname.endsWith("/manage");

  useEffect(() => {
    document.title = manageMode ? "RentasHub - Manage Booking" : "RentasHub - Booking Detail";
  }, [manageMode]);

  const reload = () => {
    let active = true;
    Promise.resolve(bookingAdapter.resolveContext(window.localStorage, id, { user }))
      .then((next) => {
        if (!active) return;
        if (!next.booking) {
          setError("Booking request was not found.");
          return;
        }
        if (!canViewBooking(user, next.booking, next.listing)) {
          setError("You do not have permission to view this booking.");
          return;
        }
        if (manageMode && !canManageBooking(user, next.booking, next.listing)) {
          setError("You cannot manage bookings for another supplier's asset.");
          return;
        }
        setContext(next);
        return Promise.resolve(inspectionAdapter.listByBooking(window.localStorage, id, { user }));
      })
      .then((loadedInspections) => {
        if (active && loadedInspections) setInspections(loadedInspections);
      })
      .catch((err) => {
        if (active) setError(err.message || "Booking request was not found.");
      });
    return () => {
      active = false;
    };
  };

  useEffect(() => {
    return reload();
  }, [id, manageMode, user]);

  const decide = async (status) => {
    try {
      const result = await Promise.resolve(bookingAdapter.updateStatus(window.localStorage, id, status, user));
      if (!result.valid) {
        setError(result.error);
        return;
      }
      reload();
    } catch (err) {
      setError(err.message || "Could not update this booking.");
    }
  };

  if (error) return <main className="page center-page"><section className="panel narrow error-panel">{error}</section></main>;
  if (!context.booking) return <main className="page center-page">Loading booking detail...</main>;

  const { booking, listing } = context;
  const canManage = canManageBooking(user, booking, listing);
  const selectedProtection = (booking.protectionPlanIds || []).map(getProtectionPlanById).filter(Boolean);

  return (
    <main className="page dashboard-grid">
      <section className="hero-panel">
        <p className="eyebrow">RentasHub</p>
        <h1>{manageMode ? "Manage booking request" : "Booking detail"}</h1>
        <p>{booking.assetTitle}</p>
        <span className="role-pill">{BOOKING_STATUSES[booking.status] || booking.status}</span>
      </section>

      <section className="panel">
        <div className="section-heading"><span>Asset summary</span></div>
        <p><strong>{booking.assetTitle}</strong></p>
        <p className="muted">{listing?.category || "Asset"} / {listing?.location || "Location not set"}</p>
        <p className="muted">Supplier: {booking.supplierName}</p>
      </section>

      <section className="panel">
        <div className="section-heading"><span>Customer and request</span></div>
        <p><strong>{booking.customerName}</strong></p>
        <p className="muted">{booking.notes || "No special notes added."}</p>
      </section>

      <section className="panel">
        <div className="section-heading"><span>Dates and method</span></div>
        <p><strong>Start:</strong> {booking.startDateTime}</p>
        <p><strong>End:</strong> {booking.endDateTime}</p>
        <p><strong>Rental type:</strong> {booking.rentalType}</p>
        <p><strong>Pickup/delivery:</strong> {booking.pickupDeliveryMethod}</p>
        {booking.deliveryLocation ? <p><strong>Delivery location:</strong> {booking.deliveryLocation}</p> : null}
      </section>

      <section className="panel">
        <div className="section-heading"><span>Estimate and payment</span></div>
        <p><strong>Duration:</strong> {booking.estimatedDurationLabel}</p>
        <p><strong>Estimated cost:</strong> JMD {Number(booking.estimatedCost).toLocaleString()}</p>
        <p><strong>Deposit:</strong> {booking.depositRequirement}</p>
        <p><strong>Selected protection:</strong> {selectedProtection.length ? selectedProtection.map((plan) => plan.name).join(", ") : "None selected"}</p>
        <p><strong>Protection cost:</strong> JMD {Number(booking.protectionCost || 0).toLocaleString()}</p>
        <p className="muted">{PROTECTION_NOTICE}</p>
      </section>

      <section className="panel wide">
        <div className="section-heading"><span>Next action</span></div>
        <p className="muted">No payment has been charged. Inspection records are local until backend/API storage is added.</p>
        <div className="form-actions">
          <Button variant="secondary" onClick={() => navigate(user?.role === "supplier" ? "/rental-requests" : "/bookings")}>Back</Button>
          <Button variant="secondary" onClick={() => navigate(`/booking/${booking.id}/messages`)}>Messages</Button>
          {booking.customerId === user?.id && booking.status === "approved" && booking.paymentStatus !== "paid" ? (
            <Button variant="secondary" onClick={() => navigate(`/protection/booking/${booking.id}`)}>Choose protection</Button>
          ) : null}
          {["customer", "supplier"].includes(user?.role) ? (
            <Button variant="secondary" onClick={() => navigate(`/claims/new/${booking.id}`)}>Submit claim</Button>
          ) : null}
          {["customer", "supplier"].includes(user?.role) ? (
            <Button variant="secondary" onClick={() => navigate(`/disputes/new/${booking.id}`)}>Open dispute</Button>
          ) : null}
          {booking.status === "approved" && booking.customerId === user?.id && !["paid", "manual_offline"].includes(booking.paymentStatus) ? (
            <Button onClick={() => navigate(`/booking/${booking.id}/payment`)}>Open simulated payment</Button>
          ) : null}
          {booking.status === "approved" && booking.customerId === user?.id && ["paid", "manual_offline"].includes(booking.paymentStatus) ? (
            <Button onClick={() => navigate(`/booking/${booking.id}/check-in`)}>Start check-in</Button>
          ) : null}
          {booking.status === "active" && booking.customerId === user?.id ? (
            <Button onClick={() => navigate(`/booking/${booking.id}/check-out`)}>Start check-out</Button>
          ) : null}
          {canManage && booking.status === "pending_supplier_approval" ? (
            <>
              <Button onClick={() => decide("approved")}>Approve request</Button>
              <Button variant="ghost" onClick={() => decide("declined")}>Decline request</Button>
            </>
          ) : null}
        </div>
      </section>

      <section className="panel wide">
        <div className="section-heading"><span>Inspection records</span></div>
        {inspections.length === 0 ? (
          <div className="empty-state"><strong>No inspection records yet</strong><p>Check-in and check-out records will appear here after submission.</p></div>
        ) : (
          <div className="preview-list">
            {inspections.map((inspection) => (
              <div className="preview-item" key={inspection.id}>
                <strong>{inspection.type === "check-in" ? "Check-in" : "Check-out"} / {inspection.conditionStatus}</strong>
                <span>{inspection.timestamp}</span>
                <div className="form-actions">
                  <Button variant="secondary" onClick={() => navigate(`/inspection/${inspection.id}`)}>View inspection</Button>
                  {canManage ? <Button onClick={() => navigate(`/inspection/${inspection.id}/review`)}>Review inspection</Button> : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
