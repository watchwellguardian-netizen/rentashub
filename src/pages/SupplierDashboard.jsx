import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgeCheck, Bell, Bot, BriefcaseBusiness, ClipboardCheck, CreditCard, DollarSign, FilePlus2, Gavel, Inbox, Landmark, Loader2, MessageSquare, PackageCheck, SearchCheck, Settings, Wrench } from "lucide-react";
import { useAuth } from "../state/AuthContext.jsx";
import { createSupplierDashboardModel, loadStoredSupplierDashboardData } from "../lib/supplierDashboard.js";
import { calculateProfileCompleteness, getSupplierProfile } from "../lib/supplierProfile.js";
import { calculateAuctionKpis, getAuctionDashboard } from "../lib/auctionService.js";
import { getAiListingAssistantDashboard } from "../lib/aiListingAssistantEngine.js";
import { getAiValuationDashboard } from "../lib/aiValuationEngine.js";
import { roleLabel } from "../lib/rbac.js";
import Button from "../components/Button.jsx";

const actionIcons = {
  "add-asset": FilePlus2,
  "my-listings": PackageCheck,
  "rental-requests": ClipboardCheck,
  "supplier-profile": BadgeCheck,
  messages: MessageSquare,
  earnings: DollarSign,
  "ai-listing-help": Bot,
};

function Section({ icon: Icon, title, children, action }) {
  return (
    <section className="panel">
      <div className="section-heading">
        <span><Icon size={18} aria-hidden="true" /> {title}</span>
        {action}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ title, message }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}

function PreviewList({ items, emptyTitle, emptyMessage, renderItem }) {
  if (!items.length) return <EmptyState title={emptyTitle} message={emptyMessage} />;
  return <div className="preview-list">{items.slice(0, 3).map(renderItem)}</div>;
}

export default function SupplierDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = "RentasHub - Supplier Dashboard";
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        await new Promise((resolve) => setTimeout(resolve, 120));
        const stored = loadStoredSupplierDashboardData(window.localStorage);
        const profile = getSupplierProfile(window.localStorage, user.id, user);
        if (!cancelled) setData({
          ...stored,
          businessProfile: {
            ...stored.businessProfile,
            businessName: profile.businessName || stored.businessProfile.businessName,
            verificationStatus: profile.verificationStatus,
            serviceArea: profile.serviceAreas || stored.businessProfile.serviceArea,
            profileCompleteness: calculateProfileCompleteness(profile),
          },
        });
      } catch {
        if (!cancelled) setError("We could not load your supplier dashboard. Please refresh and try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const model = useMemo(() => createSupplierDashboardModel({ user, data: data || undefined, loading, error }), [data, error, loading, user]);
  const auctionModel = useMemo(() => getAuctionDashboard(window.localStorage, user), [user]);
  const auctionKpis = useMemo(() => calculateAuctionKpis(window.localStorage), []);
  const aiListingDashboard = useMemo(() => getAiListingAssistantDashboard(window.localStorage, user, "supplier"), [user]);
  const aiValuationDashboard = useMemo(() => getAiValuationDashboard(window.localStorage, user, "supplier"), [user]);

  const go = (route) => navigate(route);

  if (model.loading) {
    return <main className="page center-page"><Loader2 className="spin" aria-hidden="true" /> Loading supplier dashboard...</main>;
  }

  if (model.error) {
    return (
      <main className="page center-page">
        <section className="panel narrow">
          <h1>Supplier dashboard needs a refresh</h1>
          <p>{model.error}</p>
          <Button onClick={() => window.location.reload()}>Reload dashboard</Button>
        </section>
      </main>
    );
  }

  return (
    <main className="page dashboard-grid supplier-dashboard">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">RentasHub</p>
          <h1>RentasHub Supplier Dashboard</h1>
          <p>Welcome, {model.userName}. Manage listings, requests, approvals, messages, earnings, and maintenance reminders from one supplier workspace.</p>
        </div>
        <span className="role-pill">{roleLabel(model.role)}</span>
      </section>

      <section className="panel wide">
        <div className="section-heading"><span><BriefcaseBusiness size={18} aria-hidden="true" /> Supplier quick actions</span></div>
        <div className="action-grid supplier-actions">
          {model.actions.map((action) => {
            const Icon = actionIcons[action.id] || Settings;
            return (
              <button key={action.id} className="action-card" type="button" onClick={() => go(action.route)}>
                <Icon size={22} aria-hidden="true" />
                <strong>{action.label}</strong>
                <span>{action.description}</span>
              </button>
            );
          })}
        </div>
      </section>

      <Section icon={BadgeCheck} title="Business profile">
        <div className="profile-grid">
          <div><span>Business</span><strong>{model.businessProfile.businessName}</strong></div>
          <div><span>Verification</span><strong>{model.businessProfile.verificationStatus}</strong></div>
          <div><span>Service area</span><strong>{model.businessProfile.serviceArea}</strong></div>
          <div><span>Profile completeness</span><strong>{model.businessProfile.profileCompleteness || 0}%</strong></div>
          <div><span>Response target</span><strong>{model.businessProfile.responseTarget}</strong></div>
        </div>
      </Section>

      <Section icon={PackageCheck} title="Asset listing summary" action={<button className="link-button" onClick={() => go("/my-listings")}>View listings</button>}>
        <div className="metric-grid">
          <div><strong>{model.listingSummary.active}</strong><span>Active</span></div>
          <div><strong>{model.listingSummary.pending}</strong><span>Pending</span></div>
          <div><strong>{model.listingSummary.paused}</strong><span>Paused</span></div>
          <div><strong>{model.listingSummary.draft}</strong><span>Draft</span></div>
        </div>
        {model.emptyStates.listings ? <EmptyState title="No listings yet" message="Add your first asset when the listing module opens." /> : null}
      </Section>

      <Section icon={Gavel} title="Auction listings" action={<button className="link-button" onClick={() => go("/supplier/auctions")}>Open auctions</button>}>
        <div className="metric-grid">
          <div><strong>{auctionModel.auctions.length}</strong><span>Seller auction lots</span></div>
          <div><strong>{auctionKpis.active}</strong><span>Active marketplace lots</span></div>
          <div><strong>{auctionKpis.bids}</strong><span>Bids received</span></div>
          <div><strong>JMD {auctionKpis.reserveGap.toLocaleString()}</strong><span>Reserve gap</span></div>
        </div>
        <div className="card-actions">
          <Button onClick={() => go("/supplier/create-auction")}>Create auction</Button>
          <Button variant="secondary" onClick={() => go("/supplier/auction-listings")}>View auction listings</Button>
          <Button variant="secondary" onClick={() => go("/supplier/auction-analytics")}>Auction analytics</Button>
          <Button variant="secondary" onClick={() => go("/supplier/auction-documents")}>Auction documents</Button>
          <Button variant="secondary" onClick={() => go("/inspectors/dashboard")}>Inspection workspace</Button>
          <Button variant="secondary" onClick={() => go("/transport/dashboard")}>Transport workspace</Button>
          <Button variant="secondary" onClick={() => go("/financing/dashboard")}><Landmark size={18} aria-hidden="true" /> Financing workspace</Button>
        </div>
        <p className="muted">Auction payout, escrow, GCT, Notice of Sale, and proceeds waterfall workflows are simulated/readiness-only until live provider activation.</p>
      </Section>

      <Section icon={ClipboardCheck} title="Active rental requests" action={<button className="link-button" onClick={() => go("/rental-requests")}>View requests</button>}>
        <PreviewList
          items={model.rentalRequests}
          emptyTitle="No active rental requests"
          emptyMessage="Customer requests will appear here for review and response."
          renderItem={(request) => <div key={request.id} className="preview-item"><strong>{request.title}</strong><span>{request.status}</span></div>}
        />
      </Section>

      <Section icon={SearchCheck} title="Pending approvals">
        <PreviewList
          items={model.pendingApprovals}
          emptyTitle="No pending approvals"
          emptyMessage="Listing verification, document reviews, and policy approvals will show here."
          renderItem={(approval) => <div key={approval.id} className="preview-item"><strong>{approval.title}</strong><span>{approval.status}</span></div>}
        />
      </Section>

      <Section icon={CreditCard} title="Earnings">
        <div className="wallet-grid">
          <div><DollarSign size={18} aria-hidden="true" /><span>Gross revenue</span><strong>{model.earnings.currency} {model.earnings.grossRevenue.toLocaleString()}</strong></div>
          <div><DollarSign size={18} aria-hidden="true" /><span>Pending payout</span><strong>{model.earnings.currency} {model.earnings.pendingPayout.toLocaleString()}</strong></div>
          <div><DollarSign size={18} aria-hidden="true" /><span>Deposits held</span><strong>{model.earnings.currency} {model.earnings.depositsHeld.toLocaleString()}</strong></div>
        </div>
        <p className="muted">Revenue and payout records are placeholders until payment and payout modules are built.</p>
      </Section>

      <Section icon={Inbox} title="Messages">
        <PreviewList
          items={model.messages}
          emptyTitle="No supplier messages"
          emptyMessage="Customer, broker, and support messages will appear here."
          renderItem={(message) => <div key={message.id} className="preview-item"><strong>{message.title}</strong><span>{message.preview}</span></div>}
        />
      </Section>

      <Section icon={Wrench} title="Maintenance and inspections">
        <PreviewList
          items={model.maintenanceReminders}
          emptyTitle="No maintenance reminders"
          emptyMessage="Inspection, service, compliance, and safety reminders will show here."
          renderItem={(reminder) => <div key={reminder.id} className="preview-item"><strong>{reminder.title}</strong><span>{reminder.due}</span></div>}
        />
      </Section>

      <Section icon={Bell} title="AI listing help">
        <div className="metric-grid">
          <div><strong>{aiListingDashboard.averageCompleteness}%</strong><span>Completeness</span></div>
          <div><strong>{aiListingDashboard.averageAuctionReadiness}%</strong><span>Auction readiness</span></div>
          <div><strong>{aiListingDashboard.counts.recommendations}</strong><span>Recommendations</span></div>
          <div><strong>{aiListingDashboard.counts.mediaWarnings}</strong><span>Media warnings</span></div>
        </div>
        <p className="muted">Use local AI-style guidance to improve title quality, descriptions, missing fields, media readiness, tags, category fit, and auction readiness. No external AI provider or real valuation engine is active.</p>
        <Button onClick={() => go("/ai/listing-assistant")}><Bot size={18} aria-hidden="true" /> Open AI Listing Assistant</Button>
      </Section>

      <Section icon={Gavel} title="AI valuation help">
        <div className="metric-grid">
          <div><strong>{aiValuationDashboard.counts.valuations}</strong><span>Assets/lots valued</span></div>
          <div><strong>{aiValuationDashboard.averageConfidence}%</strong><span>Confidence</span></div>
          <div><strong>JMD {aiValuationDashboard.averageReserve.toLocaleString()}</strong><span>Reserve guidance</span></div>
          <div><strong>{aiValuationDashboard.counts.missingDataIndicators}</strong><span>Missing data</span></div>
        </div>
        <p className="muted">Review local placeholder valuation guidance for market, wholesale, retail, reserve, starting bid, and auction strategy. No real valuation API or automated reserve setting is active.</p>
        <Button onClick={() => go("/ai/valuation")}><Bot size={18} aria-hidden="true" /> Open AI Valuation Engine</Button>
      </Section>
    </main>
  );
}
