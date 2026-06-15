import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Bookmark, Bot, CalendarCheck, Clock, CreditCard, Gavel, Heart, Inbox, Landmark, Loader2, MessageSquare, Plus, Search, Truck, Wallet } from "lucide-react";
import { useAuth } from "../state/AuthContext.jsx";
import { createCustomerDashboardModel, loadStoredCustomerDashboardData } from "../lib/customerDashboard.js";
import { roleLabel } from "../lib/rbac.js";
import Button from "../components/Button.jsx";

const actionIcons = {
  "search-assets": Search,
  "view-bookings": CalendarCheck,
  messages: MessageSquare,
  "list-asset": Plus,
  "ai-help": Bot,
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

export default function CustomerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = "RentasHub - Customer Dashboard";
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        await new Promise((resolve) => setTimeout(resolve, 120));
        const stored = loadStoredCustomerDashboardData(window.localStorage);
        if (!cancelled) setData(stored);
      } catch {
        if (!cancelled) setError("We could not load your dashboard. Please refresh and try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const model = useMemo(() => createCustomerDashboardModel({ user, data: data || undefined, loading, error }), [data, error, loading, user]);

  const go = (route) => navigate(route);

  const search = (event) => {
    event.preventDefault();
    const trimmed = query.trim();
    navigate(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/search");
  };

  if (model.loading) {
    return <main className="page center-page"><Loader2 className="spin" aria-hidden="true" /> Loading your dashboard...</main>;
  }

  if (model.error) {
    return (
      <main className="page center-page">
        <section className="panel narrow">
          <h1>Dashboard needs a refresh</h1>
          <p>{model.error}</p>
          <Button onClick={() => window.location.reload()}>Reload dashboard</Button>
        </section>
      </main>
    );
  }

  return (
    <main className="page dashboard-grid">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">RentasHub</p>
          <h1>RentasHub Customer Dashboard</h1>
          <p>Welcome, {model.userName}. Search, book, message, pay, and get guided help from one simple marketplace dashboard.</p>
        </div>
        <span className="role-pill">{roleLabel(model.role)}</span>
        <form onSubmit={search} className="search-row">
          <label className="visually-hidden" htmlFor="asset-search">Search rentals and brokerage assets</label>
          <input id="asset-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search cars, trucks, tools, spaces, property, swaps, or brokers" />
          <Button type="submit"><Search size={18} aria-hidden="true" /> Search</Button>
          <Button type="button" variant="secondary" onClick={() => go("/ai-help")}><Bot size={18} aria-hidden="true" /> AI Help</Button>
        </form>
      </section>

      <section className="panel wide">
        <div className="section-heading"><span><Bookmark size={18} aria-hidden="true" /> Quick actions</span></div>
        <div className="action-grid">
          {model.actions.map((action) => {
            const Icon = actionIcons[action.id] || Search;
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

      <Section icon={CalendarCheck} title="Active bookings" action={<button className="link-button" onClick={() => go("/bookings")}>View all</button>}>
        {model.emptyStates.activeBookings ? <EmptyState title="No active bookings yet" message="Search for an asset and send your first booking request." /> : null}
      </Section>

      <Section icon={Heart} title="Saved assets">
        {model.emptyStates.favorites ? <EmptyState title="No saved assets yet" message="Save assets you want to compare or book later." /> : null}
      </Section>

      <Section icon={Inbox} title="Messages and notifications">
        {model.emptyStates.messages ? <EmptyState title="No messages yet" message="Supplier replies, support messages, and booking notices will appear here." /> : null}
      </Section>

      <Section icon={Wallet} title="Wallet summary">
        <div className="wallet-grid">
          <div><CreditCard size={18} aria-hidden="true" /><span>Available credit</span><strong>{model.wallet.currency} {model.wallet.availableCredit.toLocaleString()}</strong></div>
          <div><Clock size={18} aria-hidden="true" /><span>Deposits held</span><strong>{model.wallet.currency} {model.wallet.depositsHeld.toLocaleString()}</strong></div>
        </div>
        <p className="muted">Payment records are placeholders until the payment module is built.</p>
      </Section>

      <Section icon={Gavel} title="Auction activity">
        <div className="action-grid">
          <button className="action-card" type="button" onClick={() => go("/dashboard/auctions")}>
            <Gavel size={22} aria-hidden="true" />
            <strong>My auction dashboard</strong>
            <span>Track bids, watched lots, won auctions, escrow readiness, and title-transfer steps.</span>
          </button>
          <button className="action-card" type="button" onClick={() => go("/auctions/live")}>
            <Search size={22} aria-hidden="true" />
            <strong>Browse live auctions</strong>
            <span>Find movable assets available through RentasHub Auctions.</span>
          </button>
          <button className="action-card" type="button" onClick={() => go("/inspectors")}>
            <CalendarCheck size={22} aria-hidden="true" />
            <strong>Find inspectors</strong>
            <span>Compare approved inspection providers before bidding or booking.</span>
          </button>
          <button className="action-card" type="button" onClick={() => go("/transport")}>
            <Truck size={22} aria-hidden="true" />
            <strong>Find transport</strong>
            <span>Compare tow, flatbed, heavy haul, and delivery providers for auction assets.</span>
          </button>
          <button className="action-card" type="button" onClick={() => go("/dashboard/auction-documents")}>
            <Bookmark size={22} aria-hidden="true" />
            <strong>Auction documents</strong>
            <span>Access buyer-visible invoices, sale confirmations, escrow, inspection, and transport placeholders.</span>
          </button>
          <button className="action-card" type="button" onClick={() => go("/financing")}>
            <Landmark size={22} aria-hidden="true" />
            <strong>Find financing</strong>
            <span>Compare provider-ready financing partners and request prequalification placeholders.</span>
          </button>
        </div>
      </Section>

      <Section icon={Bell} title="Recent activity">
        {model.emptyStates.recentActivity ? <EmptyState title="No recent activity" message="Searches, bookings, payments, and support updates will show here." /> : null}
      </Section>
    </main>
  );
}
