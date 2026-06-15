import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button.jsx";
import { SUPPLIER_TYPES, getSupplierProfile, upsertSupplierProfile } from "../lib/supplierProfile.js";
import { useAuth } from "../state/AuthContext.jsx";

export default function SupplierProfileEdit() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = "RentasHub - Edit Supplier Profile";
    setForm(getSupplierProfile(window.localStorage, user.id, user));
  }, [user]);

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const save = (event) => {
    event.preventDefault();
    const result = upsertSupplierProfile(window.localStorage, user, form);
    if (!result.valid) {
      setError(result.error);
      return;
    }
    navigate("/supplier-profile");
  };

  if (!form) return <main className="page center-page">Loading profile editor...</main>;

  return (
    <main className="page dashboard-grid">
      <section className="hero-panel"><p className="eyebrow">RentasHub</p><h1>Edit supplier profile</h1><p>Keep this simple and customer-readable.</p></section>
      <form className="panel wide form-grid" onSubmit={save}>
        {error ? <p className="field-error form-span">{error}</p> : null}
        <label>Business name<input value={form.businessName} onChange={(event) => setField("businessName", event.target.value)} /></label>
        <label>Contact person<input value={form.contactPerson} onChange={(event) => setField("contactPerson", event.target.value)} /></label>
        <label>Phone<input value={form.phone} onChange={(event) => setField("phone", event.target.value)} /></label>
        <label>Email<input value={form.email} onChange={(event) => setField("email", event.target.value)} /></label>
        <label className="form-span">Business address<input value={form.businessAddress} onChange={(event) => setField("businessAddress", event.target.value)} /></label>
        <label>Service areas<input value={form.serviceAreas} onChange={(event) => setField("serviceAreas", event.target.value)} /></label>
        <label>Supplier type<select value={form.supplierType} onChange={(event) => setField("supplierType", event.target.value)}>{SUPPLIER_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
        <label className="form-span">Bio/description<textarea value={form.bio} onChange={(event) => setField("bio", event.target.value)} /></label>
        <section className="photo-placeholder form-span"><strong>Logo/photo placeholder</strong><p>Upload-ready metadata only. Real file storage comes later.</p></section>
        <label>Business hours<input value={form.businessHours} onChange={(event) => setField("businessHours", event.target.value)} /></label>
        <label>Emergency contact<input value={form.emergencyContact} onChange={(event) => setField("emergencyContact", event.target.value)} /></label>
        <label className="form-span">Public supplier profile summary<textarea value={form.publicSummary} onChange={(event) => setField("publicSummary", event.target.value)} /></label>
        <div className="form-actions"><Button variant="secondary" type="button" onClick={() => navigate("/supplier-profile")}>Cancel</Button><Button type="submit">Save supplier profile</Button></div>
      </form>
    </main>
  );
}
