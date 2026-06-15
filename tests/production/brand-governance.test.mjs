import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  AI_BRAND_NAMES,
  APP_DESCRIPTION,
  APP_NAME,
  APP_TAGLINE,
  BRAND_COLORS,
  BRAND_TYPOGRAPHY,
  CATEGORY_BRAND_LABELS,
  FEATURE_PAGE_NAMES,
  LOGO_VERSIONS,
} from "../../src/lib/brand.js";

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

test("official RentasHub brand constants match governance standard", () => {
  assert.equal(APP_NAME, "RentasHub");
  assert.equal(APP_TAGLINE, "Rent. Buy. Sell. Trade.");
  assert.match(APP_DESCRIPTION, /unified marketplace/);
  assert.equal(BRAND_COLORS.primaryBlue, "#0A4DA3");
  assert.equal(BRAND_COLORS.marketplaceOrange, "#F58220");
  assert.equal(BRAND_COLORS.white, "#FFFFFF");
  assert.equal(BRAND_COLORS.darkNavy, "#0B1F3A");
  assert.equal(BRAND_TYPOGRAPHY.primary, "Sora SemiBold");
  assert.ok(BRAND_TYPOGRAPHY.fallbacks.includes("Manrope"));
});

test("logo system is codified without importing legacy logo assets", () => {
  assert.equal(LOGO_VERSIONS.master.defaultUse, true);
  assert.equal(LOGO_VERSIONS.hero.marketingOnly, true);
  assert.equal(LOGO_VERSIONS.appIcon.textAllowed, false);

  const logo = read("src/components/BrandLogo.jsx");
  assert.match(logo, /BrandIcon/);
  assert.match(logo, /APP_TAGLINE/);
  assert.doesNotMatch(logo, /PlannasHub|ChatGPT Image|\\.png|vehicle|excavator/i);
});

test("category and feature naming begins with RentasHub", () => {
  for (const label of Object.values(CATEGORY_BRAND_LABELS)) {
    assert.match(label, /^RentasHub /);
  }
  assert.equal(CATEGORY_BRAND_LABELS.cars, "RentasHub Car Rentals");
  assert.equal(CATEGORY_BRAND_LABELS.trucks, "RentasHub Truck Rentals");
  assert.equal(CATEGORY_BRAND_LABELS["heavy-equipment"], "RentasHub Heavy Equipment");
  assert.equal(CATEGORY_BRAND_LABELS["small-tools-machines"], "RentasHub Tools & Machinery");
  assert.equal(CATEGORY_BRAND_LABELS["event-spaces"], "RentasHub Event Spaces");
  assert.equal(CATEGORY_BRAND_LABELS["real-estate"], "RentasHub Real Estate");
  assert.equal(CATEGORY_BRAND_LABELS["storage-containers"], "RentasHub Storage & Containers");
  assert.equal(CATEGORY_BRAND_LABELS["specialty-assets"], "RentasHub Specialty Assets");

  for (const label of Object.values(FEATURE_PAGE_NAMES)) {
    assert.match(label, /^RentasHub /);
  }
  assert.equal(FEATURE_PAGE_NAMES.customerDashboard, "RentasHub Customer Dashboard");
  assert.equal(FEATURE_PAGE_NAMES.supplierDashboard, "RentasHub Supplier Dashboard");
  assert.equal(FEATURE_PAGE_NAMES.admin, "RentasHub Admin Control Center");
});

test("AI assistant names use RentasHub AI convention", () => {
  for (const label of Object.values(AI_BRAND_NAMES)) {
    assert.match(label, /^RentasHub AI/);
  }
  assert.equal(AI_BRAND_NAMES.marketInsights, "RentasHub AI Marketplace Insights");
});

test("CSS uses approved brand palette and Sora-first typography", () => {
  const css = read("src/styles.css");
  assert.match(css, /--brand-blue: #0A4DA3/);
  assert.match(css, /--brand-orange: #F58220/);
  assert.match(css, /--brand-navy: #0B1F3A/);
  assert.match(css, /font-family: Sora, Manrope, Montserrat, Outfit/);
  assert.match(css, /\.brand-logo/);
  assert.match(css, /\.brand-icon/);
  assert.match(css, /\.global-brand-mark/);
});

test("global brand mark is mounted so every route has logo representation", () => {
  const app = read("src/App.jsx");
  const mark = read("src/components/GlobalBrandMark.jsx");
  assert.match(app, /<GlobalBrandMark \/>/);
  assert.match(mark, /BrandLogo compact/);
  assert.match(mark, /to="\/"/);
});

test("brand governance documentation is present and rejects legacy branding", () => {
  const doc = read("docs/brand-governance.md");
  assert.match(doc, /Official brand governance v1\.0/);
  assert.match(doc, /Version A - Master Brand Logo/);
  assert.match(doc, /Version B - Marketplace Hero Logo/);
  assert.match(doc, /Version C - App Icon/);
  assert.match(doc, /No legacy branding/);
  assert.match(doc, /No PlannasHub references/);
  assert.match(doc, /No RentBroker references/);
});
