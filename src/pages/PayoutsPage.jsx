import { useEffect, useState } from "react";
import Button from "../components/Button.jsx";
import { paymentAdapter } from "../lib/adapters/paymentAdapter.js";
import { useAuth } from "../state/AuthContext.jsx";

export default function PayoutsPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [notice, setNotice] = useState("");

  const reload = () => {
    return Promise.all([
      Promise.resolve(paymentAdapter.getSupplierEarningsSummary(window.localStorage, user.id, { user })),
      Promise.resolve(paymentAdapter.listPayouts ? paymentAdapter.listPayouts(window.localStorage, user.id, { user }) : paymentAdapter.listSupplierTransactions(window.localStorage, user.id, { user })),
    ]).then(([nextSummary, nextTransactions]) => {
      setSummary(nextSummary);
      setTransactions(nextTransactions.filter((transaction) => transaction.type === "payout"));
    });
  };

  useEffect(() => {
    document.title = "RentasHub - Payouts";
    reload();
  }, [user.id]);

  const requestPayout = () => {
    Promise.resolve(paymentAdapter.requestSimulatedPayout(window.localStorage, user.id, { user }))
      .then((result) => {
        setNotice(result.valid ? "Simulated payout recorded. No real bank transfer is performed. No escrow release or provider payout is performed." : result.error);
        return reload();
      })
      .catch((err) => setNotice(err.message || "Could not request simulated payout."));
  };

  if (!summary) return <main className="page center-page">Loading payouts...</main>;

  return (
    <main className="page dashboard-grid">
      <section className="hero-panel"><p className="eyebrow">RentasHub</p><h1>Payouts</h1><p>Controlled payout placeholder for supplier earnings.</p></section>
      <section className="panel wide">
        <div className="section-heading"><span>Payout history</span><Button onClick={requestPayout}>Request simulated payout</Button></div>
        <p className="muted">Available simulated earnings: JMD {summary.availableEarnings.toLocaleString()}. This does not send money to a bank account.</p>
        {notice ? <p className="status-badge neutral">{notice}</p> : null}
        {transactions.length === 0 ? <div className="empty-state"><strong>No payouts yet</strong><p>Simulated payout records will appear here.</p></div> : (
          <div className="asset-list">{transactions.map((transaction) => <article className="asset-card" key={transaction.id}><div><h3>{transaction.id}</h3><p>JMD {transaction.total.toLocaleString()} / {transaction.status}</p></div></article>)}</div>
        )}
      </section>
    </main>
  );
}
