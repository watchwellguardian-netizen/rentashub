import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { API_CONFIG, LOCAL_STORAGE_ADAPTER_NOTICE, isLocalStorageMode } from "../../src/lib/apiClient.js";
import { ASSET_LISTINGS_STORAGE_KEY, SEED_LISTINGS } from "../../src/lib/assetListing.js";
import { BOOKING_STORAGE_KEY } from "../../src/lib/bookingService.js";
import { repositories } from "../../src/lib/repositories/index.js";

const root = process.cwd();

function memoryStorage() {
  const store = new Map([
    [ASSET_LISTINGS_STORAGE_KEY, JSON.stringify(SEED_LISTINGS)],
    [BOOKING_STORAGE_KEY, JSON.stringify([])],
  ]);
  return {
    getItem: (key) => store.get(key) || null,
    setItem: (key, value) => store.set(key, value),
  };
}

test("repository layer imports every Module 18 repository interface", () => {
  const expected = [
    "users",
    "assets",
    "bookings",
    "inspections",
    "payments",
    "messages",
    "notifications",
    "supplierProfiles",
    "verifications",
    "reviews",
    "disputes",
    "marketplaceOffers",
    "wantedRequests",
    "trustRisk",
    "protectionPlans",
    "claims",
  ];
  assert.deepEqual(Object.keys(repositories), expected);
  for (const key of expected) {
    assert.ok(repositories[key], `${key} repository should import`);
    assert.match(repositories[key].notice, /localStorage|Temporary/i);
  }
});

test("localStorage mode remains active by default", () => {
  assert.equal(API_CONFIG.appEnv, "local");
  assert.equal(API_CONFIG.localStorageMode, true);
  assert.equal(isLocalStorageMode(), true);
  assert.match(LOCAL_STORAGE_ADAPTER_NOTICE, /Temporary localStorage repository adapter/);
});

test("repository wrappers keep existing localStorage workflows available", () => {
  const storage = memoryStorage();
  const listings = repositories.assets.list(storage);
  assert.ok(listings.length >= 1);
  assert.equal(repositories.assets.getById(storage, "asset-seed-supplier-1").id, "asset-seed-supplier-1");
  assert.deepEqual(repositories.bookings.list(storage), []);
  assert.deepEqual(repositories.disputes.list(storage), []);
  assert.ok(repositories.protectionPlans.list().length >= 1);
  assert.ok(repositories.users.getById(storage, "review-customer"));
});

test("environment example includes backend readiness variables", () => {
  const env = readFileSync(join(root, ".env.example"), "utf8");
  for (const key of [
    "VITE_API_BASE_URL",
    "VITE_APP_ENV",
    "VITE_ENABLE_LOCAL_STORAGE_MODE",
    "VITE_PAYMENT_PROVIDER",
    "VITE_NOTIFICATION_PROVIDER",
    "VITE_FILE_STORAGE_PROVIDER",
  ]) {
    assert.match(env, new RegExp(`^${key}=`, "m"));
  }
});

test("backend API and migration documentation are present", () => {
  const blueprintPath = join(root, "docs/backend-api-blueprint.md");
  const migrationPath = join(root, "docs/localstorage-to-backend-migration.md");
  assert.equal(existsSync(blueprintPath), true);
  assert.equal(existsSync(migrationPath), true);
  const blueprint = readFileSync(blueprintPath, "utf8");
  const migration = readFileSync(migrationPath, "utf8");
  for (const text of ["Proposed Entities", "REST API Routes", "Auth/RBAC Model", "Proposed Database Tables", "File Storage Needs", "Payment Provider Placeholder", "Notification Provider Placeholder", "Security Requirements"]) {
    assert.match(blueprint, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  for (const text of ["authentication", "users", "assets", "bookings", "payments ledger", "files/documents", "notifications", "ID collisions", "stale browser storage", "file metadata without real files"]) {
    assert.match(migration, new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  }
});

test("pages do not hardcode future backend URLs or production-ready wording", () => {
  const pageFiles = [
    "src/App.jsx",
    "src/pages/BookingPayment.jsx",
    "src/pages/ProtectionPages.jsx",
    "src/pages/AdminCenter.jsx",
    "src/pages/MarketplaceSearch.jsx",
    "src/pages/AssetDetail.jsx",
  ];
  for (const file of pageFiles) {
    const source = readFileSync(join(root, file), "utf8");
    assert.doesNotMatch(source, /https?:\/\/(api|backend|server)\./i, file);
    assert.doesNotMatch(source, /VITE_API_BASE_URL/i, file);
    assert.doesNotMatch(source, /production-ready|production ready/i, file);
  }
});

test("repository source documents localStorage as temporary backend adapter", () => {
  const apiClient = readFileSync(join(root, "src/lib/apiClient.js"), "utf8");
  const index = readFileSync(join(root, "src/lib/repositories/index.js"), "utf8");
  assert.match(apiClient, /backend\/API adapter/);
  assert.match(apiClient, /localStorage adapters/);
  assert.match(index, /claimsRepository/);
});
