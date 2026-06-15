import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { NOTIFICATION_STORAGE_KEY, getUserNotifications } from "../../src/lib/notificationService.js";
import {
  SUPPLIER_PROFILE_STORAGE_KEY,
  VERIFICATION_DOCUMENTS,
  calculateProfileCompleteness,
  canManageSupplierProfile,
  getSupplierProfile,
  getSupplierPublicSummary,
  isSupplierVerified,
  submitVerification,
  upsertSupplierProfile,
} from "../../src/lib/supplierProfile.js";

const root = process.cwd();
const supplier = { id: "review-supplier", role: "supplier", full_name: "Review Supplier", email: "supplier@rentashub.local" };
const vendor = { id: "review-supplier", role: "vendor", full_name: "Review Vendor", email: "vendor@rentashub.local" };
const customer = { id: "review-customer", role: "customer", full_name: "Review Customer" };

function storage(profiles = [], notifications = []) {
  const store = new Map([
    [SUPPLIER_PROFILE_STORAGE_KEY, JSON.stringify(profiles)],
    [NOTIFICATION_STORAGE_KEY, JSON.stringify(notifications)],
  ]);
  return {
    getItem: (key) => store.get(key) || null,
    setItem: (key, value) => store.set(key, value),
  };
}

function profileInput(overrides = {}) {
  return {
    businessName: "Review Rentals Ltd",
    contactPerson: "Review Supplier",
    phone: "555-0100",
    email: "supplier@rentashub.local",
    businessAddress: "12 Market Road",
    serviceAreas: "Kingston, Spanish Town",
    supplierType: "company",
    bio: "Helpful local rental supplier.",
    businessHours: "Mon-Fri 8-5",
    emergencyContact: "555-0199",
    publicSummary: "Verified-style local rental supplier summary.",
    ...overrides,
  };
}

test("supplier profile and verification routes are wired as supplier-only management routes", () => {
  const app = readFileSync(join(root, "src/App.jsx"), "utf8");
  for (const route of ["/supplier-profile", "/supplier-profile/edit", "/verification", "/verification/status"]) {
    assert.match(app, new RegExp(`path="${route}"`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(app, /allowedRoles={\["supplier"\]}/);
  assert.equal(canManageSupplierProfile(supplier, "review-supplier"), true);
  assert.equal(canManageSupplierProfile(vendor, "review-supplier"), true);
  assert.equal(canManageSupplierProfile(customer, "review-supplier"), false);
  assert.equal(canManageSupplierProfile(null, "review-supplier"), false);
});

test("supplier can create and update own business profile", () => {
  const local = storage();
  const result = upsertSupplierProfile(local, supplier, profileInput());
  assert.equal(result.valid, true);
  assert.equal(result.profile.businessName, "Review Rentals Ltd");
  assert.equal(result.profile.supplierType, "company");
  assert.equal(calculateProfileCompleteness(result.profile), 100);
  assert.equal(getSupplierProfile(local, "review-supplier").phone, "555-0100");
});

test("customer cannot edit supplier profile", () => {
  const result = upsertSupplierProfile(storage(), customer, profileInput());
  assert.equal(result.valid, false);
  assert.match(result.error, /Only suppliers/);
});

test("supplier can submit verification checklist and receives notification", () => {
  const local = storage();
  upsertSupplierProfile(local, supplier, profileInput());
  const selected = Object.fromEntries(VERIFICATION_DOCUMENTS.map((doc) => [doc, true]));
  const result = submitVerification(local, supplier, selected);
  assert.equal(result.valid, true);
  assert.equal(result.profile.verificationStatus, "pending");
  assert.equal(Object.values(result.profile.verificationDocuments).every((doc) => doc.submitted), true);
  assert.equal(getUserNotifications(local, "review-supplier").some((note) => note.type === "verification_submitted"), true);
});

test("supplier sees verification status and public summary is customer-readable", () => {
  const local = storage();
  upsertSupplierProfile(local, supplier, profileInput());
  const summary = getSupplierPublicSummary(local, "review-supplier");
  assert.equal(summary.businessName, "Review Rentals Ltd");
  assert.match(summary.publicSummary, /local rental supplier/);
  assert.equal(summary.verificationStatus, "not_started");
});

test("asset detail, asset cards, and supplier dashboard show supplier profile trust signals", () => {
  const detail = readFileSync(join(root, "src/pages/AssetDetail.jsx"), "utf8");
  const card = readFileSync(join(root, "src/components/AssetCard.jsx"), "utf8");
  const dashboard = readFileSync(join(root, "src/pages/SupplierDashboard.jsx"), "utf8");
  assert.match(detail, /Supplier verification/);
  assert.match(detail, /getSupplierPublicSummary/);
  assert.match(card, /Verified supplier/);
  assert.match(card, /getSupplierPublicSummary/);
  assert.match(dashboard, /Profile completeness/);
  assert.match(dashboard, /verificationStatus/);
});

test("verification pages include required placeholders and simulated review language", () => {
  for (const file of ["src/pages/SupplierProfile.jsx", "src/pages/SupplierProfileEdit.jsx", "src/pages/VerificationPage.jsx", "src/pages/VerificationStatus.jsx", "src/lib/supplierProfile.js"]) {
    const source = readFileSync(join(root, file), "utf8");
    assert.doesNotMatch(source, /guest-marketplace|ai-travel-planner/i);
    assert.doesNotMatch(source, new RegExp("real KYC " + "verified|legally verified", "i"));
  }
  const verification = `${readFileSync(join(root, "src/pages/VerificationPage.jsx"), "utf8")}\n${readFileSync(join(root, "src/lib/supplierProfile.js"), "utf8")}`;
  for (const text of ["ID document", "Business registration", "Proof of address", "Insurance document", "Asset ownership proof", "Operator certification", "Document review is simulated/local"]) {
    assert.match(verification, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("verified supplier helper supports listing/search badge state", () => {
  const local = storage([{ ...profileInput(), supplierId: "review-supplier", verificationStatus: "verified" }]);
  assert.equal(isSupplierVerified(local, "review-supplier"), true);
  assert.equal(isSupplierVerified(local, "supplier-two"), false);
});
