import { useMemo, useState } from "react";
import { Link, NavLink, useParams } from "react-router-dom";
import { MapPin, ShieldCheck, Truck, UserPlus } from "lucide-react";
import Button from "../components/Button.jsx";
import { getAuctionById } from "../lib/auctionService.js";
import {
  TRANSPORT_PARISHES,
  TRANSPORT_SERVICE_TYPES,
  getApprovedTransportProviders,
  getAuctionTransportSummary,
  getTransportMarketplaceDashboard,
  loadTransportProviders,
  registerTransportProvider,
  requestAuctionTransportQuote,
  updateTransportProviderStatus,
  updateTransportRequestStatus,
} from "../lib/transportMarketplaceService.js";
import { useAuth } from "../state/AuthContext.jsx";

function Currency({ value }) {
  return <>JMD {Number(value || 0).toLocaleString()}</>;
}

function Status({ children, tone = "neutral" }) {
  return <span className={`status-badge ${tone}`}>{children}</span>;
}

const TRANSPORT_NAV = [
  { to: "/transport", label: "Directory" },
  { to: "/transport/register", label: "Register" },
  { to: "/transport/dashboard", label: "Dashboard" },
  { to: "/transport/bookings", label: "Bookings" },
  { to: "/transport/quotes", label: "Quotes" },
  { to: "/transport/payouts", label: "Payouts" },
];

function NavStrip() {
  return <div className="navrail admin-nav">{TRANSPORT_NAV.map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => `navitem ${isActive ? "active" : ""}`}>{item.label}</NavLink>)}</div>;
}

function ProviderCard({ provider, action }) {
  return (
    <article className="asset-card">
      <div>
        <div className="badge-row">
          <Status>{provider.status.replaceAll("_", " ")}</Status>
          <Status>{provider.serviceTypes.join(", ").replaceAll("_", " ")}</Status>
        </div>
        <h3>{provider.companyName}</h3>
        <p>{provider.contactName} / {provider.parishesServed.join(", ")}</p>
        <p>Base transport rate: <strong><Currency value={provider.baseRate} /></strong></p>
        <p className="muted">{provider.fleetSummary}</p>
      </div>
      {action}
    </article>
  );
}

export function TransportDirectoryPage() {
  const [serviceType, setServiceType] = useState("");
  const [parish, setParish] = useState("");
  const providers = getApprovedTransportProviders(window.localStorage, { serviceType, parish });
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel wide">
        <p className="eyebrow">RentasHub Transport Marketplace</p>
        <h1>Find tow, flatbed, heavy haul, and delivery providers for auction assets</h1>
        <p>Browse approved local/demo transport providers. No live dispatch, GPS tracking, payment, insurance verification, or carrier compliance activation is active.</p>
        <div className="card-actions"><Link className="button" to="/transport/register">Register provider</Link><Link className="button secondary" to="/auctions">Browse auctions</Link></div>
      </section>
      <section className="panel wide"><NavStrip /></section>
      <section className="panel wide form-grid">
        <label>Service type<select value={serviceType} onChange={(event) => setServiceType(event.target.value)}><option value="">All</option>{TRANSPORT_SERVICE_TYPES.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label>
        <label>Parish<select value={parish} onChange={(event) => setParish(event.target.value)}><option value="">All</option>{TRANSPORT_PARISHES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      </section>
      <section className="panel wide"><div className="asset-list">{providers.length ? providers.map((provider) => <ProviderCard key={provider.providerId} provider={provider} />) : <div className="empty-state"><strong>No approved providers match those filters</strong><p>Try another route, service, or parish.</p></div>}</div></section>
    </main>
  );
}

export function TransportRegistrationPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ companyName: "", contactName: "", serviceTypes: ["flatbed"], parishesServed: ["Kingston"], fleetSummary: "", baseRate: "", insuranceDocuments: "", availability: "By appointment" });
  const [errors, setErrors] = useState({});
  const [created, setCreated] = useState(null);
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const submit = (event) => {
    event.preventDefault();
    const result = registerTransportProvider(window.localStorage, user, { ...form, insuranceDocuments: form.insuranceDocuments.split(",").map((item) => item.trim()).filter(Boolean) });
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setCreated(result.provider);
  };
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel wide"><p className="eyebrow">Transport provider registration</p><h1>Create a transport provider profile</h1><p>Profiles are submitted for local admin review. Real insurance, licence, GPS, or dispatch verification is not active.</p></section>
      <section className="panel wide"><NavStrip /></section>
      <form className="panel wide form-grid" onSubmit={submit}>
        {Object.values(errors).map((error) => <p className="field-error form-span" key={error}>{error}</p>)}
        {created ? <p className="success-text form-span">{created.companyName} submitted for admin review.</p> : null}
        <label>Company name<input value={form.companyName} onChange={(event) => setField("companyName", event.target.value)} /></label>
        <label>Contact name<input value={form.contactName} onChange={(event) => setField("contactName", event.target.value)} /></label>
        <label>Service type<select value={form.serviceTypes[0]} onChange={(event) => setField("serviceTypes", [event.target.value])}>{TRANSPORT_SERVICE_TYPES.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label>
        <label>Parish served<select value={form.parishesServed[0]} onChange={(event) => setField("parishesServed", [event.target.value])}>{TRANSPORT_PARISHES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>Base rate<input type="number" value={form.baseRate} onChange={(event) => setField("baseRate", event.target.value)} /></label>
        <label>Insurance documents<input value={form.insuranceDocuments} onChange={(event) => setField("insuranceDocuments", event.target.value)} placeholder="Upload-ready document names" /></label>
        <label className="form-span">Fleet summary<textarea value={form.fleetSummary} onChange={(event) => setField("fleetSummary", event.target.value)} placeholder="Trucks, trailers, tow capacity, equipment haulage notes" /></label>
        <label className="form-span">Availability<input value={form.availability} onChange={(event) => setField("availability", event.target.value)} /></label>
        <div className="form-actions"><Button type="submit"><UserPlus size={18} aria-hidden="true" /> Submit provider</Button></div>
      </form>
    </main>
  );
}

export function AuctionTransportRequestPage() {
  const { auctionId } = useParams();
  const { user } = useAuth();
  const auction = getAuctionById(window.localStorage, auctionId);
  const matchingProviders = getApprovedTransportProviders(window.localStorage, { parish: auction?.parish });
  const providers = matchingProviders.length ? matchingProviders : getApprovedTransportProviders(window.localStorage);
  const [form, setForm] = useState({ providerId: providers[0]?.providerId || "", pickupLocation: auction?.location || "", deliveryLocation: "", requestedDate: "", transportNotes: "" });
  const [errors, setErrors] = useState({});
  const [created, setCreated] = useState(null);
  if (!auction) return <main className="page center-page"><section className="panel narrow"><h1>Auction not found</h1></section></main>;
  const submit = (event) => {
    event.preventDefault();
    const result = requestAuctionTransportQuote(window.localStorage, user, auction.id, form);
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setCreated(result.request);
  };
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel wide"><p className="eyebrow">Request auction transport</p><h1>{auction.title}</h1><p>Select an approved provider, request a quote, and track a placeholder booking lifecycle. No real dispatch, GPS, payment, or insurance verification is active.</p></section>
      <section className="panel wide"><div className="asset-list">{providers.map((provider) => <ProviderCard key={provider.providerId} provider={provider} />)}</div></section>
      <form className="panel wide form-grid" onSubmit={submit}>
        {!user ? <p className="field-error form-span">Sign in before requesting transport.</p> : null}
        {Object.values(errors).map((error) => <p className="field-error form-span" key={error}>{error}</p>)}
        {created ? <p className="success-text form-span">Transport quote requested. Track it from transport bookings and dashboard previews.</p> : null}
        <label>Provider<select value={form.providerId} onChange={(event) => setForm((current) => ({ ...current, providerId: event.target.value }))}>{providers.map((provider) => <option key={provider.providerId} value={provider.providerId}>{provider.companyName}</option>)}</select></label>
        <label>Requested date<input type="date" value={form.requestedDate} onChange={(event) => setForm((current) => ({ ...current, requestedDate: event.target.value }))} /></label>
        <label>Pickup location<input value={form.pickupLocation} onChange={(event) => setForm((current) => ({ ...current, pickupLocation: event.target.value }))} /></label>
        <label>Delivery location<input value={form.deliveryLocation} onChange={(event) => setForm((current) => ({ ...current, deliveryLocation: event.target.value }))} /></label>
        <label className="form-span">Transport notes<textarea value={form.transportNotes} onChange={(event) => setForm((current) => ({ ...current, transportNotes: event.target.value }))} placeholder="Weight, dimensions, access, loading equipment, delivery restrictions" /></label>
        <div className="form-actions"><Button type="submit">Request quote</Button><Link className="button secondary" to={`/auction/${auction.id}`}>Return to auction</Link></div>
      </form>
    </main>
  );
}

export function TransportDashboardPage({ view = "dashboard" }) {
  const { user } = useAuth();
  const data = useMemo(() => getTransportMarketplaceDashboard(window.localStorage, user), [user]);
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel wide"><p className="eyebrow">Transport marketplace</p><h1>Transport provider workspace</h1><p>Manage local/demo transport profiles, quote requests, placeholder bookings, and payout readiness. No live dispatch, GPS, payment, or insurance verification is active.</p></section>
      <section className="panel wide"><NavStrip /></section>
      <section className="panel wide"><div className="metric-grid"><div><strong>{data.providers.length}</strong><span>Profiles</span></div><div><strong>{data.requests.length}</strong><span>Quote/booking records</span></div><div><strong>0</strong><span>Live dispatches</span></div><div><strong>0</strong><span>Live payouts</span></div></div></section>
      <section className="panel wide">{view === "bookings" || view === "quotes" ? <TransportBookings data={data} user={user} /> : view === "payouts" ? <div className="empty-state"><strong>Transport payouts are placeholders</strong><p>No bank transfer, card charge, escrow, or carrier settlement is active.</p></div> : <div className="asset-list">{data.providers.length ? data.providers.map((provider) => <ProviderCard key={provider.providerId} provider={provider} />) : <div className="empty-state"><strong>No transport profile yet</strong><p>Register a provider profile and wait for local admin approval.</p></div>}</div>}</section>
    </main>
  );
}

function TransportBookings({ data, user }) {
  const [message, setMessage] = useState("");
  const update = (requestId, status) => {
    const result = updateTransportRequestStatus(window.localStorage, user, requestId, status);
    setMessage(result.valid ? `Transport request moved to ${status.replaceAll("_", " ")}.` : result.error);
  };
  return <div>{message ? <p className="success-text">{message}</p> : null}<div className="asset-list">{data.requests.length ? data.requests.map((request) => <article className="asset-card" key={request.requestId}><div><Status>{request.status.replaceAll("_", " ")}</Status><h3>{request.providerName}</h3><p>{request.pickupLocation} to {request.deliveryLocation}</p><p>{request.transportNotes}</p><p>Quote: <Currency value={request.quoteAmount} /></p></div><div className="card-actions"><Button onClick={() => update(request.requestId, "quote_sent")}>Quote sent</Button><Button variant="secondary" onClick={() => update(request.requestId, "booked_placeholder")}>Book placeholder</Button><Button variant="ghost" onClick={() => update(request.requestId, "delivered_placeholder")}>Delivered placeholder</Button></div></article>) : <div className="empty-state"><strong>No transport requests</strong></div>}</div></div>;
}

export function AdminTransportProvidersPage() {
  const { user } = useAuth();
  const [providers, setProviders] = useState(() => loadTransportProviders(window.localStorage));
  const [message, setMessage] = useState("");
  const update = (providerId, status) => {
    const result = updateTransportProviderStatus(window.localStorage, user, providerId, status);
    setMessage(result.valid ? `Transport provider moved to ${status.replaceAll("_", " ")}.` : result.error);
    setProviders(loadTransportProviders(window.localStorage));
  };
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel wide"><p className="eyebrow">Admin transport marketplace</p><h1>Transport provider review</h1><p>Approve, reject, suspend, and review carrier credential placeholders. No real insurance, licence, dispatch, or safety adjudication is active.</p></section>
      <section className="panel wide">{message ? <p className="success-text">{message}</p> : null}<div className="asset-list">{providers.map((provider) => <ProviderCard key={provider.providerId} provider={provider} action={<div className="card-actions"><Button onClick={() => update(provider.providerId, "approved")}><ShieldCheck size={18} aria-hidden="true" /> Approve</Button><Button variant="secondary" onClick={() => update(provider.providerId, "suspended")}>Suspend</Button><Button variant="ghost" onClick={() => update(provider.providerId, "rejected")}>Reject</Button></div>} />)}</div></section>
    </main>
  );
}

export function AuctionTransportBadge({ auctionId }) {
  const summary = getAuctionTransportSummary(window.localStorage, auctionId);
  return <span className={`status-badge ${summary.booked ? "success" : "neutral"}`}><Truck size={14} aria-hidden="true" /> {summary.badge}</span>;
}
