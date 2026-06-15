import { useEffect, useState } from "react";
import Button from "../components/Button.jsx";
import { getSupplierProfile, simulateVerificationStatus } from "../lib/supplierProfile.js";
import { useAuth } from "../state/AuthContext.jsx";

export default function VerificationStatus() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);

  const load = () => setProfile(getSupplierProfile(window.localStorage, user.id, user));

  useEffect(() => {
    document.title = "RentasHub - Supplier Verification Status";
    load();
  }, [user]);

  const simulate = (status) => {
    simulateVerificationStatus(window.localStorage, user.id, status);
    load();
  };

  if (!profile) return <main className="page center-page">Loading verification status...</main>;

  return (
    <main className="page dashboard-grid">
      <section className="hero-panel"><p className="eyebrow">RentasHub</p><h1>RentasHub Supplier Verification</h1><p>Status: {profile.verificationStatus}</p></section>
      <section className="panel wide">
        <div className="section-heading"><span>Submitted documents</span></div>
        <div className="preview-list">
          {Object.entries(profile.verificationDocuments || {}).map(([name, doc]) => <div className="preview-item" key={name}><strong>{name}</strong><span>{doc.status} / {doc.submitted ? "submitted" : "not submitted"}</span></div>)}
        </div>
        <p className="muted">Admin review is a controlled placeholder until the admin module is built.</p>
        <div className="form-actions">
          <Button variant="secondary" onClick={() => simulate("needs_more_info")}>Simulate needs more info</Button>
          <Button variant="secondary" onClick={() => simulate("verified")}>Simulate verified</Button>
        </div>
      </section>
    </main>
  );
}
