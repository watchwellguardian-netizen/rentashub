import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate, useParams } from "react-router-dom";
import { BadgeCheck, Car, Gavel, Landmark, ShieldAlert, Truck } from "lucide-react";
import Button from "../components/Button.jsx";
import { APP_NAME } from "../lib/brand.js";
import {
  AUCTION_CATEGORIES,
  AUCTION_PARISHES,
  AUCTION_DOCUMENT_TYPES,
  AUCTION_NOTIFICATION_EVENTS,
  AUCTION_PAYMENT_STATUSES,
  AUCTION_ESCROW_STATUSES,
  AUCTION_DISPUTE_STATUSES,
  AUCTION_ROUTE_GROUPS,
  AUCTION_STATUSES,
  AUCTION_TYPES,
  adminUpdateAuctionStatus,
  calculateAuctionKpis,
  createAuctionListing,
  createAuctionDispute,
  generateAuctionDocumentPlaceholder,
  filterAuctions,
  getAuctionById,
  getAuctionDashboard,
  getAuctionOperationalWorkflow,
  getBidderVerification,
  getVisibleBidHistory,
  loadAuctionAudit,
  loadAuctionEscrowLedger,
  loadAuctionListings,
  loadAuctionDisputes,
  placeAuctionBid,
  queueAuctionNotificationEvent,
  toggleAuctionWatchlist,
  updateAuctionComplianceStep,
  updateAuctionDisputeStatus,
  updateAuctionPaymentWorkflow,
} from "../lib/auctionService.js";
import { normalizeRole, roleLabel } from "../lib/rbac.js";
import { useAuth } from "../state/AuthContext.jsx";
import { AuctionInspectionBadge } from "./InspectionMarketplacePages.jsx";
import { AuctionTransportBadge } from "./TransportMarketplacePages.jsx";
import { AuctionFinancingBadge } from "./FinancingMarketplacePages.jsx";

const AUCTION_NAV = [
  { to: "/auctions", label: "All Auctions" },
  { to: "/auctions/live", label: "Live" },
  { to: "/auctions/upcoming", label: "Upcoming" },
  { to: "/auctions/ending-soon", label: "Ending Soon" },
  { to: "/auction-calendar", label: "Calendar" },
  { to: "/auction-rules", label: "Rules" },
];

const BUYER_NAV = [
  { to: "/dashboard/auctions", label: "Auction Dashboard" },
  { to: "/dashboard/auction-watchlist", label: "Watchlist" },
  { to: "/dashboard/my-bids", label: "My Bids" },
  { to: "/dashboard/won-auctions", label: "Won Auctions" },
  { to: "/dashboard/auction-payments", label: "Payments" },
  { to: "/dashboard/auction-escrow", label: "Escrow" },
  { to: "/dashboard/title-transfer", label: "Title Transfer" },
  { to: "/dashboard/auction-disputes", label: "Disputes" },
];

const SELLER_NAV = [
  { to: "/supplier/auctions", label: "Auction Dashboard" },
  { to: "/supplier/auction-listings", label: "Listings" },
  { to: "/supplier/create-auction", label: "Create Auction" },
  { to: "/supplier/bulk-auction-upload", label: "Bulk Upload" },
  { to: "/supplier/repossession-workflow", label: "Repossession" },
  { to: "/supplier/notice-of-sale", label: "Notice of Sale" },
  { to: "/supplier/proceeds-waterfall", label: "Proceeds" },
  { to: "/supplier/auction-analytics", label: "Analytics" },
  { to: "/supplier/auction-documents", label: "Documents" },
  { to: "/supplier/auction-payouts", label: "Payouts" },
];

const DEALER_NAV = [
  { to: "/dealer/auction-dashboard", label: "Dealer Dashboard" },
  { to: "/dealer/bulk-bidding", label: "Bulk Bidding" },
  { to: "/dealer/fleet-purchases", label: "Fleet Purchases" },
  { to: "/dealer/dealer-only-auctions", label: "Dealer Lanes" },
  { to: "/dealer/market-intelligence", label: "Market Intel" },
  { to: "/dealer/auction-analytics", label: "Analytics" },
];

const ADMIN_AUCTION_NAV = [
  { to: "/admin/auctions", label: "Auctions" },
  { to: "/admin/auction-approvals", label: "Approvals" },
  { to: "/admin/auction-compliance", label: "Compliance" },
  { to: "/admin/kyc-review", label: "KYC" },
  { to: "/admin/fraud-alerts", label: "Fraud" },
  { to: "/admin/bid-ledger", label: "Bid Ledger" },
  { to: "/admin/auction-analytics", label: "Analytics" },
  { to: "/admin/auction-documents", label: "Documents" },
  { to: "/admin/auction-disputes", label: "Disputes" },
  { to: "/admin/gct-reports", label: "GCT" },
  { to: "/admin/government-auctions", label: "Government" },
  { to: "/admin/court-sales", label: "Court Sales" },
  { to: "/admin/customs-auctions", label: "Customs" },
  { to: "/admin/auction-settings", label: "Settings" },
];

function NavStrip({ items }) {
  return <div className="navrail admin-nav">{items.map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => `navitem ${isActive ? "active" : ""}`}>{item.label}</NavLink>)}</div>;
}

function StatusBadge({ children, tone = "neutral" }) {
  return <span className={`status-badge ${tone}`}>{children}</span>;
}

function Currency({ value }) {
  return <>JMD {Number(value || 0).toLocaleString()}</>;
}

function AuctionCard({ auction }) {
  const reserveMet = Number(auction.reservePrice || 0) === 0 || Number(auction.currentBid || 0) >= Number(auction.reservePrice || 0);
  return (
    <article className="asset-card">
      <div>
        <div className="badge-row">
          <StatusBadge>{auction.lotNumber}</StatusBadge>
          <StatusBadge tone={auction.status === "live" ? "success" : "neutral"}>{auction.status.replaceAll("_", " ")}</StatusBadge>
          {auction.repossessed ? <StatusBadge tone="warning">Repossessed</StatusBadge> : null}
          {auction.governmentLot ? <StatusBadge tone="warning">Government/customs ready</StatusBadge> : null}
          {auction.asIsWhereIs ? <StatusBadge>AS IS WHERE IS</StatusBadge> : null}
        </div>
        <h3>{auction.title}</h3>
        <p>{auction.category.replaceAll("-", " ")} / {auction.parish} / {auction.sellerType}</p>
        <p>Current bid: <strong><Currency value={auction.currentBid || auction.startingBid} /></strong> / Reserve {reserveMet ? "met or not required" : "not met"}</p>
      </div>
      <div className="card-actions">
        <Link className="button" to={`/auction/${auction.id}`}>View lot</Link>
        <Link className="button secondary" to={`/auction/${auction.id}/bid`}>Bid</Link>
      </div>
    </article>
  );
}

export function AuctionsLanding({ mode = "all" }) {
  const filters = mode === "live" ? { status: "live" } : mode === "upcoming" ? { status: "upcoming" } : mode === "ending-soon" ? { endingSoon: true } : {};
  const auctions = filterAuctions(window.localStorage, filters);
  const kpis = calculateAuctionKpis(window.localStorage);
  useEffect(() => {
    document.title = `${APP_NAME} Auctions`;
  }, []);
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel wide">
        <p className="eyebrow">RentasHub Auctions</p>
        <h1>Jamaica's asset recovery, disposal, and auction marketplace</h1>
        <p>Timed, sealed-bid, reserve, repossessed, and private seller auction workflows for movable assets only. Land, houses, buildings, and immovable property are excluded.</p>
        <div className="card-actions">
          <Link className="button" to="/auctions/live">View live auctions</Link>
          <Link className="button secondary" to="/supplier/create-auction">Create auction</Link>
        </div>
      </section>
      <section className="panel wide"><NavStrip items={AUCTION_NAV} /></section>
      <section className="panel wide">
        <div className="metric-grid">
          <div><strong>{kpis.active}</strong><span>Active</span></div>
          <div><strong>{kpis.upcoming}</strong><span>Upcoming</span></div>
          <div><strong>{kpis.bids}</strong><span>Bids stored</span></div>
          <div><strong>{kpis.watchers}</strong><span>Watchers</span></div>
          <div><strong>{kpis.sellThroughRate}%</strong><span>Sell-through</span></div>
          <div><strong><Currency value={kpis.gmv} /></strong><span>Local/demo GMV</span></div>
        </div>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>{auctions.length} auction lot{auctions.length === 1 ? "" : "s"}</span></div>
        <div className="asset-list">{auctions.length ? auctions.map((auction) => <AuctionCard key={auction.id} auction={auction} />) : <div className="empty-state"><strong>No auction lots found</strong><p>Try another status, category, or parish.</p></div>}</div>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>Supported auction categories</span></div>
        <div className="category-grid">{AUCTION_CATEGORIES.map((category) => <Link key={category.id} className="category-card" to={`/auctions/category/${category.id}`}><Car aria-hidden="true" /><strong>{category.label}</strong><span>Movable assets only</span></Link>)}</div>
      </section>
    </main>
  );
}

export function AuctionCategoryPage() {
  const { category } = useParams();
  const auctions = filterAuctions(window.localStorage, { category });
  const label = AUCTION_CATEGORIES.find((item) => item.id === category)?.label || "Auction Category";
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel wide"><p className="eyebrow">RentasHub Auctions</p><h1>{label}</h1><p>Browse auction lots in this movable-asset category. Real estate auctions are intentionally not supported.</p></section>
      <section className="panel wide"><NavStrip items={AUCTION_NAV} /></section>
      <section className="panel wide"><div className="asset-list">{auctions.length ? auctions.map((auction) => <AuctionCard key={auction.id} auction={auction} />) : <div className="empty-state"><strong>No lots yet</strong><p>This category is ready for seller-submitted auction lots.</p></div>}</div></section>
    </main>
  );
}

export function AuctionParishPage() {
  const { parish } = useParams();
  const auctions = filterAuctions(window.localStorage, { parish });
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel wide"><p className="eyebrow">RentasHub Auctions</p><h1>Auction lots in {parish.replaceAll("-", " ")}</h1><p>Filter auction lots by parish for inspection, collection, and transport planning.</p></section>
      <section className="panel wide"><div className="asset-list">{auctions.length ? auctions.map((auction) => <AuctionCard key={auction.id} auction={auction} />) : <div className="empty-state"><strong>No parish lots yet</strong></div>}</div></section>
    </main>
  );
}

export function AuctionDetail() {
  const { auctionId } = useParams();
  const { user } = useAuth();
  const [auction, setAuction] = useState(() => getAuctionById(window.localStorage, auctionId));
  const [message, setMessage] = useState("");
  const bids = getVisibleBidHistory(window.localStorage, auctionId);
  const workflow = getAuctionOperationalWorkflow(window.localStorage, auctionId);
  if (!auction) return <main className="page center-page"><section className="panel narrow"><h1>Auction not found</h1><p>This auction lot may have been removed or suspended.</p></section></main>;
  const watch = () => {
    const result = toggleAuctionWatchlist(window.localStorage, user, auction.id);
    setMessage(result.valid ? (result.watching ? "Auction added to watchlist." : "Auction removed from watchlist.") : result.error);
    setAuction(getAuctionById(window.localStorage, auctionId));
  };
  return (
    <main className="page dashboard-grid auction-detail">
      <section className="hero-panel wide">
        <p className="eyebrow">{auction.lotNumber}</p>
        <h1>{auction.title}</h1>
        <p>{auction.location} / {auction.sellerType} / {auction.auctionType.replaceAll("_", " ")}</p>
        <div className="badge-row">
          <StatusBadge tone={auction.status === "live" ? "success" : "neutral"}>{auction.status.replaceAll("_", " ")}</StatusBadge>
          <StatusBadge>AS IS WHERE IS</StatusBadge>
          {auction.repossessed ? <StatusBadge tone="warning">Repossessed asset</StatusBadge> : null}
          {auction.governmentLot ? <StatusBadge tone="warning">Government lot readiness</StatusBadge> : null}
          <AuctionInspectionBadge auctionId={auction.id} />
          <AuctionTransportBadge auctionId={auction.id} />
          <AuctionFinancingBadge auctionId={auction.id} />
        </div>
      </section>
      <section className="panel">
        <div className="section-heading"><span><Gavel size={18} aria-hidden="true" /> Bidding</span></div>
        <div className="profile-grid">
          <div><span>Current bid</span><strong><Currency value={auction.currentBid || auction.startingBid} /></strong></div>
          <div><span>Starting bid</span><strong><Currency value={auction.startingBid} /></strong></div>
          <div><span>Reserve</span><strong>{Number(auction.reservePrice || 0) ? <Currency value={auction.reservePrice} /> : "No reserve"}</strong></div>
          <div><span>Minimum increment</span><strong><Currency value={auction.minimumIncrement} /></strong></div>
          <div><span>Deposit</span><strong><Currency value={auction.depositRequired} /></strong></div>
          <div><span>Buyer premium</span><strong>{auction.buyerPremiumPercent}% simulated</strong></div>
        </div>
        <div className="card-actions">
          <Link className="button" to={`/auction/${auction.id}/bid`}>Place bid</Link>
          <Button variant="secondary" onClick={watch}>Watch auction</Button>
          <Link className="button secondary" to={`/auction/${auction.id}/documents`}>Documents</Link>
          <Link className="button secondary" to={`/auction/${auction.id}/document-engine`}>Document engine</Link>
          <Link className="button secondary" to={`/auction/${auction.id}/escrow-ledger`}>Escrow ledger</Link>
          <Link className="button secondary" to={`/auction/${auction.id}/notification-audit`}>Event audit</Link>
          <Link className="button secondary" to={`/auction/${auction.id}/dispute`}>Open dispute</Link>
        </div>
        {message ? <p className="muted">{message}</p> : null}
      </section>
      <section className="panel">
        <div className="section-heading"><span><ShieldAlert size={18} aria-hidden="true" /> Legal disclosures</span></div>
        <p>{auction.legalDisclosure}</p>
        <p className="muted">{auction.titleDisclosure}</p>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>Inspection, transport, and financing</span></div>
        <div className="action-grid">
          <Link className="action-card" to={`/auction/${auction.id}/inspection`}><BadgeCheck /><strong>Request inspection</strong><span>Choose an approved inspector, request a quote, and add an inspection badge/report placeholder.</span></Link>
          <Link className="action-card" to={`/auction/${auction.id}/transport`}><Truck /><strong>Arrange transport</strong><span>Request tow, flatbed, heavy haul, or delivery quote placeholders from approved providers.</span></Link>
          <Link className="action-card" to={`/auction/${auction.id}/financing`}><Landmark /><strong>Check financing</strong><span>Request provider-ready prequalification referral placeholders. No real lending or credit decision is active.</span></Link>
        </div>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>Operational readiness</span></div>
        <div className="profile-grid">
          <div><span>Lifecycle</span><strong>{auction.assetLifecycleState.replaceAll("_", " ")}</strong></div>
          <div><span>Payment</span><strong>{workflow.paymentStatus.replaceAll("_", " ")}</strong></div>
          <div><span>Escrow</span><strong>{workflow.escrowStatus.replaceAll("_", " ")}</strong></div>
          <div><span>Compliance steps</span><strong>{workflow.complianceChecklist.filter((item) => item.status === "complete").length}/{workflow.complianceChecklist.length}</strong></div>
          <div><span>Documents</span><strong>{workflow.documentPlaceholders.length} placeholders</strong></div>
          <div><span>Notifications</span><strong>{workflow.notificationEventQueue.length} events</strong></div>
        </div>
        <p className="muted">PDF generation, live payment, legal escrow, title transfer, email, SMS, push, and live socket updates remain inactive provider interfaces.</p>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>Bid history</span></div>
        <div className="asset-list">{bids.length ? bids.map((bid) => <article className="asset-card" key={bid.bidId}><div><span className="status-badge neutral">{bid.bidType}</span><h3>{bid.status}</h3><p>{bid.bidType === "sealed" ? "Sealed bid hidden until close" : <Currency value={bid.amount} />} / {bid.createdAt}</p></div></article>) : <div className="empty-state"><strong>No bids yet</strong></div>}</div>
      </section>
    </main>
  );
}

export function AuctionDocumentLibraryPage() {
  const { auctionId } = useParams();
  const { user } = useAuth();
  const [workflow, setWorkflow] = useState(() => getAuctionOperationalWorkflow(window.localStorage, auctionId));
  const [message, setMessage] = useState("");
  if (!workflow) return <main className="page center-page"><section className="panel narrow"><h1>Auction not found</h1></section></main>;
  const generate = (type) => {
    const result = generateAuctionDocumentPlaceholder(window.localStorage, user, auctionId, type);
    setMessage(result.valid ? `${type.replaceAll("_", " ")} placeholder generated.` : result.error);
    setWorkflow(getAuctionOperationalWorkflow(window.localStorage, auctionId));
  };
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel wide"><p className="eyebrow">Auction documents</p><h1>{workflow.auction.title}</h1><p>Buyer invoice, seller proceeds statement, escrow statement, GCT invoice, deficiency notice, sale confirmation, bill of sale, and Notice of Sale placeholders. No legal PDF is generated.</p></section>
      <section className="panel wide">{message ? <p className="success-text">{message}</p> : null}<div className="asset-list">{workflow.documentPlaceholders.map((doc) => <article className="asset-card" key={doc.documentId}><div><span className="status-badge neutral">{doc.status}</span><h3>{doc.type.replaceAll("_", " ")}</h3><p>{doc.note}</p><p>Generated: {doc.generated ? "yes" : "no"} / Download ready: {doc.downloadReady ? "yes" : "no"}</p></div><Button onClick={() => generate(doc.type)}>Generate placeholder</Button></article>)}</div></section>
    </main>
  );
}

export function AuctionNotificationAuditPage() {
  const { auctionId } = useParams();
  const { user } = useAuth();
  const [workflow, setWorkflow] = useState(() => getAuctionOperationalWorkflow(window.localStorage, auctionId));
  const [message, setMessage] = useState("");
  if (!workflow) return <main className="page center-page"><section className="panel narrow"><h1>Auction not found</h1></section></main>;
  const queue = (eventType) => {
    const result = queueAuctionNotificationEvent(window.localStorage, user, auctionId, eventType, workflow.auction.highBidderId || "review-customer");
    setMessage(result.valid ? `${eventType.replaceAll("_", " ")} queued locally.` : result.error);
    setWorkflow(getAuctionOperationalWorkflow(window.localStorage, auctionId));
  };
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel wide"><p className="eyebrow">Auction event audit</p><h1>{workflow.auction.title}</h1><p>Notification event framework is local/in-app only. Email, SMS, push, and live socket delivery are inactive provider interfaces.</p></section>
      <section className="panel wide">{message ? <p className="success-text">{message}</p> : null}<div className="asset-list">{workflow.notificationEventQueue.map((event) => <article className="asset-card" key={event.eventId}><div><span className="status-badge neutral">{event.status}</span><h3>{event.eventType.replaceAll("_", " ")}</h3><p>{event.channels.join(", ")}</p><p>{event.note}</p></div><Button variant="secondary" onClick={() => queue(event.eventType)}>Queue again</Button></article>)}</div></section>
    </main>
  );
}

export function AuctionEscrowLedgerPage() {
  const { auctionId } = useParams();
  const { user } = useAuth();
  const [workflow, setWorkflow] = useState(() => getAuctionOperationalWorkflow(window.localStorage, auctionId));
  const [message, setMessage] = useState("");
  if (!workflow) return <main className="page center-page"><section className="panel narrow"><h1>Auction not found</h1></section></main>;
  const record = () => {
    const result = updateAuctionPaymentWorkflow(window.localStorage, user, auctionId, { paymentStatus: "escrow_held_simulated", escrowStatus: "escrow_held_simulated", amount: workflow.auction.depositRequired, note: "Buyer journey recorded simulated deposit/escrow hold." });
    setMessage(result.valid ? "Simulated escrow ledger record added." : result.error);
    setWorkflow(getAuctionOperationalWorkflow(window.localStorage, auctionId));
  };
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel wide"><p className="eyebrow">Auction escrow ledger</p><h1>{workflow.auction.title}</h1><p>Escrow ledger is simulated only. No money is held, released, refunded, charged back, or paid out.</p></section>
      <section className="panel wide"><div className="profile-grid"><div><span>Payment status</span><strong>{workflow.paymentStatus.replaceAll("_", " ")}</strong></div><div><span>Escrow status</span><strong>{workflow.escrowStatus.replaceAll("_", " ")}</strong></div><div><span>Records</span><strong>{workflow.escrowLedger.length}</strong></div></div><div className="card-actions"><Button onClick={record}>Record simulated escrow hold</Button></div>{message ? <p className="success-text">{message}</p> : null}</section>
      <section className="panel wide"><div className="asset-list">{workflow.escrowLedger.length ? workflow.escrowLedger.map((entry) => <article className="asset-card" key={entry.id}><div><h3>{entry.type}</h3><p>{entry.status} / <Currency value={entry.amount} /> / {entry.createdAt}</p><p>{entry.note}</p></div></article>) : <div className="empty-state"><strong>No escrow records yet</strong><p>Use the simulated action to create a local ledger entry.</p></div>}</div></section>
    </main>
  );
}

export function AuctionDisputePage() {
  const { auctionId } = useParams();
  const { user } = useAuth();
  const [form, setForm] = useState({ reason: "", description: "" });
  const [errors, setErrors] = useState({});
  const [workflow, setWorkflow] = useState(() => getAuctionOperationalWorkflow(window.localStorage, auctionId));
  if (!workflow) return <main className="page center-page"><section className="panel narrow"><h1>Auction not found</h1></section></main>;
  const submit = (event) => {
    event.preventDefault();
    const result = createAuctionDispute(window.localStorage, user, auctionId, form);
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setForm({ reason: "", description: "" });
    setWorkflow(getAuctionOperationalWorkflow(window.localStorage, auctionId));
  };
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel wide"><p className="eyebrow">Auction dispute</p><h1>{workflow.auction.title}</h1><p>Open a controlled auction dispute. No legal mediation, arbitration, refund, payout, escrow release, or binding decision occurs.</p></section>
      <form className="panel wide form-grid" onSubmit={submit}>
        <div className="section-heading form-span"><span>Open dispute</span></div>
        {Object.values(errors).map((error) => <p className="field-error form-span" key={error}>{error}</p>)}
        <label>Reason<input value={form.reason} onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))} /></label>
        <label className="form-span">Description<textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></label>
        <div className="form-actions"><Button type="submit">Submit dispute</Button></div>
      </form>
      <section className="panel wide"><div className="asset-list">{workflow.disputes.length ? workflow.disputes.map((dispute) => <article className="asset-card" key={dispute.disputeId}><div><span className="status-badge neutral">{dispute.status}</span><h3>{dispute.reason}</h3><p>{dispute.description}</p><p>{dispute.resolutionPlaceholder}</p></div></article>) : <div className="empty-state"><strong>No auction disputes yet</strong></div>}</div></section>
    </main>
  );
}

export function AuctionBidPage() {
  const { auctionId } = useParams();
  const { user } = useAuth();
  const [auction, setAuction] = useState(() => getAuctionById(window.localStorage, auctionId));
  const [form, setForm] = useState({ bidType: auction?.auctionType === "sealed_bid" ? "sealed" : "standard", amount: "", maxBid: "" });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");
  if (!auction) return <main className="page center-page"><section className="panel narrow"><h1>Auction not found</h1></section></main>;
  const verification = getBidderVerification(window.localStorage, user);
  const submit = (event) => {
    event.preventDefault();
    const result = placeAuctionBid(window.localStorage, user, auction.id, form);
    if (!result.valid) {
      setErrors(result.errors);
      setSuccess("");
      return;
    }
    setErrors({});
    setSuccess("Bid accepted in local/demo mode and audit logged. No real payment, escrow, or legal sale occurred.");
    setAuction(result.auction);
  };
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel wide"><p className="eyebrow">Bid on {auction.lotNumber}</p><h1>{auction.title}</h1><p>Verification tier: {verification.tier} / {verification.status}. KYC is local/demo only until Supabase/Auth and compliance activation.</p></section>
      <form className="panel wide form-grid" onSubmit={submit}>
        <div className="section-heading form-span"><span>Place auction bid</span></div>
        {Object.values(errors).map((error) => <p className="field-error form-span" key={error}>{error}</p>)}
        {success ? <p className="success-text form-span">{success}</p> : null}
        <label>Bid type<select value={form.bidType} onChange={(event) => setForm((current) => ({ ...current, bidType: event.target.value }))}><option value="standard">Standard bid</option><option value="proxy">Proxy max bid</option><option value="sealed">Sealed bid</option></select></label>
        <label>Bid amount<input type="number" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} /></label>
        <label>Proxy max bid<input type="number" value={form.maxBid} onChange={(event) => setForm((current) => ({ ...current, maxBid: event.target.value }))} /></label>
        <div className="form-actions"><Button type="submit">Submit bid</Button><Link className="button secondary" to={`/auction/${auction.id}`}>Back to lot</Link></div>
      </form>
    </main>
  );
}

export function AuctionSupportPage({ type }) {
  const { auctionId } = useParams();
  const auction = getAuctionById(window.localStorage, auctionId);
  const workflow = auction ? getAuctionOperationalWorkflow(window.localStorage, auctionId) : null;
  const copy = {
    inspection: ["Auction inspection", "Certified inspector marketplace is provider-ready. Reports, photos, VIN/chassis/serial verification, condition score, and discrepancy flags are upload-ready placeholders."],
    transport: ["Auction transport", "Transport quotes, tow/flatbed/equipment haulage, invoices, and delivery tracking are not live yet. This page provides the controlled workflow entry point."],
    financing: ["Auction financing referral", "RentasHub does not originate loans. Financing partners, pre-approval, referral webhooks, and commission tracking remain activation-ready only."],
  }[type];
  return <main className="page center-page"><section className="panel narrow"><p className="eyebrow">RentasHub Auctions</p><h1>{copy[0]}</h1><p>{auction?.title || "Auction lot"}: {copy[1]}</p>{workflow ? <p className="muted">Provider state: {workflow.connectionPoints[type]?.status.replaceAll("_", " ")}. Live provider activation is disabled.</p> : null}<Link className="button" to={auction ? `/auction/${auction.id}` : "/auctions"}>Return to auction</Link></section></main>;
}

export function AuctionStaticPage({ page }) {
  const content = {
    calendar: ["Auction calendar", "Live, upcoming, ending-soon, government/customs/court, and dealer lanes will appear here as controlled event listings."],
    rules: ["Auction rules", "Timed, sealed bid, reserve, repossessed asset, private seller, proxy bid, anti-sniping, bid retraction, and tie-break rules are documented for demo review. Seller right-to-bid and shill-bidding prevention disclosures are required before live activation."],
    legal: ["Auction legal disclosures", "AS IS WHERE IS terms, Data Protection Act consent, title/lien disclosure, GCT invoice readiness, Notice of Sale, proceeds waterfall, and court/government attachment requirements are supported as readiness workflows only."],
    how: ["How RentasHub Auctions work", "Browse lots, complete bidder verification, inspect the asset, bid, receive simulated payment instructions if you win, then complete collection, title-transfer, dispute, and escrow-readiness steps."],
  }[page];
  return <main className="page center-page"><section className="panel narrow"><p className="eyebrow">RentasHub Auctions</p><h1>{content[0]}</h1><p>{content[1]}</p><p className="muted">No real auctioneer, legal, escrow, payment, email, SMS, or push operation is active in this demo module.</p></section></main>;
}

export function BuyerAuctionPage({ view = "dashboard" }) {
  const { user } = useAuth();
  const data = getAuctionDashboard(window.localStorage, user);
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel wide"><p className="eyebrow">Buyer Auctions</p><h1>My auction workspace</h1><p>Track bids, watchlist, won auctions, simulated payment instructions, escrow readiness, title transfer, and disputes.</p></section>
      <section className="panel wide"><NavStrip items={BUYER_NAV} /></section>
      <section className="panel wide">
        <div className="metric-grid">
          <div><strong>{data.bids?.length || 0}</strong><span>My bids</span></div>
          <div><strong>{data.watchlist?.length || 0}</strong><span>Watched lots</span></div>
          <div><strong>{data.won?.length || 0}</strong><span>Won auctions</span></div>
          <div><strong>{data.escrow?.length || 0}</strong><span>Escrow records</span></div>
        </div>
      </section>
      <section className="panel wide"><AuctionWorkspaceList view={view} data={data} /></section>
    </main>
  );
}

function AuctionWorkspaceList({ view, data }) {
  if (view === "watchlist") return <div className="asset-list">{data.watchlist?.length ? data.watchlist.map((item) => <AuctionCard key={item.id} auction={item.auction} />) : <div className="empty-state"><strong>No watched auctions</strong></div>}</div>;
  if (view === "bids") return <div className="asset-list">{data.bids?.length ? data.bids.map((bid) => <article className="asset-card" key={bid.bidId}><div><h3>{bid.bidType} bid</h3><p>{bid.status} / {bid.bidType === "sealed" ? "sealed amount hidden" : <Currency value={bid.amount} />}</p></div></article>) : <div className="empty-state"><strong>No bids yet</strong></div>}</div>;
  if (view === "won") return <div className="asset-list">{data.won?.length ? data.won.map((auction) => <AuctionCard key={auction.id} auction={auction} />) : <div className="empty-state"><strong>No won auctions yet</strong></div>}</div>;
  if (["payments", "escrow", "title", "disputes"].includes(view)) return <div className="empty-state"><strong>{view.replaceAll("_", " ")} is controlled</strong><p>This workflow is simulated/readiness-only. No real funds, title transfer, legal escrow, or binding dispute resolution occurs.</p></div>;
  return <div className="asset-list">{data.auctions.slice(0, 4).map((auction) => <AuctionCard key={auction.id} auction={auction} />)}</div>;
}

export function SupplierAuctionPage({ view = "dashboard" }) {
  const { user } = useAuth();
  const data = getAuctionDashboard(window.localStorage, user);
  const kpis = calculateAuctionKpis(window.localStorage);
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel wide"><p className="eyebrow">Supplier Auctions</p><h1>RentasHub seller auction center</h1><p>Create, approve-readiness review, manage bids, track watchers, reserve gap, recovery, compliance, inspection, transport, and payout readiness.</p></section>
      <section className="panel wide"><NavStrip items={SELLER_NAV} /></section>
      {view === "create" ? <CreateAuctionForm /> : (
        <>
          <section className="panel wide"><div className="metric-grid"><div><strong>{data.auctions.length}</strong><span>Seller lots</span></div><div><strong>{data.bids.length}</strong><span>Bids received</span></div><div><strong><Currency value={kpis.reserveGap} /></strong><span>Reserve gap</span></div><div><strong>{kpis.sellThroughRate}%</strong><span>Sell-through</span></div></div></section>
          <section className="panel wide">{["bulk", "repossession", "notice", "waterfall", "analytics", "payouts"].includes(view) ? <ControlledSellerWorkflow view={view} /> : <div className="asset-list">{data.auctions.map((auction) => <AuctionCard key={auction.id} auction={auction} />)}</div>}</section>
        </>
      )}
    </main>
  );
}

function CreateAuctionForm() {
  const { user } = useAuth();
  const [form, setForm] = useState({ title: "", category: "cars", parish: "Kingston", location: "", auctionType: "timed", startingBid: "", reservePrice: "", minimumIncrement: "10000", depositRequired: "", endTime: "2026-07-01T20:00", sellerType: "Supplier / Seller", repossessed: false, governmentLot: false, customsLot: false, courtOrdered: false, titleDisclosure: "", collectionTerms: "" });
  const [errors, setErrors] = useState({});
  const [created, setCreated] = useState(null);
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const submit = (event) => {
    event.preventDefault();
    const result = createAuctionListing(window.localStorage, user, form);
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setCreated(result.auction);
  };
  return (
    <form className="panel wide form-grid" onSubmit={submit}>
      <div className="section-heading form-span"><span>Create auction listing wizard</span></div>
      <p className="muted form-span">Step 1 - Lot basics. Step 2 - Bidding terms. Step 3 - Compliance disclosures. Step 4 - Provider readiness for simulated payment, escrow, document, and notification workflows. No live auction, payment, escrow, title, or legal workflow is activated.</p>
      {Object.values(errors).map((error) => <p className="field-error form-span" key={error}>{error}</p>)}
      {created ? <p className="success-text form-span">Created {created.lotNumber}. It is pending admin approval in local/demo mode.</p> : null}
      <div className="section-heading form-span"><span>Step 1 - Lot basics</span></div>
      <label>Title<input value={form.title} onChange={(event) => setField("title", event.target.value)} /></label>
      <label>Category<select value={form.category} onChange={(event) => setField("category", event.target.value)}>{AUCTION_CATEGORIES.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}</select></label>
      <label>Parish<select value={form.parish} onChange={(event) => setField("parish", event.target.value)}>{AUCTION_PARISHES.map((parish) => <option key={parish} value={parish}>{parish}</option>)}</select></label>
      <label>Location<input value={form.location} onChange={(event) => setField("location", event.target.value)} /></label>
      <label>Seller type<input value={form.sellerType} onChange={(event) => setField("sellerType", event.target.value)} /></label>
      <div className="section-heading form-span"><span>Step 2 - Bidding terms</span></div>
      <label>Auction type<select value={form.auctionType} onChange={(event) => setField("auctionType", event.target.value)}>{AUCTION_TYPES.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select></label>
      <label>Starting bid<input type="number" value={form.startingBid} onChange={(event) => setField("startingBid", event.target.value)} /></label>
      <label>Reserve price<input type="number" value={form.reservePrice} onChange={(event) => setField("reservePrice", event.target.value)} /></label>
      <label>Minimum increment<input type="number" value={form.minimumIncrement} onChange={(event) => setField("minimumIncrement", event.target.value)} /></label>
      <label>Deposit required<input type="number" value={form.depositRequired} onChange={(event) => setField("depositRequired", event.target.value)} /></label>
      <label>End time<input type="datetime-local" value={form.endTime} onChange={(event) => setField("endTime", event.target.value)} /></label>
      <div className="section-heading form-span"><span>Step 3 - Compliance disclosures</span></div>
      <label><input type="checkbox" checked={form.repossessed} onChange={(event) => setField("repossessed", event.target.checked)} /> Repossessed asset</label>
      <label><input type="checkbox" checked={form.governmentLot} onChange={(event) => setField("governmentLot", event.target.checked)} /> Government lot readiness</label>
      <label><input type="checkbox" checked={form.customsLot} onChange={(event) => setField("customsLot", event.target.checked)} /> Customs lot readiness</label>
      <label><input type="checkbox" checked={form.courtOrdered} onChange={(event) => setField("courtOrdered", event.target.checked)} /> Court sale readiness</label>
      <label className="form-span">Title/lien disclosure<textarea value={form.titleDisclosure} onChange={(event) => setField("titleDisclosure", event.target.value)} placeholder="Seller-declared ownership, lien, and document notes" /></label>
      <label className="form-span">Collection terms<textarea value={form.collectionTerms} onChange={(event) => setField("collectionTerms", event.target.value)} placeholder="Pickup, storage, collection appointment, and release notes" /></label>
      <div className="section-heading form-span"><span>Step 4 - Provider readiness</span></div>
      <p className="muted form-span">This auction will create local placeholders for GCT invoice, Notice of Sale, sale confirmation, escrow statement, buyer invoice, seller proceeds, notifications, inspection, transport, and financing connection points.</p>
      <div className="form-actions"><Button type="submit">Create auction</Button></div>
    </form>
  );
}

function ControlledSellerWorkflow({ view }) {
  const copy = {
    bulk: "Bulk auction upload is file-storage and validation ready, but real upload processing is not active.",
    repossession: "Repossession workflow tracks Notice of Default, Notice of Repossession, 10-day Notice of Sale, proceeds waterfall, and deficiency notice readiness.",
    notice: "Notice of Sale generation is controlled/readiness-only. Legal review is required before live use.",
    waterfall: "Proceeds waterfall supports repossession/storage costs, loan balance, secured creditors, and surplus/deficiency readiness.",
    analytics: "Auction analytics track views, watchers, bid count, reserve gap, final price, recovery percentage, unsold lots, and relisting recommendations.",
    payouts: "Auction payouts are simulated only. No bank transfer, escrow disbursement, or settlement occurs.",
  }[view];
  return <div className="empty-state"><strong>Controlled auction workflow</strong><p>{copy}</p></div>;
}

export function DealerAuctionPage({ view = "dashboard" }) {
  const kpis = calculateAuctionKpis(window.localStorage);
  return <main className="page dashboard-grid"><section className="hero-panel wide"><p className="eyebrow">Dealer Auctions</p><h1>Dealer auction workspace</h1><p>Bulk bidding, fleet purchase tracking, dealer-only lanes, and market intelligence are readiness workflows for verified dealer roles.</p></section><section className="panel wide"><NavStrip items={DEALER_NAV} /></section><section className="panel wide"><div className="metric-grid"><div><strong>{kpis.bids}</strong><span>Bid signals</span></div><div><strong><Currency value={kpis.gmv} /></strong><span>Market activity</span></div><div><strong>{kpis.sellThroughRate}%</strong><span>Sell-through</span></div></div><p className="muted">{view.replaceAll("_", " ")} is a controlled dealer workflow. No live wholesale lane or subscription billing is active.</p></section></main>;
}

export function AdminAuctionPage({ view = "dashboard" }) {
  const { user } = useAuth();
  const [auctions, setAuctions] = useState(() => loadAuctionListings(window.localStorage));
  const kpis = calculateAuctionKpis(window.localStorage);
  const audit = loadAuctionAudit(window.localStorage);
  const escrow = loadAuctionEscrowLedger(window.localStorage);
  const update = (auctionId, status) => {
    adminUpdateAuctionStatus(window.localStorage, user, auctionId, status);
    setAuctions(loadAuctionListings(window.localStorage));
  };
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel wide"><p className="eyebrow">Admin Auctions</p><h1>RentasHub auction control center</h1><p>Approve, reject, pause, extend, cancel, suspend, review KYC/fraud, inspect bid ledger, GCT readiness, and government/court/customs queues.</p></section>
      <section className="panel wide"><NavStrip items={ADMIN_AUCTION_NAV} /></section>
      <section className="panel wide"><div className="metric-grid"><div><strong>{kpis.active}</strong><span>Active</span></div><div><strong>{kpis.pending}</strong><span>Pending approvals</span></div><div><strong>{kpis.suspended}</strong><span>Suspended/investigation</span></div><div><strong>{audit.length}</strong><span>Audit records</span></div><div><strong>{escrow.length}</strong><span>Escrow ledger</span></div></div></section>
      <section className="panel wide">
        <div className="section-heading"><span>{view.replaceAll("_", " ")}</span></div>
        {["bid_ledger", "gct", "settings", "kyc", "fraud", "compliance"].includes(view) ? <AdminControlledView view={view} audit={audit} escrow={escrow} /> : (
          <div className="asset-list">{auctions.map((auction) => <article className="asset-card" key={auction.id}><div><span className="status-badge neutral">{auction.status}</span><h3>{auction.title}</h3><p>{auction.lotNumber} / {auction.sellerType} / {auction.parish}</p></div><div className="card-actions"><Button onClick={() => update(auction.id, "live")}>Approve/live</Button><Button variant="secondary" onClick={() => update(auction.id, "suspended")}>Suspend</Button><Button variant="ghost" onClick={() => update(auction.id, "cancelled")}>Cancel</Button></div></article>)}</div>
        )}
      </section>
    </main>
  );
}

function AdminControlledView({ view, audit, escrow }) {
  if (view === "bid_ledger") return <div className="asset-list">{audit.length ? audit.map((entry) => <article className="asset-card" key={entry.id}><div><h3>{entry.action}</h3><p>{entry.auctionId} / {entry.actorId} / {entry.createdAt}</p></div></article>) : <div className="empty-state"><strong>No audit records yet</strong></div>}</div>;
  if (view === "gct") return <div className="asset-list">{escrow.length ? escrow.map((entry) => <article className="asset-card" key={entry.id}><div><h3>{entry.type}</h3><p>{entry.status} / <Currency value={entry.amount} /> / GCT invoice readiness only</p></div></article>) : <div className="empty-state"><strong>No GCT-ready auction ledger records yet</strong></div>}</div>;
  if (view === "disputes") return <AdminAuctionDisputeQueue />;
  if (["compliance", "kyc", "fraud", "settings"].includes(view)) return <AuctionOperationalAdminView view={view} />;
  return <div className="empty-state"><strong>Controlled admin workflow</strong><p>{view.replaceAll("_", " ")} is local/readiness-only. No live KYC, legal, government, customs, court, refund, or escrow action is performed.</p></div>;
}

function AdminAuctionDisputeQueue() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState(() => loadAuctionDisputes(window.localStorage));
  const [message, setMessage] = useState("");
  const update = (disputeId, status) => {
    const result = updateAuctionDisputeStatus(window.localStorage, user, disputeId, status);
    setMessage(result.valid ? `Dispute moved to ${status.replaceAll("_", " ")}.` : result.error);
    setDisputes(loadAuctionDisputes(window.localStorage));
  };
  return (
    <div>
      {message ? <p className="success-text">{message}</p> : null}
      <div className="asset-list">
        {disputes.length ? disputes.map((dispute) => (
          <article className="asset-card" key={dispute.disputeId}>
            <div><span className="status-badge neutral">{dispute.status}</span><h3>{dispute.reason}</h3><p>{dispute.description}</p><p>{dispute.resolutionPlaceholder}</p></div>
            <div className="card-actions">
              {AUCTION_DISPUTE_STATUSES.filter((status) => !["draft", "cancelled"].includes(status)).map((status) => <Button key={status} variant="secondary" onClick={() => update(dispute.disputeId, status)}>{status.replaceAll("_", " ")}</Button>)}
            </div>
          </article>
        )) : <div className="empty-state"><strong>No auction disputes</strong><p>Buyer/seller auction disputes will appear here after submission.</p></div>}
      </div>
    </div>
  );
}

function AuctionOperationalAdminView({ view }) {
  const { user } = useAuth();
  const [auctionId, setAuctionId] = useState("auction-excavator-001");
  const [message, setMessage] = useState("");
  const auctions = loadAuctionListings(window.localStorage);
  const workflow = getAuctionOperationalWorkflow(window.localStorage, auctionId);
  if (!workflow) return <div className="empty-state"><strong>Select an auction</strong></div>;
  const runCompliance = (step) => {
    const result = updateAuctionComplianceStep(window.localStorage, user, auctionId, step, "complete");
    setMessage(result.valid ? `${step.replaceAll("_", " ")} marked complete locally.` : result.error);
  };
  const runPayment = () => {
    const result = updateAuctionPaymentWorkflow(window.localStorage, user, auctionId, { paymentStatus: "escrow_held_simulated", escrowStatus: "escrow_held_simulated", amount: workflow.auction.depositRequired, note: "Admin recorded simulated auction escrow hold." });
    setMessage(result.valid ? "Simulated escrow/payment status recorded." : result.error);
  };
  const runDocument = (type) => {
    const result = generateAuctionDocumentPlaceholder(window.localStorage, user, auctionId, type);
    setMessage(result.valid ? `${type.replaceAll("_", " ")} placeholder generated.` : result.error);
  };
  const runNotification = (eventType) => {
    const result = queueAuctionNotificationEvent(window.localStorage, user, auctionId, eventType, workflow.auction.highBidderId || "review-customer");
    setMessage(result.valid ? `${eventType.replaceAll("_", " ")} queued locally.` : result.error);
  };

  return (
    <div>
      <div className="section-heading">
        <span>{view.replaceAll("_", " ")} workflow</span>
        <select value={auctionId} onChange={(event) => setAuctionId(event.target.value)}>
          {auctions.map((auction) => <option key={auction.id} value={auction.id}>{auction.lotNumber} - {auction.title}</option>)}
        </select>
      </div>
      {message ? <p className="success-text">{message}</p> : null}
      <div className="profile-grid">
        <div><span>Payment status</span><strong>{workflow.paymentStatus.replaceAll("_", " ")}</strong></div>
        <div><span>Escrow status</span><strong>{workflow.escrowStatus.replaceAll("_", " ")}</strong></div>
        <div><span>Documents</span><strong>{workflow.documentPlaceholders.length}</strong></div>
        <div><span>Notification events</span><strong>{workflow.notificationEventQueue.length}</strong></div>
        <div><span>Inspection</span><strong>{workflow.connectionPoints.inspection.status.replaceAll("_", " ")}</strong></div>
        <div><span>Transport</span><strong>{workflow.connectionPoints.transport.status.replaceAll("_", " ")}</strong></div>
        <div><span>Financing</span><strong>{workflow.connectionPoints.financing.status.replaceAll("_", " ")}</strong></div>
        <div><span>Realtime</span><strong>{workflow.connectionPoints.realtime.status.replaceAll("_", " ")}</strong></div>
      </div>
      {view === "compliance" || view === "kyc" ? (
        <div className="asset-list">
          {workflow.complianceChecklist.map((item) => <article className="asset-card" key={item.step}><div><span className="status-badge neutral">{item.status}</span><h3>{item.step.replaceAll("_", " ")}</h3><p>{item.evidencePlaceholder}</p></div><Button onClick={() => runCompliance(item.step)}>Mark complete</Button></article>)}
        </div>
      ) : null}
      {view === "settings" ? (
        <div className="asset-list">
          <article className="asset-card"><div><h3>Simulated escrow/payment status</h3><p>Allowed payment states: {AUCTION_PAYMENT_STATUSES.join(", ")}</p><p>Allowed escrow states: {AUCTION_ESCROW_STATUSES.join(", ")}</p></div><Button onClick={runPayment}>Record simulated escrow hold</Button></article>
          {AUCTION_DOCUMENT_TYPES.map((type) => <article className="asset-card" key={type}><div><h3>{type.replaceAll("_", " ")}</h3><p>PDF generation placeholder only. No legal document is produced.</p></div><Button variant="secondary" onClick={() => runDocument(type)}>Generate placeholder</Button></article>)}
        </div>
      ) : null}
      {view === "fraud" ? (
        <div className="asset-list">
          {AUCTION_NOTIFICATION_EVENTS.map((eventType) => <article className="asset-card" key={eventType}><div><h3>{eventType.replaceAll("_", " ")}</h3><p>Queues local event; email, SMS, push, and live sockets remain inactive provider interfaces.</p></div><Button variant="secondary" onClick={() => runNotification(eventType)}>Queue event</Button></article>)}
        </div>
      ) : null}
    </div>
  );
}
