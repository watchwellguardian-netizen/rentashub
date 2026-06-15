import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button.jsx";
import { bookingAdapter } from "../lib/adapters/bookingAdapter.js";
import { BOOKING_STATUSES } from "../lib/bookingService.js";
import { useAuth } from "../state/AuthContext.jsx";

export default function CustomerBookings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = "RentasHub - Bookings";
  }, []);

  const reload = () => {
    let active = true;
    try {
      setLoading(true);
      Promise.resolve(bookingAdapter.listByCustomer(window.localStorage, user.id, { user }))
        .then((loaded) => {
          if (active) setBookings(loaded);
        })
        .catch((err) => {
          if (active) setError(err.message || "Bookings need a refresh. Please try again.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    } catch (err) {
      setError(err.message || "Bookings need a refresh. Please try again.");
      setLoading(false);
    }
    return () => {
      active = false;
    };
  };

  useEffect(() => {
    return reload();
  }, [user.id]);

  const cancelBooking = async (bookingId) => {
    try {
      const result = await Promise.resolve(bookingAdapter.updateStatus(window.localStorage, bookingId, "cancelled", user));
      if (!result.valid) setError(result.error || "Could not cancel this booking.");
      reload();
    } catch (err) {
      setError(err.message || "Could not cancel this booking.");
    }
  };

  if (loading) return <main className="page center-page">Loading bookings...</main>;
  if (error) return <main className="page center-page"><section className="panel narrow error-panel">{error}</section></main>;

  return (
    <main className="page dashboard-grid">
      <section className="hero-panel">
        <p className="eyebrow">RentasHub</p>
        <h1>RentasHub Bookings</h1>
        <p>Review booking requests, supplier decisions, and next steps. Payments are not active yet.</p>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>Booking requests</span><Button variant="secondary" onClick={() => navigate("/search")}>Find assets</Button></div>
        {bookings.length === 0 ? (
          <div className="empty-state"><strong>No bookings yet</strong><p>Search the marketplace and request a rental when you find the right asset.</p></div>
        ) : (
          <div className="asset-list">
            {bookings.map((booking) => (
              <article className="asset-card" key={booking.id}>
                <div>
                  <span className="status-badge neutral">{BOOKING_STATUSES[booking.status] || booking.status}</span>
                  <h3>{booking.assetTitle}</h3>
                  <p>{booking.startDateTime} to {booking.endDateTime}</p>
                  <p>Estimated cost: JMD {Number(booking.estimatedCost).toLocaleString()}</p>
                </div>
                <div className="card-actions">
                  <Button variant="secondary" onClick={() => navigate(`/booking/${booking.id}`)}>View details</Button>
                  {["pending_supplier_approval", "approved"].includes(booking.status) ? (
                    <Button variant="ghost" onClick={() => cancelBooking(booking.id)}>Cancel</Button>
                  ) : null}
                  {booking.status === "completed" ? <Button onClick={() => navigate(`/reviews/write/${booking.id}`)}>Write review</Button> : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
