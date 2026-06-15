import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

const categoryRoutes = [
  "/marketplace/cars",
  "/marketplace/trucks",
  "/marketplace/heavy-equipment",
  "/marketplace/small-tools-machines",
  "/marketplace/event-spaces",
  "/marketplace/real-estate",
  "/marketplace/storage-containers",
  "/marketplace/specialty-assets",
];

test("landing page and category product templates are wired", () => {
  const app = read("src/App.jsx");
  assert.match(app, /path="\/" element={<LandingPage \/>}/);
  assert.match(app, /path="\/landing" element={<LandingPage \/>}/);
  assert.match(app, /path="\/marketplace\/:categorySlug" element={<CategoryProductPage \/>}/);
  assert.equal(existsSync(join(root, "src/pages/LandingPage.jsx")), true);
  assert.equal(existsSync(join(root, "src/pages/CategoryProductPage.jsx")), true);
});

test("design system tokens and typography are defined", () => {
  const css = read("src/styles.css");
  for (const token of ["#0A4DA3", "#F58220", "#0B1F3A", "#F7FAFC"]) {
    assert.match(css, new RegExp(token.replace("#", "\\#")), `${token} should be present`);
  }
  assert.match(css, /fonts\.googleapis\.com/);
  assert.match(css, /family=Sora/);
  assert.match(css, /family=Sora:wght@600;700;800/);
  assert.match(css, /font-family: Manrope/);
  assert.match(css, /border-radius: 32px/);
  assert.match(css, /box-shadow: var\(--brand-shadow\)/);
});

test("landing page includes required investor-demo sections without false live claims", () => {
  const source = read("src/pages/LandingPage.jsx");
  for (const phrase of [
    "Search Marketplace",
    "List Your Asset",
    "floating-trust-card",
    "$4.2B+",
    "14k+",
    "98.8%",
    "How It Works",
    "Trust & Safety Layer",
    "Supplier Value",
    "Customer Value",
    "mobile-bottom-cta",
    "landing-footer",
  ]) {
    assert.match(source, new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${phrase} should be in landing page`);
  }
  assert.match(source, /activation remains pending|still require external activation/i);
  assert.doesNotMatch(source, /live payments active|live escrow active|production ready|public launch approved/i);
});

test("category content covers eight requested product pages with unique FAQs", () => {
  const content = read("src/lib/landingContent.js");
  for (const slug of ["cars", "trucks", "heavy-equipment", "small-tools-machines", "event-spaces", "real-estate", "storage-containers", "specialty-assets"]) {
    const keyPattern = new RegExp(`["']?${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']?:`);
    assert.match(content, keyPattern, `${slug} product content should exist`);
  }
  const faqCount = (content.match(/faqs: \[/g) || []).length;
  assert.equal(faqCount, 8, "each category should include FAQ content");
  assert.match(read("src/pages/CategoryProductPage.jsx"), /details/);
  assert.match(read("src/pages/CategoryProductPage.jsx"), /bookingSteps/);
});

test("sitemap and robots expose landing, category, and public auction pages", () => {
  const sitemap = read("public/sitemap.xml");
  const robots = read("public/robots.txt");
  assert.match(robots, /Sitemap: \/sitemap\.xml/);
  assert.match(sitemap, /<loc>\/<\/loc>/);
  for (const route of categoryRoutes) {
    assert.match(sitemap, new RegExp(`<loc>${route}</loc>`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${route} should be in sitemap`);
  }
  for (const route of ["/auctions", "/auctions/live", "/auctions/upcoming", "/auctions/ending-soon", "/auction-calendar", "/auction-rules", "/auction-legal-disclosures", "/how-auctions-work"]) {
    assert.match(sitemap, new RegExp(`<loc>${route}</loc>`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")), `${route} should be in sitemap`);
  }
  const locCount = (sitemap.match(/<loc>/g) || []).length;
  assert.equal(locCount, 17);
});
