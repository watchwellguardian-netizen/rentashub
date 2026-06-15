import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button.jsx";
import { calculateProfileCompleteness, getSupplierProfile } from "../lib/supplierProfile.js";
import { useAuth } from "../state/AuthContext.jsx";

export default function SupplierProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    document.title = "RentasHub - Supplier Profile";
    setProfile(getSupplierProfile(window.localStorage, user.id, user));
  }, [user]);

  if (!profile) return <main className="page center-page">Loading supplier profile...</main>;

  return (
    <main className="page dashboard-grid">
      <section className="hero-panel">
        <p className="eyebrow">RentasHub</p>
        <h1>Supplier business profile</h1>
        <p>{profile.publicSummary || "Create a public supplier summary customers can trust."}</p>
        <span className="role-pill">Completeness {calculateProfileCompleteness(profile)}%</span>
      </section>
      <section className="panel">
        <div className="section-heading"><span>Business details</span><Button onClick={() => navigate("/supplier-profile/edit")}>Edit profile</Button></div>
        <div className="profile-grid">
          <div><span>Business name</span><strong>{profile.businessName || "Not set"}</strong></div>
          <div><span>Contact person</span><strong>{profile.contactPerson || "Not set"}</strong></div>
          <div><span>Phone</span><strong>{profile.phone || "Not set"}</strong></div>
          <div><span>Email</span><strong>{profile.email || "Not set"}</strong></div>
          <div><span>Supplier type</span><strong>{profile.supplierType}</strong></div>
          <div><span>Service areas</span><strong>{profile.serviceAreas || "Not set"}</strong></div>
        </div>
      </section>
      <section className="panel">
        <div className="section-heading"><span>Public supplier profile summary</span></div>
        <p>{profile.publicSummary || profile.bio || "Public profile summary is not complete yet."}</p>
        <p className="muted">Logo/photo placeholder: {profile.logoPhoto?.name}</p>
      </section>
      <section className="panel wide">
        <div className="section-heading"><span>Verification</span><Button variant="secondary" onClick={() => navigate("/verification")}>Open verification</Button></div>
        <p>Status: <strong>{profile.verificationStatus}</strong></p>
        <p className="muted">Document review is simulated/local in this version. This is not legal or KYC verification.</p>
      </section>
    </main>
  );
}
