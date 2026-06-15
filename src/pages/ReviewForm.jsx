import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../components/Button.jsx";
import { reviewAdapter } from "../lib/adapters/reviewAdapter.js";
import { useAuth } from "../state/AuthContext.jsx";

export default function ReviewForm() {
  const { bookingId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [form, setForm] = useState({ rating: "5", title: "", comment: "", reviewType: "asset" });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    document.title = "RentasHub - Write Review";
    try {
      setBooking(reviewAdapter.resolveBooking(window.localStorage, bookingId));
    } catch {
      setBooking(null);
    }
  }, [bookingId]);

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const submit = async (event) => {
    event.preventDefault();
    try {
      const result = await Promise.resolve(reviewAdapter.submit(window.localStorage, { user, booking, input: form }, { user }));
      if (!result.valid) {
        setErrors(result.errors);
        return;
      }
      navigate(`/asset/${booking.assetId}/reviews`);
    } catch (err) {
      setErrors({ api: err.message || "Review API mode could not submit this review." });
    }
  };

  if (!booking) return <main className="page center-page">Loading review form...</main>;
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel"><p className="eyebrow">RentasHub</p><h1>Write a review</h1><p>{booking.assetTitle}</p></section>
      <form className="panel wide form-grid" onSubmit={submit}>
        {Object.values(errors).map((error) => <p className="field-error form-span" key={error}>{error}</p>)}
        <label>Star rating<select value={form.rating} onChange={(event) => setField("rating", event.target.value)}>{[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating}</option>)}</select></label>
        <label>Review type<select value={form.reviewType} onChange={(event) => setField("reviewType", event.target.value)}><option value="asset">asset</option><option value="supplier">supplier</option><option value="customer">customer</option></select></label>
        <label className="form-span">Title<input value={form.title} onChange={(event) => setField("title", event.target.value)} /></label>
        <label className="form-span">Comment<textarea value={form.comment} onChange={(event) => setField("comment", event.target.value)} /></label>
        <div className="form-actions"><Button type="submit">Submit review</Button></div>
      </form>
    </main>
  );
}
