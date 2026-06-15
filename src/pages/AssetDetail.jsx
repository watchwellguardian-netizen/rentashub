import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../components/Button.jsx";
import { useAuth } from "../state/AuthContext.jsx";
import { assetAdapter } from "../lib/adapters/assetAdapter.js";
import { reviewAdapter } from "../lib/adapters/reviewAdapter.js";
import { trustAdapter } from "../lib/adapters/trustAdapter.js";
import { MARKETPLACE_LISTING_LABELS, canEditAssetListing, canViewAssetListing, getCategoryById } from "../lib/assetListing.js";
import { getSupplierPublicSummary } from "../lib/supplierProfile.js";
import { PROTECTION_NOTICE, getProtectionAvailabilitySummary } from "../lib/protectionService.js";

export default function AssetDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [rating, setRating] = useState({ average: 0, count: 0 });
  const [trust, setTrust] = useState({ supplier: { score: 0, badges: [], flags: [] }, asset: { score: 0, riskLevel: "low", flags: [] } });
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = "RentasHub - Asset Detail";
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve(assetAdapter.getById(window.localStorage, id))
      .then((found) => {
        if (!active) return;
        if (!found) {
          setError("Asset listing was not found.");
          return;
        }
        if (!canViewAssetListing(user, found)) {
          setError("You do not have permission to view this asset.");
          return;
        }
        setListing(found);
      })
      .catch((err) => {
        if (active) setError(err.message || "Asset API mode could not load this asset.");
      });
    return () => {
      active = false;
    };
  }, [id, user]);

  useEffect(() => {
    if (!listing) return undefined;
    let active = true;
    Promise.resolve(reviewAdapter.getAssetRatingSummary(window.localStorage, listing.id, { user }))
      .then((summary) => {
        if (active) setRating(summary);
      })
      .catch(() => {
        if (active) setRating({ average: 0, count: 0 });
      });
    return () => {
      active = false;
    };
  }, [listing, user]);

  useEffect(() => {
    if (!listing) return undefined;
    let active = true;
    Promise.resolve(trustAdapter.summaryForListing(window.localStorage, listing, { user }))
      .then((summary) => {
        if (active && summary) setTrust(summary);
      })
      .catch(() => {
        if (active) setTrust({ supplier: { score: 0, badges: [], flags: [] }, asset: { score: 0, riskLevel: "low", flags: [] } });
      });
    return () => {
      active = false;
    };
  }, [listing, user]);

  if (error) return <main className="page center-page"><section className="panel narrow">{error}</section></main>;
  if (!listing) return <main className="page center-page">Loading asset detail...</main>;

  const category = getCategoryById(listing.category);
  const canEdit = canEditAssetListing(user, listing);
  const supplier = getSupplierPublicSummary(window.localStorage, listing.ownerSupplierId);
  const protection = getProtectionAvailabilitySummary(listing);

  return (
    <main className="page dashboard-grid">
      <section className="hero-panel">
        <p className="eyebrow">RentasHub</p>
        <h1>{listing.title}</h1>
        <p>{category.label} / {listing.subcategory} / {listing.location}</p>
        <span className="role-pill">{listing.availabilityStatus}</span>
        <span className="role-pill">{MARKETPLACE_LISTING_LABELS[listing.listingType] || MARKETPLACE_LISTING_LABELS.rental}</span>
        <span className="role-pill">Asset trust {trust.asset.score}/100</span>
        <span className="role-pill">{rating.average} / 5 rating ({rating.count} reviews)</span>
      </section>
      <section className="panel">
        <div className="section-heading"><span>Price and availability</span></div>
        <div className="profile-grid">
          <div><span>Rate</span><strong>JMD {Number(listing.priceRate).toLocaleString()}</strong></div>
          <div><span>Rental type</span><strong>{listing.rentalType}</strong></div>
          <div><span>Sale price</span><strong>{listing.salePrice ? `JMD ${Number(listing.salePrice).toLocaleString()}` : "Not listed for sale"}</strong></div>
          <div><span>Trade value</span><strong>{listing.tradeValue ? `JMD ${Number(listing.tradeValue).toLocaleString()}` : "Not set"}</strong></div>
          <div><span>Swap interested</span><strong>{listing.swapInterested ? "Yes" : "No"}</strong></div>
          <div><span>Negotiation</span><strong>{listing.negotiationAllowed ? "Allowed" : "Fixed terms"}</strong></div>
          <div><span>Broker assist</span><strong>{listing.brokerAssistRequired ? "Required" : "Optional / not required"}</strong></div>
          <div><span>Deposit</span><strong>{listing.depositRequirement}</strong></div>
          <div><span>Delivery / pickup</span><strong>{listing.deliveryPickupOptions}</strong></div>
        </div>
      </section>
      <section className="panel">
        <div className="section-heading"><span>Supplier summary</span></div>
        <p><strong>{supplier.businessName || listing.supplierName}</strong></p>
        <p>{supplier.publicSummary}</p>
        <p className="muted">Service areas: {supplier.serviceAreas}</p>
        <p className="muted">Supplier type: {supplier.supplierType}</p>
        <p className="muted">Supplier verification: {supplier.verificationStatus}</p>
        <p className="muted">Supplier trust score: {trust.supplier.score}/100</p>
        <p className="muted">Reputation badges: {trust.supplier.badges.length ? trust.supplier.badges.join(", ") : "No badges yet"}</p>
        {trust.supplier.flags.length ? <p className="field-error">Supplier risk flags: {trust.supplier.flags.join(", ")}</p> : null}
        <p className="muted">Supplier ID: {listing.ownerSupplierId}</p>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>Description</span></div>
        <p>{listing.description}</p>
      </section>
      <section className="panel">
        <div className="section-heading"><span>Rules and policies</span></div>
        <p><strong>Insurance:</strong> {listing.insuranceRequirement}</p>
        <p><strong>Protection requirement:</strong> {(listing.protectionRequirement || "optional").replace("_", " ")}</p>
        <p><strong>Damage:</strong> {listing.damagePolicy}</p>
        <p><strong>Cancellation:</strong> {listing.cancellationPolicy}</p>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>Recommended protection options</span><Button variant="secondary" onClick={() => navigate(`/protection/asset/${listing.id}`)}>View protection</Button></div>
        <p className="muted">{PROTECTION_NOTICE}</p>
        <div className="profile-grid">
          <div><span>Supplier setting</span><strong>{protection.status.replace("_", " ")}</strong></div>
          <div><span>Protection available</span><strong>{protection.available ? "Yes" : "No"}</strong></div>
        </div>
        <div className="preview-list">
          {protection.recommendedPlans.map((plan) => (
            <div className="preview-item" key={plan.id}>
              <strong>{plan.name}</strong>
              <span>{plan.coverageSummary} / Deductible: {plan.deductible}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="section-heading"><span>Safety and usage</span></div>
        <p><strong>Safety:</strong> {listing.safetyInstructions}</p>
        <p><strong>Usage:</strong> {listing.usageInstructions}</p>
        <p><strong>Operator required:</strong> {listing.operatorRequired ? "Yes" : "No"}</p>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>Category details</span></div>
        <div className="profile-grid">
          {Object.entries(listing.categoryFields || {}).map(([key, value]) => (
            <div key={key}><span>{key}</span><strong>{String(value || "Not set")}</strong></div>
          ))}
        </div>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>Trust and risk summary</span></div>
        <div className="profile-grid">
          <div><span>Asset trust</span><strong>{trust.asset.score}/100</strong></div>
          <div><span>Supplier trust</span><strong>{trust.supplier.score}/100</strong></div>
          <div><span>Asset risk</span><strong>{trust.asset.riskLevel}</strong></div>
          <div><span>Supplier risk</span><strong>{trust.supplier.riskLevel}</strong></div>
        </div>
        <p className="muted">Trust scoring is local and transparent in this version. It is not a final risk decision, official identity review, or legal decision.</p>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>Actions</span></div>
        <div className="form-actions">
          <Button onClick={() => navigate(`/asset/${listing.id}/book`)}>Request Booking</Button>
          <Button variant="secondary" onClick={() => navigate(`/listing/${listing.id}/offer`)}>Make offer / proposal</Button>
          <Button variant="secondary" onClick={() => navigate(`/asset/${listing.id}/reviews`)}>View reviews</Button>
          {canEdit ? <Button variant="secondary" onClick={() => navigate(`/asset/${listing.id}/edit`)}>Edit listing</Button> : null}
        </div>
      </section>
    </main>
  );
}
