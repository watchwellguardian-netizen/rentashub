import { useEffect, useState } from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import Button from "../components/Button.jsx";
import { assetAdapter } from "../lib/adapters/assetAdapter.js";
import { ASSET_CATEGORIES, MARKETPLACE_LISTING_LABELS, searchAssetListings, createEmptySearchFilters } from "../lib/assetListing.js";
import { APP_NAME, APP_TAGLINE } from "../lib/brand.js";
import { EXCHANGE_NAV, createWantedRequest, loadWantedRequests } from "../lib/marketplaceExchange.js";
import { useAuth } from "../state/AuthContext.jsx";

const PAGE_COPY = {
  all: ["RentasHub Marketplace", "Browse assets for rent, buy, sell, trade, auction, swap, and broker-assisted opportunities."],
  buy: ["RentasHub Buy Marketplace", "Find assets available for purchase or rent-or-buy negotiation."],
  sell: ["RentasHub Sell Marketplace", "Review supplier sale listings and controlled purchase inquiries."],
  trade: ["RentasHub Trade Marketplace", "Find assets open to trade proposals and value comparisons."],
  swap: ["RentasHub Swap Marketplace", "Browse exchange-ready assets without transaction processing or legal claims."],
  brokerage: ["RentasHub Brokerage Marketplace", "Explore broker-assisted opportunities. Commissions and legal workflows are not built yet."],
};

export function ExchangeNav() {
  return (
    <div className="navrail admin-nav exchange-nav">
      {EXCHANGE_NAV.map((item) => <NavLink key={item.route} to={item.route} className={({ isActive }) => `navitem ${isActive ? "active" : ""}`}>{item.label}</NavLink>)}
    </div>
  );
}

function ListingTypeBadges({ listing }) {
  const badges = [MARKETPLACE_LISTING_LABELS[listing.listingType] || MARKETPLACE_LISTING_LABELS.rental];
  if (listing.salePrice) badges.push(`Sale JMD ${Number(listing.salePrice).toLocaleString()}`);
  if (listing.tradeValue) badges.push(`Trade value JMD ${Number(listing.tradeValue).toLocaleString()}`);
  if (listing.swapInterested) badges.push("Swap interested");
  if (listing.brokerAssistRequired) badges.push("Broker assist");
  return <div className="badge-row">{badges.map((badge) => <span className="status-badge neutral" key={badge}>{badge}</span>)}</div>;
}

export function MarketplaceLanding({ listingType = "all" }) {
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [title, subtitle] = PAGE_COPY[listingType] || PAGE_COPY.all;

  useEffect(() => {
    document.title = `${APP_NAME} - ${title.replace("RentasHub ", "")}`;
    let active = true;
    try {
      const filters = createEmptySearchFilters({ listingType });
      Promise.resolve(assetAdapter.list(window.localStorage))
        .then((loaded) => {
          if (active) setListings(searchAssetListings(loaded, filters));
        })
        .catch((err) => {
          if (active) setError(err.message || "Marketplace listings need a refresh. Please try again.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    } catch {
      setError("Marketplace listings need a refresh. Please try again.");
      setLoading(false);
    }
    return () => {
      active = false;
    };
  }, [listingType, title]);

  if (loading) return <main className="page center-page">Loading RentasHub marketplace...</main>;
  if (error) return <main className="page center-page"><section className="panel narrow">{error}</section></main>;

  return (
    <main className="page dashboard-grid marketplace-page">
      <section className="hero-panel wide">
        <p className="eyebrow">{APP_NAME}</p>
        <h1>{title}</h1>
        <p>{APP_TAGLINE}</p>
        <p>{subtitle}</p>
      </section>
      <section className="panel wide"><ExchangeNav /></section>
      <section className="panel wide">
        <div className="section-heading"><span>{listings.length} marketplace listing{listings.length === 1 ? "" : "s"}</span><Button variant="secondary" onClick={() => navigate("/search")}>Open full search</Button></div>
        {listings.length === 0 ? <div className="empty-state"><strong>No listings yet</strong><p>Try another marketplace type or return later.</p></div> : (
          <div className="asset-list">
            {listings.map((listing) => (
              <article className="asset-card" key={listing.id}>
                <div>
                  <ListingTypeBadges listing={listing} />
                  <h3>{listing.title}</h3>
                  <p>{listing.location} / {listing.subcategory}</p>
                  <p>{listing.description}</p>
                </div>
                <div className="card-actions">
                  <Button onClick={() => navigate(`/asset/${listing.id}`)}>View</Button>
                  <Button variant="secondary" onClick={() => navigate(`/listing/${listing.id}/offer`)}>Make offer</Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export function WantedPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  useEffect(() => {
    document.title = `${APP_NAME} - Wanted Requests`;
    setRequests(loadWantedRequests(window.localStorage));
  }, []);
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel wide">
        <p className="eyebrow">{APP_NAME}</p>
        <h1>RentasHub Wanted Requests</h1>
        <p>Post asset, equipment, vehicle, or property wanted requests. No financing, legal agreement, or transaction processing is built here.</p>
      </section>
      <section className="panel wide"><ExchangeNav /></section>
      <WantedRequestForm onCreated={() => setRequests(loadWantedRequests(window.localStorage))} user={user} />
      <section className="panel wide">
        <div className="section-heading"><span>Open wanted requests</span></div>
        {requests.length === 0 ? <div className="empty-state"><strong>No wanted requests yet</strong><p>Customer requests will appear here after submission.</p></div> : (
          <div className="asset-list">
            {requests.map((request) => <article className="asset-card" key={request.requestId}><div><span className="status-badge neutral">{request.urgency}</span><h3>{request.requestTitle}</h3><p>{request.category} / {request.location} / {request.budgetRange}</p><p>{request.description}</p></div></article>)}
          </div>
        )}
      </section>
    </main>
  );
}

function WantedRequestForm({ user, onCreated }) {
  const [form, setForm] = useState({ requestTitle: "", category: ASSET_CATEGORIES[0].id, description: "", budgetRange: "", location: "", urgency: "flexible" });
  const [errors, setErrors] = useState({});
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const submit = (event) => {
    event.preventDefault();
    const result = createWantedRequest(window.localStorage, { user, input: form });
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setForm({ requestTitle: "", category: ASSET_CATEGORIES[0].id, description: "", budgetRange: "", location: "", urgency: "flexible" });
    onCreated?.();
  };
  return (
    <form className="panel wide form-grid" onSubmit={submit}>
      <div className="section-heading form-span"><span>Create wanted request</span></div>
      {!user ? <p className="field-error form-span">Sign in as a customer to post a wanted request.</p> : null}
      {Object.values(errors).map((error) => <p className="field-error form-span" key={error}>{error}</p>)}
      <label>Request title<input value={form.requestTitle} onChange={(event) => setField("requestTitle", event.target.value)} /></label>
      <label>Category<select value={form.category} onChange={(event) => setField("category", event.target.value)}>{ASSET_CATEGORIES.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label>
      <label>Budget range<input value={form.budgetRange} onChange={(event) => setField("budgetRange", event.target.value)} placeholder="Example: JMD 500000 - 900000" /></label>
      <label>Location<input value={form.location} onChange={(event) => setField("location", event.target.value)} /></label>
      <label>Urgency<select value={form.urgency} onChange={(event) => setField("urgency", event.target.value)}><option value="flexible">Flexible</option><option value="soon">Soon</option><option value="urgent">Urgent</option></select></label>
      <label className="form-span">Description<textarea value={form.description} onChange={(event) => setField("description", event.target.value)} /></label>
      <div className="form-actions"><Button type="submit">Post wanted request</Button></div>
    </form>
  );
}

export function TradeRequestPage() {
  const { id } = useParams();
  return (
    <main className="page center-page">
      <section className="panel narrow">
        <p className="eyebrow">{APP_NAME}</p>
        <h1>Trade request</h1>
        <p>Trade request {id} is tracked locally in the offer system. Trade valuation, legal agreements, financing, and inspections for trades are future modules.</p>
      </section>
    </main>
  );
}
