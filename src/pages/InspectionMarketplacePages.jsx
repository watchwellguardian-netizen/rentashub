import { useMemo, useState } from "react";
import { Link, NavLink, useParams } from "react-router-dom";
import { BadgeCheck, ClipboardCheck, FileText, ShieldCheck, UserPlus } from "lucide-react";
import Button from "../components/Button.jsx";
import { getAuctionById } from "../lib/auctionService.js";
import {
  INSPECTION_PARISHES,
  INSPECTION_SERVICE_CATEGORIES,
  getApprovedInspectors,
  getAuctionInspectionSummary,
  getInspectionMarketplaceDashboard,
  loadInspectorProfiles,
  registerInspectorProfile,
  requestAuctionInspection,
  updateInspectionRequestStatus,
  updateInspectorStatus,
  uploadInspectionReportPlaceholder,
} from "../lib/inspectionMarketplaceService.js";
import { useAuth } from "../state/AuthContext.jsx";

function Currency({ value }) {
  return <>JMD {Number(value || 0).toLocaleString()}</>;
}

function Status({ children }) {
  return <span className="status-badge neutral">{children}</span>;
}

function InspectorCard({ profile, action }) {
  return (
    <article className="asset-card">
      <div>
        <div className="badge-row">
          <Status>{profile.status.replaceAll("_", " ")}</Status>
          <Status>{profile.serviceCategories.join(", ").replaceAll("_", " ")}</Status>
        </div>
        <h3>{profile.companyName}</h3>
        <p>{profile.individualName} / {profile.parishesServed.join(", ")}</p>
        <p>Base rate: <strong><Currency value={profile.baseRate} /></strong> / Availability: {profile.availability}</p>
        <p className="muted">Certifications: {profile.certifications.join(", ") || "Upload-ready placeholder"}</p>
      </div>
      {action}
    </article>
  );
}

const INSPECTOR_NAV = [
  { to: "/inspectors", label: "Directory" },
  { to: "/inspectors/register", label: "Register" },
  { to: "/inspectors/dashboard", label: "Dashboard" },
  { to: "/inspectors/bookings", label: "Bookings" },
  { to: "/inspectors/reports", label: "Reports" },
  { to: "/inspectors/payouts", label: "Payouts" },
];

function NavStrip() {
  return <div className="navrail admin-nav">{INSPECTOR_NAV.map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => `navitem ${isActive ? "active" : ""}`}>{item.label}</NavLink>)}</div>;
}

export function InspectorsDirectoryPage() {
  const [category, setCategory] = useState("");
  const [parish, setParish] = useState("");
  const inspectors = getApprovedInspectors(window.localStorage, { category, parish });
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel wide">
        <p className="eyebrow">RentasHub Inspection Marketplace</p>
        <h1>Find certified inspection providers before you bid, buy, or list</h1>
        <p>Browse approved local/demo inspectors for vehicles, heavy equipment, tools, commercial inventory, marine assets, and auction lots. No live provider dispatch or payment is active.</p>
        <div className="card-actions"><Link className="button" to="/inspectors/register">Register as inspector</Link><Link className="button secondary" to="/auctions">Browse auctions</Link></div>
      </section>
      <section className="panel wide"><NavStrip /></section>
      <section className="panel wide form-grid">
        <label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All</option>{INSPECTION_SERVICE_CATEGORIES.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label>
        <label>Parish<select value={parish} onChange={(event) => setParish(event.target.value)}><option value="">All</option>{INSPECTION_PARISHES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      </section>
      <section className="panel wide"><div className="asset-list">{inspectors.length ? inspectors.map((profile) => <InspectorCard key={profile.inspectorId} profile={profile} />) : <div className="empty-state"><strong>No approved inspectors match those filters</strong><p>Try another category or parish.</p></div>}</div></section>
    </main>
  );
}

export function InspectorRegistrationPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ companyName: "", individualName: "", certifications: "", insuranceDocuments: "", serviceCategories: ["vehicles"], parishesServed: ["Kingston"], baseRate: "", rushRate: "", availability: "By appointment" });
  const [errors, setErrors] = useState({});
  const [created, setCreated] = useState(null);
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const submit = (event) => {
    event.preventDefault();
    const result = registerInspectorProfile(window.localStorage, user, {
      ...form,
      certifications: form.certifications.split(",").map((item) => item.trim()).filter(Boolean),
      insuranceDocuments: form.insuranceDocuments.split(",").map((item) => item.trim()).filter(Boolean),
    });
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setCreated(result.profile);
  };
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel wide"><p className="eyebrow">Inspector registration</p><h1>Create an inspection provider profile</h1><p>Profiles are submitted for local admin approval. Real credential, insurance, or licensing verification is not active.</p></section>
      <section className="panel wide"><NavStrip /></section>
      <form className="panel wide form-grid" onSubmit={submit}>
        {Object.values(errors).map((error) => <p className="field-error form-span" key={error}>{error}</p>)}
        {created ? <p className="success-text form-span">{created.companyName} submitted for admin review.</p> : null}
        <label>Company name<input value={form.companyName} onChange={(event) => setField("companyName", event.target.value)} /></label>
        <label>Individual inspector name<input value={form.individualName} onChange={(event) => setField("individualName", event.target.value)} /></label>
        <label>Certifications<input value={form.certifications} onChange={(event) => setField("certifications", event.target.value)} placeholder="VIN verification, condition scoring" /></label>
        <label>Insurance documents<input value={form.insuranceDocuments} onChange={(event) => setField("insuranceDocuments", event.target.value)} placeholder="Upload-ready document names" /></label>
        <label>Service category<select value={form.serviceCategories[0]} onChange={(event) => setField("serviceCategories", [event.target.value])}>{INSPECTION_SERVICE_CATEGORIES.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label>
        <label>Parish served<select value={form.parishesServed[0]} onChange={(event) => setField("parishesServed", [event.target.value])}>{INSPECTION_PARISHES.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>Base rate<input type="number" value={form.baseRate} onChange={(event) => setField("baseRate", event.target.value)} /></label>
        <label>Rush rate<input type="number" value={form.rushRate} onChange={(event) => setField("rushRate", event.target.value)} /></label>
        <label className="form-span">Availability<input value={form.availability} onChange={(event) => setField("availability", event.target.value)} /></label>
        <div className="form-actions"><Button type="submit"><UserPlus size={18} aria-hidden="true" /> Submit profile</Button></div>
      </form>
    </main>
  );
}

export function AuctionInspectionRequestPage() {
  const { auctionId } = useParams();
  const { user } = useAuth();
  const auction = getAuctionById(window.localStorage, auctionId);
  const inspectors = getApprovedInspectors(window.localStorage, { parish: auction?.parish });
  const fallbackInspectors = inspectors.length ? inspectors : getApprovedInspectors(window.localStorage);
  const [form, setForm] = useState({ inspectorId: fallbackInspectors[0]?.inspectorId || "", requestNotes: "", scheduledDate: "", requestType: "buyer_requested" });
  const [errors, setErrors] = useState({});
  const [created, setCreated] = useState(null);
  if (!auction) return <main className="page center-page"><section className="panel narrow"><h1>Auction not found</h1></section></main>;
  const submit = (event) => {
    event.preventDefault();
    const result = requestAuctionInspection(window.localStorage, user, auction.id, form);
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setCreated(result.request);
  };
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel wide"><p className="eyebrow">Request auction inspection</p><h1>{auction.title}</h1><p>Select an approved inspection provider, request a quote, and create an inspection workflow record. No real dispatch or payment is active.</p></section>
      <section className="panel wide"><div className="asset-list">{fallbackInspectors.map((profile) => <InspectorCard key={profile.inspectorId} profile={profile} />)}</div></section>
      <form className="panel wide form-grid" onSubmit={submit}>
        {!user ? <p className="field-error form-span">Sign in before requesting an inspection.</p> : null}
        {Object.values(errors).map((error) => <p className="field-error form-span" key={error}>{error}</p>)}
        {created ? <p className="success-text form-span">Inspection quote requested. Track it from inspector bookings and dashboard previews.</p> : null}
        <label>Inspector<select value={form.inspectorId} onChange={(event) => setForm((current) => ({ ...current, inspectorId: event.target.value }))}>{fallbackInspectors.map((profile) => <option key={profile.inspectorId} value={profile.inspectorId}>{profile.companyName}</option>)}</select></label>
        <label>Preferred date<input type="date" value={form.scheduledDate} onChange={(event) => setForm((current) => ({ ...current, scheduledDate: event.target.value }))} /></label>
        <label className="form-span">Inspection notes<textarea value={form.requestNotes} onChange={(event) => setForm((current) => ({ ...current, requestNotes: event.target.value }))} placeholder="VIN/chassis/serial checks, damage concerns, photo requirements" /></label>
        <div className="form-actions"><Button type="submit">Request quote</Button><Link className="button secondary" to={`/auction/${auction.id}`}>Return to auction</Link></div>
      </form>
    </main>
  );
}

export function InspectorsDashboardPage({ view = "dashboard" }) {
  const { user } = useAuth();
  const data = useMemo(() => getInspectionMarketplaceDashboard(window.localStorage, user), [user]);
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel wide"><p className="eyebrow">Inspection marketplace</p><h1>Inspector workspace</h1><p>Manage local/demo inspection profiles, bookings, structured reports, and payout placeholders. No live dispatch, insurance adjudication, or payment transfer is active.</p></section>
      <section className="panel wide"><NavStrip /></section>
      <section className="panel wide">
        <div className="metric-grid">
          <div><strong>{data.profiles.length}</strong><span>Profiles</span></div>
          <div><strong>{data.requests.length}</strong><span>Bookings/requests</span></div>
          <div><strong>{data.reports.length}</strong><span>Reports</span></div>
          <div><strong>0</strong><span>Live payouts</span></div>
        </div>
      </section>
      <section className="panel wide">{view === "bookings" ? <InspectionBookings data={data} user={user} /> : view === "reports" ? <InspectionReports data={data} user={user} /> : view === "payouts" ? <div className="empty-state"><strong>Inspection payouts are placeholders</strong><p>No bank transfer, card charge, escrow, or settlement is active.</p></div> : <InspectionDashboardSummary data={data} />}</section>
    </main>
  );
}

function InspectionDashboardSummary({ data }) {
  return <div className="asset-list">{data.profiles.length ? data.profiles.map((profile) => <InspectorCard key={profile.inspectorId} profile={profile} />) : <div className="empty-state"><strong>No inspector profile yet</strong><p>Register a provider profile and wait for local admin approval.</p></div>}</div>;
}

function InspectionBookings({ data, user }) {
  const [message, setMessage] = useState("");
  const markBooked = (requestId) => {
    const result = updateInspectionRequestStatus(window.localStorage, user, requestId, "booked");
    setMessage(result.valid ? "Inspection booking marked booked locally." : result.error);
  };
  return <div>{message ? <p className="success-text">{message}</p> : null}<div className="asset-list">{data.requests.length ? data.requests.map((request) => <article className="asset-card" key={request.requestId}><div><Status>{request.status.replaceAll("_", " ")}</Status><h3>{request.inspectorName}</h3><p>{request.requestNotes}</p><p>Quote: <Currency value={request.quoteAmount} /></p></div><Button onClick={() => markBooked(request.requestId)}>Mark booked</Button></article>) : <div className="empty-state"><strong>No inspection bookings</strong></div>}</div></div>;
}

function InspectionReports({ data, user }) {
  const [message, setMessage] = useState("");
  const upload = (requestId) => {
    const result = uploadInspectionReportPlaceholder(window.localStorage, user, requestId, { conditionScore: "82/100", damageNotes: "Minor wear recorded in local placeholder report.", repairEstimateRange: "JMD 45,000 - 70,000", inspectorSignature: user?.full_name || "Inspector" });
    setMessage(result.valid ? "Structured inspection report placeholder uploaded." : Object.values(result.errors || {}).join(" "));
  };
  return <div>{message ? <p className="success-text">{message}</p> : null}<div className="asset-list">{data.requests.length ? data.requests.map((request) => <article className="asset-card" key={request.requestId}><div><Status>{request.badgeStatus.replaceAll("_", " ")}</Status><h3>{request.inspectorName}</h3><p>Report ID: {request.reportId || "not uploaded"}</p></div><Button onClick={() => upload(request.requestId)}><FileText size={18} aria-hidden="true" /> Upload report placeholder</Button></article>) : <div className="empty-state"><strong>No report-ready bookings</strong></div>}</div></div>;
}

export function AdminInspectorsPage() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState(() => loadInspectorProfiles(window.localStorage));
  const [message, setMessage] = useState("");
  const update = (inspectorId, status) => {
    const result = updateInspectorStatus(window.localStorage, user, inspectorId, status);
    setMessage(result.valid ? `Inspector moved to ${status.replaceAll("_", " ")}.` : result.error);
    setProfiles(loadInspectorProfiles(window.localStorage));
  };
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel wide"><p className="eyebrow">Admin inspection marketplace</p><h1>Inspector approval and compliance review</h1><p>Approve, reject, suspend, and review credential placeholders. No real licensing, insurance, or legal adjudication is active.</p></section>
      <section className="panel wide">{message ? <p className="success-text">{message}</p> : null}<div className="asset-list">{profiles.map((profile) => <InspectorCard key={profile.inspectorId} profile={profile} action={<div className="card-actions"><Button onClick={() => update(profile.inspectorId, "approved")}><ShieldCheck size={18} aria-hidden="true" /> Approve</Button><Button variant="secondary" onClick={() => update(profile.inspectorId, "suspended")}>Suspend</Button><Button variant="ghost" onClick={() => update(profile.inspectorId, "rejected")}>Reject</Button></div>} />)}</div></section>
    </main>
  );
}

export function AuctionInspectionBadge({ auctionId }) {
  const summary = getAuctionInspectionSummary(window.localStorage, auctionId);
  return <span className={`status-badge ${summary.verifiedCondition ? "success" : "neutral"}`}><BadgeCheck size={14} aria-hidden="true" /> {summary.badge}</span>;
}
