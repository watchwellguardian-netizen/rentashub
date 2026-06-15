import { useMemo, useState } from "react";
import { Link, NavLink, useParams } from "react-router-dom";
import { BadgeCheck, Landmark, ShieldCheck, UserPlus } from "lucide-react";
import Button from "../components/Button.jsx";
import { getAuctionById } from "../lib/auctionService.js";
import {
  FINANCING_PARISHES,
  FINANCING_PRODUCT_TYPES,
  getApprovedFinancingPartners,
  getAuctionFinancingSummary,
  getFinancingMarketplaceDashboard,
  getFinancingProductsForPartner,
  loadFinancingPartners,
  registerFinancingPartner,
  requestAuctionFinancingPrequalification,
  updateFinancingPartnerStatus,
  updateFinancingRequestStatus,
} from "../lib/financingMarketplaceService.js";
import { useAuth } from "../state/AuthContext.jsx";

function Currency({ value }) {
  return <>JMD {Number(value || 0).toLocaleString()}</>;
}

function Status({ children, tone = "neutral" }) {
  return <span className={`status-badge ${tone}`}>{children}</span>;
}

const FINANCING_NAV = [
  { to: "/financing", label: "Partners" },
  { to: "/financing/products", label: "Products" },
  { to: "/financing/register", label: "Register" },
  { to: "/financing/dashboard", label: "Dashboard" },
  { to: "/financing/referrals", label: "Referrals" },
  { to: "/financing/payouts", label: "Payouts" },
];

function NavStrip() {
  return <div className="navrail admin-nav">{FINANCING_NAV.map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => `navitem ${isActive ? "active" : ""}`}>{item.label}</NavLink>)}</div>;
}

function PartnerCard({ partner, action }) {
  const products = getFinancingProductsForPartner(window.localStorage, partner.partnerId);
  return (
    <article className="asset-card">
      <div>
        <div className="badge-row">
          <Status>{partner.status.replaceAll("_", " ")}</Status>
          <Status>{partner.productTypes.join(", ").replaceAll("_", " ")}</Status>
        </div>
        <h3>{partner.companyName}</h3>
        <p>{partner.contactName} / {partner.parishesServed.join(", ")}</p>
        <p>Referral range: <strong><Currency value={partner.minimumAmount} /> - <Currency value={partner.maximumAmount} /></strong></p>
        <p className="muted">{partner.indicativeRateLabel}</p>
        {products.length ? <p className="muted">Products: {products.map((product) => product.productName).join(", ")}</p> : null}
      </div>
      {action}
    </article>
  );
}

export function FinancingDirectoryPage() {
  const [productType, setProductType] = useState("");
  const [parish, setParish] = useState("");
  const partners = getApprovedFinancingPartners(window.localStorage, { productType, parish });
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel wide">
        <p className="eyebrow">RentasHub Financing Marketplace</p>
        <h1>Compare provider-ready financing partners for auction assets</h1>
        <p>Browse approved local/demo financing partners and product placeholders. No lending, credit decision, banking API, KYC sharing, payment, or loan approval is active.</p>
        <div className="card-actions"><Link className="button" to="/financing/register">Register partner</Link><Link className="button secondary" to="/auctions">Browse auctions</Link></div>
      </section>
      <section className="panel wide"><NavStrip /></section>
      <section className="panel wide form-grid">
        <label>Product type<select value={productType} onChange={(event) => setProductType(event.target.value)}><option value="">All</option>{FINANCING_PRODUCT_TYPES.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label>
        <label>Parish<select value={parish} onChange={(event) => setParish(event.target.value)}><option value="">All</option>{FINANCING_PARISHES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      </section>
      <section className="panel wide"><div className="asset-list">{partners.length ? partners.map((partner) => <PartnerCard key={partner.partnerId} partner={partner} />) : <div className="empty-state"><strong>No approved financing partners match those filters</strong><p>Try another product type or parish.</p></div>}</div></section>
    </main>
  );
}

export function FinancingProductsPage() {
  const partners = getApprovedFinancingPartners(window.localStorage);
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel wide"><p className="eyebrow">Financing product catalog</p><h1>Provider-ready product placeholders</h1><p>Products show referral ranges and eligibility summaries only. RentasHub does not originate loans or approve credit.</p></section>
      <section className="panel wide"><NavStrip /></section>
      <section className="panel wide"><div className="asset-list">{partners.map((partner) => <PartnerCard key={partner.partnerId} partner={partner} />)}</div></section>
    </main>
  );
}

export function FinancingRegistrationPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ companyName: "", contactName: "", productTypes: ["equipment_finance"], parishesServed: ["Kingston"], minimumAmount: "", maximumAmount: "", indicativeRateLabel: "", documentRequirements: "", availability: "Business-day review placeholder" });
  const [errors, setErrors] = useState({});
  const [created, setCreated] = useState(null);
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const submit = (event) => {
    event.preventDefault();
    const result = registerFinancingPartner(window.localStorage, user, { ...form, documentRequirements: form.documentRequirements.split(",").map((item) => item.trim()).filter(Boolean) });
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setCreated(result.partner);
  };
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel wide"><p className="eyebrow">Financing partner registration</p><h1>Create a financing partner profile</h1><p>Profiles are submitted for local admin review. Real lending licence, KYC sharing, credit bureau, banking API, or loan approval verification is not active.</p></section>
      <section className="panel wide"><NavStrip /></section>
      <form className="panel wide form-grid" onSubmit={submit}>
        {Object.values(errors).map((error) => <p className="field-error form-span" key={error}>{error}</p>)}
        {created ? <p className="success-text form-span">{created.companyName} submitted for admin review.</p> : null}
        <label>Company name<input value={form.companyName} onChange={(event) => setField("companyName", event.target.value)} /></label>
        <label>Contact name<input value={form.contactName} onChange={(event) => setField("contactName", event.target.value)} /></label>
        <label>Product type<select value={form.productTypes[0]} onChange={(event) => setField("productTypes", [event.target.value])}>{FINANCING_PRODUCT_TYPES.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label>
        <label>Parish served<select value={form.parishesServed[0]} onChange={(event) => setField("parishesServed", [event.target.value])}>{FINANCING_PARISHES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>Minimum amount<input type="number" value={form.minimumAmount} onChange={(event) => setField("minimumAmount", event.target.value)} /></label>
        <label>Maximum amount<input type="number" value={form.maximumAmount} onChange={(event) => setField("maximumAmount", event.target.value)} /></label>
        <label className="form-span">Document requirements<input value={form.documentRequirements} onChange={(event) => setField("documentRequirements", event.target.value)} placeholder="Upload-ready document names only" /></label>
        <label className="form-span">Indicative label<input value={form.indicativeRateLabel} onChange={(event) => setField("indicativeRateLabel", event.target.value)} placeholder="Indicative only - no live credit decision" /></label>
        <div className="form-actions"><Button type="submit"><UserPlus size={18} aria-hidden="true" /> Submit partner</Button></div>
      </form>
    </main>
  );
}

export function AuctionFinancingRequestPage() {
  const { auctionId } = useParams();
  const { user } = useAuth();
  const auction = getAuctionById(window.localStorage, auctionId);
  const matchingPartners = getApprovedFinancingPartners(window.localStorage, { parish: auction?.parish });
  const partners = matchingPartners.length ? matchingPartners : getApprovedFinancingPartners(window.localStorage);
  const [form, setForm] = useState({ partnerId: partners[0]?.partnerId || "", productType: partners[0]?.productTypes[0] || "asset_purchase", requestedAmount: auction?.currentBid || auction?.reservePrice || "", buyerType: "individual", useOfAsset: "", notes: "" });
  const [errors, setErrors] = useState({});
  const [created, setCreated] = useState(null);
  if (!auction) return <main className="page center-page"><section className="panel narrow"><h1>Auction not found</h1></section></main>;
  const submit = (event) => {
    event.preventDefault();
    const result = requestAuctionFinancingPrequalification(window.localStorage, user, auction.id, form);
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setCreated(result.request);
  };
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel wide"><p className="eyebrow">Auction financing referral</p><h1>{auction.title}</h1><p>Request a provider-ready prequalification referral placeholder. No real lending, credit pull, banking API, KYC sharing, payment, or loan approval is active.</p></section>
      <section className="panel wide"><div className="asset-list">{partners.map((partner) => <PartnerCard key={partner.partnerId} partner={partner} />)}</div></section>
      <form className="panel wide form-grid" onSubmit={submit}>
        {!user ? <p className="field-error form-span">Sign in before requesting financing referral.</p> : null}
        {Object.values(errors).map((error) => <p className="field-error form-span" key={error}>{error}</p>)}
        {created ? <p className="success-text form-span">Financing referral placeholder requested. No credit decision or loan approval occurred.</p> : null}
        <label>Partner<select value={form.partnerId} onChange={(event) => setForm((current) => ({ ...current, partnerId: event.target.value }))}>{partners.map((partner) => <option key={partner.partnerId} value={partner.partnerId}>{partner.companyName}</option>)}</select></label>
        <label>Product type<select value={form.productType} onChange={(event) => setForm((current) => ({ ...current, productType: event.target.value }))}>{FINANCING_PRODUCT_TYPES.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label>
        <label>Requested amount<input type="number" value={form.requestedAmount} onChange={(event) => setForm((current) => ({ ...current, requestedAmount: event.target.value }))} /></label>
        <label>Buyer type<select value={form.buyerType} onChange={(event) => setForm((current) => ({ ...current, buyerType: event.target.value }))}><option value="individual">Individual</option><option value="business">Business</option><option value="broker">Broker-assisted buyer</option></select></label>
        <label className="form-span">Use of asset<textarea value={form.useOfAsset} onChange={(event) => setForm((current) => ({ ...current, useOfAsset: event.target.value }))} placeholder="Business, personal, resale, rental fleet, construction, transport, agriculture" /></label>
        <label className="form-span">Referral notes<textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Budget, timing, deposit available, documents ready, questions for partner" /></label>
        <div className="form-actions"><Button type="submit">Request prequalification placeholder</Button><Link className="button secondary" to={`/auction/${auction.id}`}>Return to auction</Link></div>
      </form>
    </main>
  );
}

export function FinancingDashboardPage({ view = "dashboard" }) {
  const { user } = useAuth();
  const data = useMemo(() => getFinancingMarketplaceDashboard(window.localStorage, user), [user]);
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel wide"><p className="eyebrow">Financing marketplace</p><h1>Financing partner workspace</h1><p>Manage local/demo partner profiles, products, referral placeholders, and payout readiness. No real lending, credit decision, KYC data sharing, payment, or loan approval is active.</p></section>
      <section className="panel wide"><NavStrip /></section>
      <section className="panel wide"><div className="metric-grid"><div><strong>{data.partners.length}</strong><span>Partner profiles</span></div><div><strong>{data.products.length}</strong><span>Products</span></div><div><strong>{data.requests.length}</strong><span>Referral records</span></div><div><strong>0</strong><span>Loan approvals</span></div></div></section>
      <section className="panel wide">{view === "referrals" ? <FinancingReferrals data={data} user={user} /> : view === "payouts" ? <div className="empty-state"><strong>Financing payouts are placeholders</strong><p>No commission payout, bank transfer, card charge, escrow, or settlement is active.</p></div> : <div className="asset-list">{data.partners.length ? data.partners.map((partner) => <PartnerCard key={partner.partnerId} partner={partner} />) : <div className="empty-state"><strong>No financing partner profile yet</strong><p>Register a partner profile and wait for local admin approval.</p></div>}</div>}</section>
    </main>
  );
}

function FinancingReferrals({ data, user }) {
  const [message, setMessage] = useState("");
  const update = (requestId, status) => {
    const result = updateFinancingRequestStatus(window.localStorage, user, requestId, status);
    setMessage(result.valid ? `Financing referral moved to ${status.replaceAll("_", " ")}.` : result.error);
  };
  return <div>{message ? <p className="success-text">{message}</p> : null}<div className="asset-list">{data.requests.length ? data.requests.map((request) => <article className="asset-card" key={request.requestId}><div><Status>{request.status.replaceAll("_", " ")}</Status><h3>{request.partnerName}</h3><p>Requested: <Currency value={request.requestedAmount} /> / {request.productType.replaceAll("_", " ")}</p><p>{request.useOfAsset}</p><p className="muted">{request.referralDisclosure}</p></div><div className="card-actions"><Button onClick={() => update(request.requestId, "partner_review_placeholder")}>Under review</Button><Button variant="secondary" onClick={() => update(request.requestId, "documents_requested_placeholder")}>Request docs</Button><Button variant="ghost" onClick={() => update(request.requestId, "referred_placeholder")}>Referral placeholder</Button></div></article>) : <div className="empty-state"><strong>No financing referrals</strong></div>}</div></div>;
}

export function AdminFinancingPartnersPage() {
  const { user } = useAuth();
  const [partners, setPartners] = useState(() => loadFinancingPartners(window.localStorage));
  const [message, setMessage] = useState("");
  const update = (partnerId, status) => {
    const result = updateFinancingPartnerStatus(window.localStorage, user, partnerId, status);
    setMessage(result.valid ? `Financing partner moved to ${status.replaceAll("_", " ")}.` : result.error);
    setPartners(loadFinancingPartners(window.localStorage));
  };
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel wide"><p className="eyebrow">Admin financing marketplace</p><h1>Financing partner review</h1><p>Approve, reject, suspend, and review partner credential placeholders. No real lending licence, KYC, credit, or banking adjudication is active.</p></section>
      <section className="panel wide">{message ? <p className="success-text">{message}</p> : null}<div className="asset-list">{partners.map((partner) => <PartnerCard key={partner.partnerId} partner={partner} action={<div className="card-actions"><Button onClick={() => update(partner.partnerId, "approved")}><ShieldCheck size={18} aria-hidden="true" /> Approve</Button><Button variant="secondary" onClick={() => update(partner.partnerId, "suspended")}>Suspend</Button><Button variant="ghost" onClick={() => update(partner.partnerId, "rejected")}>Reject</Button></div>} />)}</div></section>
    </main>
  );
}

export function AuctionFinancingBadge({ auctionId }) {
  const summary = getAuctionFinancingSummary(window.localStorage, auctionId);
  return <span className={`status-badge ${summary.active ? "success" : "neutral"}`}><BadgeCheck size={14} aria-hidden="true" /> {summary.badge}</span>;
}
