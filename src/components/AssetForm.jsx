import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ASSET_CATEGORIES, AVAILABILITY_STATUSES, MARKETPLACE_LISTING_LABELS, MARKETPLACE_LISTING_TYPES, PROTECTION_REQUIREMENTS, RENTAL_TYPES, VERIFICATION_STATUSES, createEmptyAssetForm, getCategoryById, validateAssetListing } from "../lib/assetListing.js";
import Button from "./Button.jsx";

const FIELD_LABELS = {
  make: "Make",
  model: "Model",
  year: "Year",
  plateVin: "Plate / VIN placeholder",
  seats: "Seats",
  fuelType: "Fuel type",
  transmission: "Transmission",
  capacity: "Capacity",
  boxSize: "Box size",
  commercialUse: "Commercial use",
  driverIncluded: "Driver included option",
  equipmentType: "Equipment type",
  operatingWeight: "Operating weight",
  engineHours: "Engine hours",
  powerType: "Power type",
  condition: "Condition",
  accessoriesIncluded: "Accessories included",
  amenities: "Amenities",
  parking: "Parking",
  noiseRules: "Noise rules",
  eventType: "Event type",
  bedrooms: "Bedrooms",
  bathrooms: "Bathrooms",
  squareFootage: "Square footage",
  leaseSaleRentalOption: "Lease / sale / rental option",
  dimensions: "Dimensions",
  accessRules: "Access rules",
  securityFeatures: "Security features",
  usageNotes: "Usage notes",
};

function FieldError({ message }) {
  return message ? <p className="field-error">{message}</p> : null;
}

export default function AssetForm({ initialValue, ownerSupplierId, supplierName, onSubmit }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialValue || createEmptyAssetForm(ownerSupplierId));
  const [errors, setErrors] = useState({});
  const category = useMemo(() => getCategoryById(form.category), [form.category]);

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const setCategory = (categoryId) => {
    const nextCategory = getCategoryById(categoryId);
    setForm((current) => ({
      ...current,
      category: nextCategory.id,
      subcategory: nextCategory.subcategories[0],
      categoryFields: {},
    }));
  };

  const setCategoryField = (field, value) => {
    setForm((current) => ({
      ...current,
      categoryFields: {
        ...current.categoryFields,
        [field]: value,
      },
    }));
  };

  const submit = (event) => {
    event.preventDefault();
    const validation = validateAssetListing({
      ...form,
      ownerSupplierId,
      supplierName,
    });
    setErrors(validation.errors);
    if (!validation.valid) return;
    onSubmit(validation.listing);
  };

  return (
    <form className="asset-form" onSubmit={submit}>
      <section className="panel wide">
        <div className="section-heading"><span>Step 1: Basic asset details</span></div>
        <div className="form-grid">
          <label>
            Asset title
            <input value={form.title} onChange={(event) => setField("title", event.target.value)} />
            <FieldError message={errors.title} />
          </label>
          <label>
            Category
            <select value={form.category} onChange={(event) => setCategory(event.target.value)}>
              {ASSET_CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <FieldError message={errors.category} />
          </label>
          <label>
            Subcategory
            <select value={form.subcategory} onChange={(event) => setField("subcategory", event.target.value)}>
              {category.subcategories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <FieldError message={errors.subcategory} />
          </label>
          <label>
            Location
            <input value={form.location} onChange={(event) => setField("location", event.target.value)} />
            <FieldError message={errors.location} />
          </label>
          <label className="form-span">
            Description
            <textarea value={form.description} onChange={(event) => setField("description", event.target.value)} />
            <FieldError message={errors.description} />
          </label>
        </div>
      </section>

      <section className="panel wide">
        <div className="section-heading"><span>Step 2: Pricing and availability</span></div>
        <div className="form-grid">
          <label>
            Marketplace listing type
            <select value={form.listingType} onChange={(event) => setField("listingType", event.target.value)}>
              {MARKETPLACE_LISTING_TYPES.map((item) => <option key={item} value={item}>{MARKETPLACE_LISTING_LABELS[item]}</option>)}
            </select>
            <FieldError message={errors.listingType} />
          </label>
          <label>
            Rental type
            <select value={form.rentalType} onChange={(event) => setField("rentalType", event.target.value)}>
              {RENTAL_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <FieldError message={errors.rentalType} />
          </label>
          <label>
            Price/rate
            <input type="number" min="0" value={form.priceRate} onChange={(event) => setField("priceRate", event.target.value)} />
            <FieldError message={errors.priceRate} />
          </label>
          <label>
            Sale price
            <input type="number" min="0" value={form.salePrice} onChange={(event) => setField("salePrice", event.target.value)} />
            <FieldError message={errors.salePrice} />
          </label>
          <label>
            Trade value placeholder
            <input type="number" min="0" value={form.tradeValue} onChange={(event) => setField("tradeValue", event.target.value)} />
            <FieldError message={errors.tradeValue} />
          </label>
          <label>
            Deposit requirement
            <input value={form.depositRequirement} onChange={(event) => setField("depositRequirement", event.target.value)} />
            <FieldError message={errors.depositRequirement} />
          </label>
          <label>
            Delivery/pickup options
            <select value={form.deliveryPickupOptions} onChange={(event) => setField("deliveryPickupOptions", event.target.value)}>
              <option value="pickup">Pickup</option>
              <option value="delivery">Delivery</option>
              <option value="pickup or delivery">Pickup or delivery</option>
            </select>
            <FieldError message={errors.deliveryPickupOptions} />
          </label>
          <label>
            Availability status
            <select value={form.availabilityStatus} onChange={(event) => setField("availabilityStatus", event.target.value)}>
              {AVAILABILITY_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <FieldError message={errors.availabilityStatus} />
          </label>
          <label>
            Verification status
            <select value={form.verificationStatus} onChange={(event) => setField("verificationStatus", event.target.value)}>
              {VERIFICATION_STATUSES.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <FieldError message={errors.verificationStatus} />
          </label>
          <label className="checkbox-line">
            <input type="checkbox" checked={Boolean(form.swapInterested)} onChange={(event) => setField("swapInterested", event.target.checked)} />
            Open to swap proposals
          </label>
          <label className="checkbox-line">
            <input type="checkbox" checked={Boolean(form.brokerAssistRequired)} onChange={(event) => setField("brokerAssistRequired", event.target.checked)} />
            Broker assistance required
          </label>
          <label className="checkbox-line">
            <input type="checkbox" checked={Boolean(form.negotiationAllowed)} onChange={(event) => setField("negotiationAllowed", event.target.checked)} />
            Negotiation allowed
          </label>
        </div>
      </section>

      <section className="panel wide">
        <div className="section-heading"><span>Step 3: Rules, safety, and photos</span></div>
        <div className="form-grid">
          <label>
            Insurance requirement
            <textarea value={form.insuranceRequirement} onChange={(event) => setField("insuranceRequirement", event.target.value)} />
            <FieldError message={errors.insuranceRequirement} />
          </label>
          <label>
            Protection requirement
            <select value={form.protectionRequirement} onChange={(event) => setField("protectionRequirement", event.target.value)}>
              {PROTECTION_REQUIREMENTS.map((item) => <option key={item} value={item}>{item.replace("_", " ")}</option>)}
            </select>
            <FieldError message={errors.protectionRequirement} />
          </label>
          <label>
            Damage policy
            <textarea value={form.damagePolicy} onChange={(event) => setField("damagePolicy", event.target.value)} />
            <FieldError message={errors.damagePolicy} />
          </label>
          <label>
            Cancellation policy
            <textarea value={form.cancellationPolicy} onChange={(event) => setField("cancellationPolicy", event.target.value)} />
            <FieldError message={errors.cancellationPolicy} />
          </label>
          <label>
            Safety instructions
            <textarea value={form.safetyInstructions} onChange={(event) => setField("safetyInstructions", event.target.value)} />
            <FieldError message={errors.safetyInstructions} />
          </label>
          <label>
            Usage instructions
            <textarea value={form.usageInstructions} onChange={(event) => setField("usageInstructions", event.target.value)} />
            <FieldError message={errors.usageInstructions} />
          </label>
          <label className="checkbox-line">
            <input type="checkbox" checked={Boolean(form.operatorRequired)} onChange={(event) => setField("operatorRequired", event.target.checked)} />
            Operator required
          </label>
          <div className="photo-placeholder form-span">
            Photos placeholder/upload-ready structure
            <p>Photo upload will connect to storage later. This listing stores photo metadata placeholders now.</p>
          </div>
        </div>
      </section>

      <section className="panel wide">
        <div className="section-heading"><span>Step 4: Category-specific fields</span></div>
        <div className="form-grid">
          {category.specificFields.map((field) => (
            <label key={field}>
              {FIELD_LABELS[field] || field}
              <input value={form.categoryFields[field] || ""} onChange={(event) => setCategoryField(field, event.target.value)} />
            </label>
          ))}
        </div>
      </section>

      <div className="form-actions">
        <Button type="button" variant="secondary" onClick={() => navigate("/my-listings")}>Cancel</Button>
        <Button type="submit">Save listing</Button>
      </div>
    </form>
  );
}
