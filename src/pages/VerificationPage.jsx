import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button.jsx";
import { VERIFICATION_DOCUMENTS, getSupplierProfile, submitVerification } from "../lib/supplierProfile.js";
import { useAuth } from "../state/AuthContext.jsx";

export default function VerificationPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [selected, setSelected] = useState({});
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = "RentasHub - Supplier Verification";
    if (!user?.id) return;
    const next = getSupplierProfile(window.localStorage, user.id, user);
    setProfile(next);
    setSelected(Object.fromEntries(VERIFICATION_DOCUMENTS.map((doc) => [doc, Boolean(next.verificationDocuments?.[doc]?.submitted)])));
  }, [user]);

  const submit = () => {
    const result = submitVerification(window.localStorage, user, selected);
    if (!result.valid) {
      setError(result.error);
      return;
    }
    navigate("/verification/status");
  };

  if (!profile) return <main className="page center-page">Loading verification checklist...</main>;

  return (
    <main className="page dashboard-grid">
      <section className="hero-panel"><p className="eyebrow">RentasHub</p><h1>RentasHub Supplier Verification</h1><p>Document review is simulated/local in this version. This is not legal or KYC verification.</p></section>
      <section className="panel wide">
        <div className="section-heading"><span>Upload-ready checklist</span></div>
        {error ? <p className="field-error">{error}</p> : null}
        <div className="checklist-box">
          {VERIFICATION_DOCUMENTS.map((doc) => (
            <label className="checkbox-line" key={doc}>
              <input type="checkbox" checked={Boolean(selected[doc])} onChange={(event) => setSelected((current) => ({ ...current, [doc]: event.target.checked }))} />
              {doc} placeholder
            </label>
          ))}
        </div>
        <p className="muted">Operator certification should be included where relevant to vehicles, heavy equipment, or staffed rentals.</p>
        <div className="form-actions"><Button onClick={submit}>Submit verification checklist</Button></div>
      </section>
    </main>
  );
}
