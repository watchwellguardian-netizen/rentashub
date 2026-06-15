import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../components/Button.jsx";
import { assetAdapter } from "../lib/adapters/assetAdapter.js";
import { reviewAdapter } from "../lib/adapters/reviewAdapter.js";
import { getSupplierPublicSummary } from "../lib/supplierProfile.js";
import { canRespondToReview } from "../lib/reviewService.js";
import { useAuth } from "../state/AuthContext.jsx";

function ReviewCard({ review, user, onChanged }) {
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const listing = assetAdapter.getById(window.localStorage, review.assetId);
  const canRespond = canRespondToReview(user, review, listing);
  const submitResponse = async () => {
    if (!response.trim()) {
      setError("Response is required.");
      return;
    }
    try {
      const result = await Promise.resolve(reviewAdapter.respond(window.localStorage, review.id, user, response, { user }));
      if (!result.valid) {
        setError(result.error);
        return;
      }
      setResponse("");
      onChanged?.();
    } catch (err) {
      setError(err.message || "Review response could not be saved.");
    }
  };
  return (
    <article className="asset-card">
      <div>
        <span className="status-badge neutral">{review.rating} {Number(review.rating) === 1 ? "star" : "stars"}</span>
        <h3>{review.title}</h3>
        <p>{review.comment}</p>
        <p className="muted">{review.reviewType} / {review.status}</p>
        {review.supplierResponse ? <p><strong>Supplier response:</strong> {review.supplierResponse.body}</p> : null}
        {error ? <p className="field-error">{error}</p> : null}
      </div>
      {canRespond ? (
        <div className="card-actions">
          <input value={response} onChange={(event) => setResponse(event.target.value)} placeholder="Respond to review" />
          <Button onClick={submitResponse}>Respond</Button>
        </div>
      ) : null}
    </article>
  );
}

export function ReviewsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const load = () => {
    if (!user) {
      setReviews([]);
      return;
    }
    Promise.resolve(reviewAdapter.listVisible(window.localStorage, user, { user }))
      .then(setReviews)
      .catch(() => setReviews([]));
  };
  useEffect(() => {
    document.title = "RentasHub - Reviews";
    load();
  }, [user]);
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel"><p className="eyebrow">RentasHub</p><h1>RentasHub Reviews</h1><p>Your visible review activity.</p></section>
      <section className="panel wide">
        <div className="section-heading"><span>Review list</span>{user?.role === "admin" ? <Button onClick={() => navigate("/admin/reviews")}>Admin reviews</Button> : null}</div>
        {reviews.length === 0 ? <div className="empty-state"><strong>No reviews yet</strong><p>Completed booking reviews will appear here.</p></div> : <div className="asset-list">{reviews.map((review) => <ReviewCard key={review.id} review={review} user={user} onChanged={load} />)}</div>}
      </section>
    </main>
  );
}

export function AssetReviewsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const load = () => {
    Promise.resolve(reviewAdapter.listPublishedForAsset(window.localStorage, id, { user }))
      .then(setReviews)
      .catch(() => setReviews([]));
  };
  useEffect(() => {
    document.title = "RentasHub - Asset Reviews";
    load();
  }, [id]);
  const listing = assetAdapter.getById(window.localStorage, id);
  const summary = reviewAdapter.getRatingSummary(window.localStorage, reviews);
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel"><p className="eyebrow">RentasHub</p><h1>RentasHub Reviews</h1><p>{listing?.title || id}</p><span className="role-pill">{summary.average} avg / {summary.count} reviews</span></section>
      <section className="panel wide">{reviews.length === 0 ? <div className="empty-state"><strong>No published reviews</strong><p>Customer reviews for completed bookings will appear here.</p></div> : <div className="asset-list">{reviews.map((review) => <ReviewCard key={review.id} review={review} user={user} onChanged={load} />)}</div>}</section>
    </main>
  );
}

export function SupplierReviewsPage() {
  const { supplierId } = useParams();
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const load = () => {
    Promise.resolve(reviewAdapter.listPublishedForSupplier(window.localStorage, supplierId, { user }))
      .then(setReviews)
      .catch(() => setReviews([]));
  };
  useEffect(() => {
    document.title = "RentasHub - Supplier Reviews";
    load();
  }, [supplierId]);
  const summary = reviewAdapter.getRatingSummary(window.localStorage, reviews);
  const supplier = getSupplierPublicSummary(window.localStorage, supplierId);
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel"><p className="eyebrow">RentasHub</p><h1>RentasHub Reviews</h1><p>{supplier.businessName}</p><p>{supplier.publicSummary}</p><span className="role-pill">{summary.average} avg / {summary.count} reviews</span></section>
      <section className="panel wide">{reviews.length === 0 ? <div className="empty-state"><strong>No supplier reviews</strong><p>Published supplier reviews will appear here.</p></div> : <div className="asset-list">{reviews.map((review) => <ReviewCard key={review.id} review={review} user={user} onChanged={load} />)}</div>}</section>
    </main>
  );
}
