import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../components/Button.jsx";
import { paymentAdapter } from "../lib/adapters/paymentAdapter.js";
import { calculatePaymentSummary, canPayBooking, resolvePaymentContext } from "../lib/paymentLedger.js";
import { PROTECTION_NOTICE, getProtectionPlanById } from "../lib/protectionService.js";
import { useAuth } from "../state/AuthContext.jsx";

export default function BookingPayment() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [context, setContext] = useState({ booking: null, listing: null });
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    document.title = "RentasHub - Simulated Payment";
  }, []);

  const reload = () => {
    const next = resolvePaymentContext(window.localStorage, id);
    if (!next.booking) {
      setError("Booking was not found.");
      return;
    }
    if (next.booking.customerId !== user.id) {
      setError("You cannot pay for another customer's booking.");
      return;
    }
    if (next.booking.status !== "approved") {
      setError("Payment preview is available after supplier approval.");
      return;
    }
    setContext(next);
  };

  useEffect(() => {
    reload();
  }, [id, user.id]);

  const simulatePayment = () => {
    Promise.resolve(paymentAdapter.createSimulatedPayment(window.localStorage, { user, booking: context.booking, listing: context.listing }, { user }))
      .then((result) => {
        if (!result.valid) {
          setError(result.error);
          return;
        }
        setNotice("Simulated payment recorded. No real card, bank, mobile money, escrow, or processor was used.");
        setContext((current) => ({ ...current, booking: result.booking }));
      })
      .catch((err) => setError(err.message || "Could not record simulated payment."));
  };

  if (error) return <main className="page center-page"><section className="panel narrow error-panel">{error}</section></main>;
  if (!context.booking) return <main className="page center-page">Loading payment summary...</main>;

  const { booking, listing } = context;
  const summary = calculatePaymentSummary(booking, listing);
  const selectedPlans = (booking.protectionPlanIds || []).map(getProtectionPlanById).filter(Boolean);

  return (
    <main className="page dashboard-grid">
      <section className="hero-panel">
        <p className="eyebrow">RentasHub</p>
        <h1>Payment summary</h1>
        <p>{booking.assetTitle}</p>
        <span className="role-pill">Payment processing is simulated in this development version.</span>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>Invoice preview</span></div>
        <div className="booking-estimate">
          <div><span>Rental subtotal</span><strong>JMD {summary.rentalSubtotal.toLocaleString()}</strong></div>
          <div><span>Deposit amount</span><strong>JMD {summary.deposit.toLocaleString()}</strong></div>
          <div><span>Protection options</span><strong>JMD {summary.protectionFee.toLocaleString()}</strong></div>
          <div><span>Platform fee</span><strong>JMD {summary.platformFee.toLocaleString()}</strong></div>
          <div><span>Supplier earnings estimate</span><strong>JMD {summary.supplierEarnings.toLocaleString()}</strong></div>
          <div><span>Total due</span><strong>JMD {summary.total.toLocaleString()}</strong></div>
          <div><span>Payment status</span><strong>{booking.paymentStatus || "not_active"}</strong></div>
        </div>
        <p className="muted">{PROTECTION_NOTICE}</p>
        {selectedPlans.length ? (
          <div className="preview-list">
            {selectedPlans.map((plan) => <div className="preview-item" key={plan.id}><strong>{plan.name}</strong><span>{plan.type} / {plan.deductible}</span></div>)}
          </div>
        ) : <div className="empty-state"><strong>No protection selected</strong><p>Protection options can be reviewed before simulated payment.</p></div>}
        <p className="muted">No real payment fields are shown. Do not enter card, bank, mobile money, or personal payment data.</p>
        {notice ? <p className="status-badge neutral">{notice}</p> : null}
        <div className="form-actions">
          <Button variant="secondary" onClick={() => navigate(`/booking/${booking.id}`)}>Back to booking</Button>
          {booking.paymentStatus !== "paid" ? <Button variant="secondary" onClick={() => navigate(`/protection/booking/${booking.id}`)}>Choose protection</Button> : null}
          {canPayBooking(user, booking) && booking.paymentStatus !== "paid" ? <Button onClick={simulatePayment}>Mark simulated-paid</Button> : null}
          {booking.paymentStatus === "paid" ? <Button onClick={() => navigate("/payments")}>View payments</Button> : null}
        </div>
      </section>
    </main>
  );
}
