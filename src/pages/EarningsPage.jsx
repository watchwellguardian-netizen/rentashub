import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button.jsx";
import { paymentAdapter } from "../lib/adapters/paymentAdapter.js";
import { useAuth } from "../state/AuthContext.jsx";

export default function EarningsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    document.title = "RentasHub - Supplier Earnings";
    let active = true;
    Promise.all([
      Promise.resolve(paymentAdapter.getSupplierEarningsSummary(window.localStorage, user.id, { user })),
      Promise.resolve(paymentAdapter.listSupplierTransactions(window.localStorage, user.id, { user })),
    ]).then(([nextSummary, nextTransactions]) => {
      if (!active) return;
      setSummary(nextSummary);
      setTransactions(nextTransactions);
    });
    return () => {
      active = false;
    };
  }, [user.id]);

  if (!summary) return <main className="page center-page">Loading earnings...</main>;

  return (
    <main className="page dashboard-grid">
      <section className="hero-panel"><p className="eyebrow">RentasHub</p><h1>RentasHub Supplier Earnings</h1><p>Supplier earnings from simulated booking payments only.</p></section>
      <section className="panel wide">
        <div className="section-heading"><span>Earnings summary</span><Button onClick={() => navigate("/payouts")}>Payouts</Button></div>
        <div className="metric-grid">
          <div><span>Pending earnings</span><strong>JMD {summary.pendingEarnings.toLocaleString()}</strong></div>
          <div><span>Available earnings</span><strong>JMD {summary.availableEarnings.toLocaleString()}</strong></div>
          <div><span>Paid out</span><strong>JMD {summary.paidOutEarnings.toLocaleString()}</strong></div>
          <div><span>Platform fees</span><strong>JMD {summary.platformFees.toLocaleString()}</strong></div>
        </div>
        {transactions.length === 0 ? <div className="empty-state"><strong>No earnings yet</strong><p>Simulated paid bookings for your assets will appear here.</p></div> : null}
      </section>
    </main>
  );
}
