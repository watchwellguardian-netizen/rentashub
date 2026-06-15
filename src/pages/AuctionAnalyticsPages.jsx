import { Link } from "react-router-dom";
import { Activity, BarChart3, Eye, Gavel, Landmark, MapPinned, TrendingUp, Users } from "lucide-react";
import { getAuctionAnalytics } from "../lib/auctionAnalyticsService.js";
import { useAuth } from "../state/AuthContext.jsx";

function Currency({ value }) {
  return <>JMD {Number(value || 0).toLocaleString()}</>;
}

function Metric({ label, value, icon: Icon = BarChart3 }) {
  return <div><Icon size={18} aria-hidden="true" /><span>{label}</span><strong>{value}</strong></div>;
}

function AnalyticsTable({ title, rows, columns, empty = "No analytics records yet." }) {
  return (
    <section className="panel wide">
      <div className="section-heading"><span>{title}</span></div>
      {rows.length ? (
        <div className="table-wrap">
          <table>
            <thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
            <tbody>
              {rows.map((row, index) => <tr key={row.id || row.auctionId || row.categoryId || row.parish || row.bidId || index}>{columns.map((column) => <td key={column.key}>{column.render ? column.render(row) : row[column.key]}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
      ) : <div className="empty-state"><strong>{empty}</strong></div>}
    </section>
  );
}

function AnalyticsPage({ scope, title, subtitle }) {
  const { user } = useAuth();
  const analytics = getAuctionAnalytics(window.localStorage, user, scope);
  const kpis = analytics.kpis;
  return (
    <main className="page dashboard-grid">
      <section className="hero-panel wide">
        <p className="eyebrow">RentasHub Auction Analytics</p>
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <p className="muted">{analytics.notice}</p>
        <div className="card-actions"><Link className="button" to="/auctions">View auctions</Link><Link className="button secondary" to="/admin/auctions">Auction admin</Link></div>
      </section>

      <section className="panel wide">
        <div className="metric-grid">
          <Metric icon={Gavel} label="Total lots" value={kpis.totalLots} />
          <Metric icon={Activity} label="Live lots" value={kpis.liveLots} />
          <Metric icon={Landmark} label="Simulated GMV" value={<Currency value={kpis.gmv} />} />
          <Metric icon={TrendingUp} label="Sell-through" value={`${kpis.sellThroughRate}%`} />
          <Metric icon={Eye} label="Watchers" value={kpis.watchers} />
          <Metric icon={BarChart3} label="Bids" value={kpis.bids} />
          <Metric icon={TrendingUp} label="Recovery" value={`${kpis.recoveryRate}%`} />
          <Metric icon={Landmark} label="Reserve gap" value={<Currency value={kpis.reserveGap} />} />
        </div>
      </section>

      <AnalyticsTable
        title="Category performance"
        rows={analytics.categoryPerformance}
        columns={[
          { key: "label", label: "Category" },
          { key: "lots", label: "Lots" },
          { key: "gmv", label: "GMV", render: (row) => <Currency value={row.gmv} /> },
          { key: "bids", label: "Bids" },
          { key: "watchers", label: "Watchers" },
          { key: "sellThroughRate", label: "Sell-through", render: (row) => `${row.sellThroughRate}%` },
        ]}
      />

      <AnalyticsTable
        title="Parish performance"
        rows={analytics.parishPerformance}
        columns={[
          { key: "parish", label: "Parish" },
          { key: "lots", label: "Lots" },
          { key: "gmv", label: "GMV", render: (row) => <Currency value={row.gmv} /> },
          { key: "bids", label: "Bids" },
          { key: "watchers", label: "Watchers" },
          { key: "reserveGap", label: "Reserve gap", render: (row) => <Currency value={row.reserveGap} /> },
        ]}
      />

      <AnalyticsTable
        title="Bid activity"
        rows={analytics.bidActivity}
        columns={[
          { key: "auctionTitle", label: "Auction" },
          { key: "bidderName", label: "Bidder" },
          { key: "bidType", label: "Type", render: (row) => row.bidType.replaceAll("_", " ") },
          { key: "status", label: "Status" },
          { key: "amount", label: "Visible amount", render: (row) => row.sealed ? "Sealed" : <Currency value={row.amount} /> },
        ]}
      />

      <AnalyticsTable
        title="Watchlist and conversion signals"
        rows={analytics.watchlistAnalytics}
        columns={[
          { key: "title", label: "Auction" },
          { key: "category", label: "Category" },
          { key: "parish", label: "Parish" },
          { key: "watchers", label: "Watchers" },
          { key: "bidCount", label: "Bids" },
          { key: "conversionSignal", label: "Signal", render: (row) => `${row.conversionSignal}%` },
        ]}
      />

      <AnalyticsTable
        title="Seller recovery analytics"
        rows={analytics.sellerRecovery}
        columns={[
          { key: "title", label: "Auction" },
          { key: "sellerName", label: "Seller" },
          { key: "startingBid", label: "Starting", render: (row) => <Currency value={row.startingBid} /> },
          { key: "currentBid", label: "Current" , render: (row) => <Currency value={row.currentBid} /> },
          { key: "recoveryRate", label: "Recovery", render: (row) => `${row.recoveryRate}%` },
          { key: "status", label: "Status" },
        ]}
      />

      <section className="panel wide">
        <div className="section-heading"><span><Users size={18} aria-hidden="true" /> Buyer and dealer activity</span></div>
        <div className="metric-grid">
          <Metric icon={Users} label="Unique bidders" value={analytics.buyerDealerSummary.uniqueBidders} />
          <Metric icon={Gavel} label="Dealer bids" value={analytics.buyerDealerSummary.dealerBids} />
          <Metric icon={BarChart3} label="Sealed bids" value={analytics.buyerDealerSummary.sealedBids} />
          <Metric icon={TrendingUp} label="Proxy bids" value={analytics.buyerDealerSummary.proxyBids} />
          <Metric icon={Eye} label="Watched lots" value={analytics.buyerDealerSummary.watchedLots} />
          <Metric icon={MapPinned} label="Highest bid records" value={analytics.buyerDealerSummary.highBidRecords} />
        </div>
        <p className="muted">Simulation-safe only. No live analytics provider, warehouse export, behavioral tracking SDK, or production revenue reporting is active.</p>
      </section>
    </main>
  );
}

export function AdminAuctionAnalyticsPage() {
  return <AnalyticsPage scope="admin" title="Auction KPI and GMV simulation dashboard" subtitle="Review local auction performance, simulated GMV, sell-through, bids, watchlists, recovery, and parish/category performance." />;
}

export function SupplierAuctionAnalyticsPage() {
  return <AnalyticsPage scope="supplier" title="Supplier auction analytics" subtitle="Track your auction lot performance, reserve gap, recovery signals, bidder activity, and watchlist demand." />;
}

export function DealerAuctionAnalyticsPage() {
  return <AnalyticsPage scope="dealer" title="Dealer auction market intelligence" subtitle="Review buyer/dealer activity summaries, categories, parishes, bid signals, and simulated GMV trends." />;
}
