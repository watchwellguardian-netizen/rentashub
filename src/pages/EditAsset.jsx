import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AssetForm from "../components/AssetForm.jsx";
import { useAuth } from "../state/AuthContext.jsx";
import { assetAdapter } from "../lib/adapters/assetAdapter.js";
import { canEditAssetListing } from "../lib/assetListing.js";

export default function EditAsset() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.title = "RentasHub - Edit Asset";
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve(assetAdapter.getById(window.localStorage, id))
      .then((found) => {
        if (!active) return;
        if (!found) {
          setError("Asset listing was not found.");
          return;
        }
        if (!canEditAssetListing(user, found)) {
          setError("You cannot edit a listing owned by another supplier.");
          return;
        }
        setListing(found);
      })
      .catch((err) => {
        if (active) setError(err.message || "Asset API mode could not load this listing.");
      });
    return () => {
      active = false;
    };
  }, [id, user]);

  const save = async (nextListing) => {
    try {
      const result = await Promise.resolve(assetAdapter.upsert(window.localStorage, {
        ...listing,
        ...nextListing,
        id: listing.id,
        ownerSupplierId: listing.ownerSupplierId,
        supplierName: listing.supplierName,
      }, { user }));
      if (!result.valid) {
        setError("Please fix the form errors and try again.");
        return;
      }
      navigate(`/asset/${result.listing.id}`);
    } catch (err) {
      setError(err.message || "Asset API mode could not save this listing.");
    }
  };

  if (error) return <main className="page center-page"><section className="panel narrow">{error}</section></main>;
  if (!listing) return <main className="page center-page">Loading edit form...</main>;

  return (
    <main className="page dashboard-grid">
      <section className="hero-panel">
        <p className="eyebrow">RentasHub</p>
        <h1>Edit Asset</h1>
        <p>Update this supplier-owned listing.</p>
      </section>
      <AssetForm initialValue={listing} ownerSupplierId={user.id} supplierName={user.full_name} onSubmit={save} />
    </main>
  );
}
