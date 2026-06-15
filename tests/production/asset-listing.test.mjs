import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  ASSET_CATEGORIES,
  SEED_LISTINGS,
  canCreateAssetListing,
  canEditAssetListing,
  createAssetListing,
  getCategoryById,
  getSupplierListings,
  validateAssetListing,
} from "../../src/lib/assetListing.js";
import { SUPPLIER_ACTIONS } from "../../src/lib/supplierDashboard.js";

const root = process.cwd();
const supplier = { id: "review-supplier", role: "supplier", full_name: "Review Supplier" };
const vendor = { id: "review-supplier", role: "vendor", full_name: "Review Vendor" };
const customer = { id: "review-customer", role: "customer", full_name: "Review Customer" };
const otherSupplier = { id: "supplier-two", role: "supplier", full_name: "Other Supplier" };

function memoryStorage(initialListings = SEED_LISTINGS) {
  const store = new Map([["rentashub_asset_listings", JSON.stringify(initialListings)]]);
  return {
    getItem: (key) => store.get(key) || null,
    setItem: (key, value) => store.set(key, value),
  };
}

function validListing(overrides = {}) {
  return {
    title: "Portable tile cutter",
    category: "small-tools-machines",
    subcategory: "Cutting",
    description: "Reliable tile cutter for small renovation projects.",
    location: "Kingston",
    rentalType: "daily",
    priceRate: 3500,
    depositRequirement: "JMD 5000 refundable deposit",
    deliveryPickupOptions: "pickup",
    availabilityStatus: "available",
    photos: [],
    ownerSupplierId: "review-supplier",
    supplierName: "Review Supplier",
    insuranceRequirement: "ID and accepted damage waiver required.",
    damagePolicy: "Customer pays for missing blades or new breakage.",
    cancellationPolicy: "Free cancellation before pickup.",
    safetyInstructions: "Wear eye protection and keep hands clear.",
    usageInstructions: "Use on stable surface only.",
    operatorRequired: false,
    verificationStatus: "draft",
    categoryFields: {
      powerType: "Electric",
      condition: "Good",
      accessoriesIncluded: "Blade and carrying case",
    },
    ...overrides,
  };
}

test("asset category system includes required categories and specific fields", () => {
  const labels = ASSET_CATEGORIES.map((category) => category.label);
  for (const label of ["RentasHub Car Rentals", "RentasHub Truck Rentals", "RentasHub Heavy Equipment", "RentasHub Tools & Machinery", "RentasHub Event Spaces", "RentasHub Real Estate", "RentasHub Fleet Marketplace", "RentasHub Storage & Containers", "RentasHub Specialty Assets"]) {
    assert.ok(labels.includes(label), `${label} category should exist`);
  }

  assert.ok(getCategoryById("cars").specificFields.includes("plateVin"));
  assert.ok(getCategoryById("trucks").specificFields.includes("driverIncluded"));
  assert.ok(getCategoryById("heavy-equipment").specificFields.includes("engineHours"));
  assert.ok(getCategoryById("event-spaces").specificFields.includes("noiseRules"));
  assert.ok(getCategoryById("real-estate").specificFields.includes("leaseSaleRentalOption"));
  assert.ok(getCategoryById("storage-containers").specificFields.includes("securityFeatures"));
});

test("supplier and vendor can create listings while customer cannot", () => {
  assert.equal(canCreateAssetListing(supplier), true);
  assert.equal(canCreateAssetListing(vendor), true);
  assert.equal(canCreateAssetListing(customer), false);
  assert.equal(canCreateAssetListing(null), false);
});

test("valid listing can be created and missing required fields are blocked", () => {
  const created = createAssetListing(validListing());
  assert.equal(created.valid, true);
  assert.match(created.listing.id, /^asset-/);

  const invalid = validateAssetListing(validListing({ title: "", priceRate: 0, location: "" }));
  assert.equal(invalid.valid, false);
  assert.match(invalid.errors.title, /required/);
  assert.match(invalid.errors.priceRate, /greater than 0/);
  assert.match(invalid.errors.location, /required/);
});

test("my listings returns supplier-owned listings only", () => {
  const listings = getSupplierListings(memoryStorage(), "review-supplier");
  assert.ok(listings.length >= 1);
  assert.ok(listings.every((listing) => listing.ownerSupplierId === "review-supplier"));
  assert.equal(listings.some((listing) => listing.ownerSupplierId === "supplier-two"), false);
});

test("supplier can edit own listing but not another supplier listing", () => {
  const own = SEED_LISTINGS.find((listing) => listing.ownerSupplierId === "review-supplier");
  const other = SEED_LISTINGS.find((listing) => listing.ownerSupplierId === "supplier-two");
  assert.equal(canEditAssetListing(supplier, own), true);
  assert.equal(canEditAssetListing(supplier, other), false);
  assert.equal(canEditAssetListing(otherSupplier, other), true);
  assert.equal(canEditAssetListing(customer, own), false);
});

test("asset listing routes and RBAC are wired in the standalone app", () => {
  const app = readFileSync(join(root, "src/App.jsx"), "utf8");
  for (const route of ["/list-asset", "/my-listings", "/asset/:id", "/assets/:id", "/asset/:id/edit", "/assets/:id/edit"]) {
    assert.match(app, new RegExp(`path="${route}"`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(app, /allowedRoles={\["supplier"\]}/);
  assert.match(app, /allowedRoles={\["customer", "supplier", "broker", "admin"\]}/);
});

test("asset form and pages include required fields, states, and controlled booking placeholder", () => {
  const form = readFileSync(join(root, "src/components/AssetForm.jsx"), "utf8");
  const detail = readFileSync(join(root, "src/pages/AssetDetail.jsx"), "utf8");
  const myListings = readFileSync(join(root, "src/pages/MyListings.jsx"), "utf8");
  const edit = readFileSync(join(root, "src/pages/EditAsset.jsx"), "utf8");

  for (const text of ["Asset title", "Category", "Subcategory", "Description", "Location", "Rental type", "Price/rate", "Deposit requirement", "Delivery/pickup options", "Availability status", "Insurance requirement", "Damage policy", "Cancellation policy", "Safety instructions", "Usage instructions", "Operator required", "Verification status", "Photos placeholder/upload-ready structure"]) {
    assert.match(form, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(form, /category\.specificFields\.map/);
  assert.match(detail, /Request Booking/);
  assert.match(detail, /\/asset\/\$\{listing\.id\}\/book/);
  assert.match(myListings, /No listings yet/);
  assert.match(edit, /You cannot edit a listing owned by another supplier/);
});

test("supplier dashboard quick actions connect to listing routes", () => {
  const routes = SUPPLIER_ACTIONS.map((action) => action.route);
  assert.ok(routes.includes("/list-asset"));
  assert.ok(routes.includes("/my-listings"));
  assert.ok(routes.includes("/rental-requests"));
  assert.ok(routes.includes("/messages"));
  assert.ok(routes.includes("/earnings"));
  assert.ok(routes.includes("/ai/listing-assistant"));
});

test("asset listing module remains standalone-branded without legacy routes", () => {
  for (const file of ["src/lib/assetListing.js", "src/components/AssetForm.jsx", "src/components/AssetCard.jsx", "src/pages/ListAsset.jsx", "src/pages/MyListings.jsx", "src/pages/AssetDetail.jsx", "src/pages/EditAsset.jsx"]) {
    const source = readFileSync(join(root, file), "utf8");
    assert.doesNotMatch(source, /guest-marketplace|ai-travel-planner/i, file);
  }
});
