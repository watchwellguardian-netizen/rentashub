import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../components/Button.jsx";
import { assetAdapter } from "../lib/adapters/assetAdapter.js";
import { APP_NAME } from "../lib/brand.js";
import { OFFER_TYPES, createMarketplaceOffer } from "../lib/marketplaceExchange.js";
import { useAuth } from "../state/AuthContext.jsx";

const OFFER_LABELS = {
  purchase_inquiry: "Submit purchase inquiry",
  cash_offer: "Make offer",
  trade_proposal: "Submit trade proposal",
  swap_proposal: "Submit swap proposal",
  broker_request: "Request broker assistance",
};

export default function MarketplaceOffer() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [form, setForm] = useState({ offerType: "purchase_inquiry", offerAmount: "", tradeProposal: "", swapProposal: "", brokerRequest: "" });
  const [errors, setErrors] = useState({});
  const [created, setCreated] = useState(null);

  useEffect(() => {
    document.title = `${APP_NAME} - Marketplace Offer`;
    setListing(assetAdapter.getById(window.localStorage, id));
  }, [id]);

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const submit = (event) => {
    event.preventDefault();
    const result = createMarketplaceOffer(window.localStorage, { user, listing, input: form });
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setCreated(result.offer);
  };

  if (!listing) return <main className="page center-page"><section className="panel narrow">Listing was not found.</section></main>;

  return (
    <main className="page dashboard-grid">
      <section className="hero-panel">
        <p className="eyebrow">{APP_NAME}</p>
        <h1>Marketplace offer</h1>
        <p>{listing.title}</p>
        <span className="role-pill">No financing, escrow, or legal agreement is created here.</span>
      </section>
      <form className="panel wide form-grid" onSubmit={submit}>
        <div className="section-heading form-span"><span>Offer details</span></div>
        {Object.values(errors).map((error) => <p className="field-error form-span" key={error}>{error}</p>)}
        {created ? <p className="success-text form-span">Offer {created.offerId} submitted as a local marketplace record.</p> : null}
        <label>Offer type<select value={form.offerType} onChange={(event) => setField("offerType", event.target.value)}>{OFFER_TYPES.map((type) => <option key={type} value={type}>{OFFER_LABELS[type]}</option>)}</select></label>
        <label>Offer amount<input type="number" value={form.offerAmount} onChange={(event) => setField("offerAmount", event.target.value)} placeholder="JMD amount for buy/cash offers" /></label>
        <label className="form-span">Trade proposal<textarea value={form.tradeProposal} onChange={(event) => setField("tradeProposal", event.target.value)} placeholder="Describe the asset you want to trade." /></label>
        <label className="form-span">Swap proposal<textarea value={form.swapProposal} onChange={(event) => setField("swapProposal", event.target.value)} placeholder="Describe the proposed swap or exchange." /></label>
        <label className="form-span">Broker request<textarea value={form.brokerRequest} onChange={(event) => setField("brokerRequest", event.target.value)} placeholder="Describe the broker assistance needed." /></label>
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={() => navigate(`/asset/${listing.id}`)}>Back to listing</Button>
          <Button type="submit">{OFFER_LABELS[form.offerType]}</Button>
        </div>
      </form>
    </main>
  );
}
