import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button.jsx";
import { paymentAdapter } from "../lib/adapters/paymentAdapter.js";
import { useAuth } from "../state/AuthContext.jsx";

export default function PaymentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = "RentasHub - Payments & Wallet";
    let active = true;
    Promise.resolve(paymentAdapter.listCustomerTransactions(window.localStorage, user.id, { user }))
      .then((items) => {
        if (active) setTransactions(items);
      })
      .catch((err) => {
        if (active) setError(err.message || "Payments need a refresh. Please try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user.id]);

  if (loading) return <main className="page center-page">Loading payments...</main>;
  if (error) return <main className="page center-page"><section className="panel narrow error-panel">{error}</section></main>;

  return (
    <main className="page dashboard-grid">
      <section className="hero-panel"><p className="eyebrow">RentasHub</p><h1>RentasHub Payments & Wallet</h1><p>Simulated customer payment history.</p></section>
      <section className="panel wide">
        <div className="section-heading"><span>Payment history</span></div>
        {transactions.length === 0 ? <div className="empty-state"><strong>No payments yet</strong><p>Simulated payment records will appear here after an approved booking is marked paid.</p></div> : (
          <div className="asset-list">{transactions.map((transaction) => (
            <article className="asset-card" key={transaction.id}>
              <div><span className="status-badge neutral">{transaction.status}</span><h3>{transaction.assetTitle}</h3><p>{transaction.type} / JMD {Number(transaction.total).toLocaleString()}</p></div>
              <Button variant="secondary" onClick={() => navigate(`/transaction/${transaction.id}`)}>View transaction</Button>
            </article>
          ))}</div>
        )}
      </section>
    </main>
  );
}
