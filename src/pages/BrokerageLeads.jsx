import { useEffect, useState } from "react";
import Button from "../components/Button.jsx";
import { APP_NAME } from "../lib/brand.js";
import { getBrokerLeadContext, seedBrokerageLeads, updateBrokerLeadStatus } from "../lib/marketplaceExchange.js";
import { useAuth } from "../state/AuthContext.jsx";

export default function BrokerageLeads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [message, setMessage] = useState("");

  const load = () => setLeads(seedBrokerageLeads(window.localStorage));
  useEffect(() => {
    document.title = `${APP_NAME} - Brokerage Leads`;
    load();
  }, []);

  const decide = (leadId, status) => {
    const result = updateBrokerLeadStatus(window.localStorage, user, leadId, status);
    setMessage(result.valid ? `Lead marked ${status}.` : result.error);
    load();
  };

  return (
    <main className="page dashboard-grid">
      <section className="hero-panel wide">
        <p className="eyebrow">{APP_NAME}</p>
        <h1>Brokerage leads</h1>
        <p>Broker-assigned opportunities are local placeholders. Commissions, contracts, financing, and production integrations are not built yet.</p>
      </section>
      {message ? <section className="panel wide"><p className="muted">{message}</p></section> : null}
      <section className="panel wide">
        <div className="section-heading"><span>Lead queue</span></div>
        {leads.length === 0 ? <div className="empty-state"><strong>No brokerage leads</strong><p>Broker-assisted listings and broker requests will appear here.</p></div> : (
          <div className="asset-list">
            {leads.map((lead) => {
              const { listing } = getBrokerLeadContext(window.localStorage, lead);
              return (
                <article className="asset-card" key={lead.leadId}>
                  <div>
                    <span className="status-badge neutral">{lead.status}</span>
                    <h3>{listing?.title || lead.listingId}</h3>
                    <p>Owner: {lead.ownerId} / Offer: {lead.offerId || "none yet"}</p>
                    <p>Assigned broker: {lead.assignedBrokerId || "unassigned"}</p>
                  </div>
                  <div className="card-actions">
                    <Button onClick={() => decide(lead.leadId, "accepted")}>Accept</Button>
                    <Button variant="secondary" onClick={() => decide(lead.leadId, "under_review")}>Under review</Button>
                    <Button variant="ghost" onClick={() => decide(lead.leadId, "declined")}>Decline</Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
