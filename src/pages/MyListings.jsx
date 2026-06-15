import { useEffect, useMemo, useState } from "react";
import AssetCard from "../components/AssetCard.jsx";
import Button from "../components/Button.jsx";
import { useAuth } from "../state/AuthContext.jsx";
import { assetAdapter } from "../lib/adapters/assetAdapter.js";
import { useNavigate } from "react-router-dom";

export default function MyListings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = "RentasHub - My Listings";
  }, []);

  useEffect(() => {
    let active = true;
    try {
      setLoading(true);
      Promise.resolve(assetAdapter.listBySupplier(window.localStorage, user.id))
        .then((loaded) => {
          if (active) setListings(loaded);
        })
        .catch((err) => {
          if (active) setError(err.message || "We could not load your listings. Please refresh and try again.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    } catch {
      setError("We could not load your listings. Please refresh and try again.");
      setLoading(false);
    }
    return () => {
      active = false;
    };
  }, [user.id]);

  const counts = useMemo(() => ({
    total: listings.length,
    active: listings.filter((listing) => listing.availabilityStatus === "available").length,
    pending: listings.filter((listing) => listing.verificationStatus === "pending review").length,
  }), [listings]);

  if (loading) return <main className="page center-page">Loading your listings...</main>;
  if (error) return <main className="page center-page"><section className="panel narrow">{error}</section></main>;

  return (
    <main className="page dashboard-grid">
      <section className="hero-panel">
        <p className="eyebrow">RentasHub</p>
        <h1>My Listings</h1>
        <p>Manage supplier-owned listings only. Other suppliers' assets are not editable here.</p>
      </section>
      <section className="panel wide">
        <div className="section-heading">
          <span>Listing summary</span>
          <Button onClick={() => navigate("/list-asset")}>Add Asset</Button>
        </div>
        <div className="metric-grid">
          <div><strong>{counts.total}</strong><span>Total</span></div>
          <div><strong>{counts.active}</strong><span>Available</span></div>
          <div><strong>{counts.pending}</strong><span>Pending review</span></div>
          <div><strong>{listings.length - counts.active}</strong><span>Other status</span></div>
        </div>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>Supplier listings</span></div>
        {listings.length === 0 ? (
          <div className="empty-state">
            <strong>No listings yet</strong>
            <p>Add your first asset to start receiving rental and brokerage requests.</p>
          </div>
        ) : (
          <div className="asset-list">
            {listings.map((listing) => <AssetCard key={listing.id} listing={listing} canEdit />)}
          </div>
        )}
      </section>
    </main>
  );
}
