import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button.jsx";
import { bookingAdapter } from "../lib/adapters/bookingAdapter.js";
import { BOOKING_STATUSES } from "../lib/bookingService.js";
import { useAuth } from "../state/AuthContext.jsx";

export default function SupplierRentalRequests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = "RentasHub - Rental Requests";
  }, []);

  const reload = () => {
    let active = true;
    try {
      setLoading(true);
      Promise.resolve(bookingAdapter.listBySupplier(window.localStorage, user.id, { user }))
        .then((loaded) => {
          if (active) setBookings(loaded);
        })
        .catch((err) => {
          if (active) setError(err.message || "Rental requests need a refresh. Please try again.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    } catch (err) {
      setError(err.message || "Rental requests need a refresh. Please try again.");
      setLoading(false);
    }
    return () => {
      active = false;
    };
  };

  useEffect(() => {
    return reload();
  }, [user.id]);

  const decide = async (bookingId, status) => {
    try {
      const result = await Promise.resolve(bookingAdapter.updateStatus(window.localStorage, bookingId, status, user));
      if (!result.valid) setError(result.error || "Could not update this request.");
      reload();
    } catch (err) {
      setError(err.message || "Could not update this request.");
    }
  };

  if (loading) return <main className="page center-page">Loading rental requests...</main>;
  if (error) return <main className="page center-page"><section className="panel narrow error-panel">{error}</section></main>;

  return (
    <main className="page dashboard-grid">
      <section className="hero-panel">
        <p className="eyebrow">RentasHub</p>
        <h1>Rental requests</h1>
        <p>Approve or decline customer booking requests for your own assets only.</p>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>Supplier requests</span></div>
        {bookings.length === 0 ? (
          <div className="empty-state"><strong>No rental requests</strong><p>New customer requests for your listings will appear here.</p></div>
        ) : (
          <div className="asset-list">
            {bookings.map((booking) => (
              <article className="asset-card" key={booking.id}>
                <div>
                  <span className="status-badge neutral">{BOOKING_STATUSES[booking.status] || booking.status}</span>
                  <h3>{booking.assetTitle}</h3>
                  <p>Customer: {booking.customerName}</p>
                  <p>{booking.startDateTime} to {booking.endDateTime} / JMD {Number(booking.estimatedCost).toLocaleString()}</p>
                </div>
                <div className="card-actions">
                  <Button variant="secondary" onClick={() => navigate(`/booking/${booking.id}/manage`)}>View request</Button>
                  {booking.status === "pending_supplier_approval" ? (
                    <>
                      <Button onClick={() => decide(booking.id, "approved")}>Approve</Button>
                      <Button variant="ghost" onClick={() => decide(booking.id, "declined")}>Decline</Button>
                    </>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
