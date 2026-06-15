import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MARKETPLACE_LISTING_LABELS, getCategoryById } from "../lib/assetListing.js";
import { getSupplierPublicSummary } from "../lib/supplierProfile.js";
import { reviewAdapter } from "../lib/adapters/reviewAdapter.js";
import { trustAdapter } from "../lib/adapters/trustAdapter.js";
import Button from "./Button.jsx";

export default function AssetCard({ listing, canEdit = false, onView = null }) {
  const navigate = useNavigate();
  const [rating, setRating] = useState({ average: 0, count: 0 });
  const [trust, setTrust] = useState({ supplier: { score: 0, badges: [], flags: [] }, asset: { score: 0, flags: [] } });
  const category = getCategoryById(listing.category);
  const supplier = getSupplierPublicSummary(window.localStorage, listing.ownerSupplierId);

  useEffect(() => {
    let active = true;
    Promise.resolve(reviewAdapter.getAssetRatingSummary(window.localStorage, listing.id))
      .then((summary) => {
        if (active) setRating(summary);
      })
      .catch(() => {
        if (active) setRating({ average: 0, count: 0 });
      });
    return () => {
      active = false;
    };
  }, [listing.id]);

  useEffect(() => {
    let active = true;
    Promise.resolve(trustAdapter.summaryForListing(window.localStorage, listing))
      .then((summary) => {
        if (active && summary) setTrust(summary);
      })
      .catch(() => {
        if (active) setTrust({ supplier: { score: 0, badges: [], flags: [] }, asset: { score: 0, flags: [] } });
      });
    return () => {
      active = false;
    };
  }, [listing]);
  const viewListing = () => {
    if (onView) onView();
    else navigate(`/asset/${listing.id}`);
  };

  return (
    <article className="asset-card">
      <div>
        <div className="badge-row">
          <span className="status-badge">{category.label}</span>
          <span className="status-badge neutral">{listing.availabilityStatus}</span>
          <span className="status-badge neutral">{MARKETPLACE_LISTING_LABELS[listing.listingType] || MARKETPLACE_LISTING_LABELS.rental}</span>
          <span className="status-badge">Trust {trust.asset.score}/100</span>
          {supplier.verificationStatus === "verified" ? <span className="status-badge">Verified supplier</span> : null}
        </div>
        <h3>{listing.title}</h3>
        <p>{listing.subcategory} / {listing.location} / {listing.rentalType}</p>
        <p>JMD {Number(listing.priceRate).toLocaleString()} / Supplier: {supplier.businessName || listing.supplierName || "Supplier"}</p>
        {listing.salePrice ? <p>Sale price: JMD {Number(listing.salePrice).toLocaleString()}</p> : null}
        {listing.tradeValue ? <p>Trade value placeholder: JMD {Number(listing.tradeValue).toLocaleString()}</p> : null}
        <p>Rating: {rating.average} / 5 ({rating.count} reviews)</p>
        <p>Supplier trust: {trust.supplier.score}/100 {trust.supplier.badges.length ? `/ ${trust.supplier.badges.slice(0, 2).join(", ")}` : ""}</p>
        {trust.asset.flags.length ? <p className="field-error">Risk flags: {trust.asset.flags.join(", ")}</p> : null}
        <p>Verification: {listing.verificationStatus}</p>
      </div>
      <div className="card-actions">
        <Button variant="secondary" onClick={viewListing}>View</Button>
        {canEdit ? <Button onClick={() => navigate(`/asset/${listing.id}/edit`)}>Edit</Button> : null}
      </div>
    </article>
  );
}
