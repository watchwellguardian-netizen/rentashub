import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { paymentAdapter } from "../lib/adapters/paymentAdapter.js";
import { canViewTransaction, formatMoney } from "../lib/paymentLedger.js";
import { useAuth } from "../state/AuthContext.jsx";

export default function TransactionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [transaction, setTransaction] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = "RentasHub - Transaction";
    let active = true;
    Promise.resolve(paymentAdapter.getTransaction(window.localStorage, id, { user }))
      .then((found) => {
        if (!active) return;
        if (!found) {
          setError("Transaction was not found.");
          return;
        }
        if (!canViewTransaction(user, found)) {
          setError("You cannot view another user's transaction.");
          return;
        }
        setTransaction(found);
      })
      .catch((err) => {
        if (active) setError(err.message || "Transaction was not found.");
      });
    return () => {
      active = false;
    };
  }, [id, user]);

  if (error) return <main className="page center-page"><section className="panel narrow error-panel">{error}</section></main>;
  if (!transaction) return <main className="page center-page">Loading transaction detail...</main>;

  return (
    <main className="page dashboard-grid">
      <section className="hero-panel"><p className="eyebrow">RentasHub</p><h1>Transaction detail</h1><p>{transaction.id}</p><span className="role-pill">{transaction.status}</span></section>
      <section className="panel wide">
        <div className="section-heading"><span>Breakdown</span></div>
        <div className="booking-estimate">
          <div><span>Type</span><strong>{transaction.type}</strong></div>
          <div><span>Rental subtotal</span><strong>{formatMoney(transaction.rentalSubtotal)}</strong></div>
          <div><span>Deposit</span><strong>{formatMoney(transaction.deposit)}</strong></div>
          <div><span>Platform fee</span><strong>{formatMoney(transaction.platformFee)}</strong></div>
          <div><span>Supplier earnings</span><strong>{formatMoney(transaction.supplierEarnings)}</strong></div>
          <div><span>Total</span><strong>{formatMoney(transaction.total)}</strong></div>
        </div>
        <p className="muted">{transaction.note}</p>
      </section>
    </main>
  );
}
