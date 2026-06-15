import { useEffect, useState } from "react";
import { paymentAdapter } from "../lib/adapters/paymentAdapter.js";
import { useAuth } from "../state/AuthContext.jsx";

export default function WalletPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    document.title = "RentasHub - Payments & Wallet";
    let active = true;
    Promise.resolve(paymentAdapter.getCustomerWalletSummary(window.localStorage, user.id, { user }))
      .then((next) => {
        if (active) setSummary(next);
      });
    return () => {
      active = false;
    };
  }, [user.id]);

  if (!summary) return <main className="page center-page">Loading wallet...</main>;

  return (
    <main className="page dashboard-grid">
      <section className="hero-panel"><p className="eyebrow">RentasHub</p><h1>RentasHub Payments & Wallet</h1><p>Simulated balance and payment summary. No real money is stored here.</p></section>
      <section className="panel wide">
        <div className="section-heading"><span>Wallet summary</span></div>
        <div className="metric-grid">
          <div><span>Simulated paid</span><strong>JMD {summary.simulatedPaid.toLocaleString()}</strong></div>
          <div><span>Deposits held</span><strong>JMD {summary.depositsHeld.toLocaleString()}</strong></div>
          <div><span>Platform fees</span><strong>JMD {summary.platformFees.toLocaleString()}</strong></div>
          <div><span>Transactions</span><strong>{summary.transactionCount}</strong></div>
        </div>
      </section>
    </main>
  );
}
