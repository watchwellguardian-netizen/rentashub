import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AssetForm from "../components/AssetForm.jsx";
import { useAuth } from "../state/AuthContext.jsx";
import { assetAdapter } from "../lib/adapters/assetAdapter.js";
import { canCreateAssetListing } from "../lib/assetListing.js";

export default function ListAsset() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = "RentasHub - List Asset";
  }, []);

  const save = async (listing) => {
    if (!canCreateAssetListing(user)) {
      setError("Only supplier/vendor accounts can create listings.");
      return;
    }
    try {
      const result = await Promise.resolve(assetAdapter.upsert(window.localStorage, {
        ...listing,
        ownerSupplierId: user.id,
        supplierName: user.full_name,
      }, { user }));
      if (!result.valid) {
        setError("Please fix the form errors and try again.");
        return;
      }
      navigate(`/asset/${result.listing.id}`);
    } catch (err) {
      setError(err.message || "Asset API mode could not save this listing. Check backend status or switch data mode back to local.");
    }
  };

  return (
    <main className="page dashboard-grid">
      <section className="hero-panel">
        <p className="eyebrow">RentasHub</p>
        <h1>Add Asset</h1>
        <p>Create a supplier-owned rental, sale, auction, swap, trade, or brokerage listing.</p>
      </section>
      {error ? <section className="panel wide error-panel">{error}</section> : null}
      <AssetForm ownerSupplierId={user.id} supplierName={user.full_name} onSubmit={save} />
    </main>
  );
}
