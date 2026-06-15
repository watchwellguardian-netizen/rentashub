import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { test } from "node:test";

const root = process.cwd();
const retiredProductName = "Rent" + "Broker Nexus";
const retiredParentName = "Plannas" + "Hub";
const retiredChildPrefix = "/" + "rent" + "broker";

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (["dist", "node_modules"].includes(name)) return [];
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

test("package and app metadata identify RentasHub standalone product", () => {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const manifest = JSON.parse(readFileSync(join(root, "public/manifest.json"), "utf8"));
  const html = readFileSync(join(root, "index.html"), "utf8");

  assert.equal(pkg.name, "rentashub");
  assert.match(pkg.description, /RentasHub is a standalone marketplace/);
  assert.equal(manifest.name, "RentasHub");
  assert.equal(manifest.short_name, "RentasHub");
  assert.match(html, /<title>RentasHub<\/title>/);
  assert.doesNotMatch(html, new RegExp(retiredProductName));
  assert.doesNotMatch(html, new RegExp(retiredParentName));
});

test("standalone routes are clean and do not require a retired child prefix", () => {
  const app = readFileSync(join(root, "src/App.jsx"), "utf8");
  for (const route of ["/", "/login", "/dashboard", "/customer-dashboard", "/supplier-dashboard", "/search", "/bookings", "/messages", "/list-asset", "/ai-help"]) {
    assert.match(app, new RegExp(route === "/" ? 'path="/"' : `path="${route}"`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(app, new RegExp(retiredChildPrefix, "i"));
});

test("standalone source has no retired imports, links, or user-facing branding", () => {
  for (const file of walk(join(root, "src"))) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, new RegExp(retiredProductName), relative(root, file));
    assert.doesNotMatch(source, new RegExp(retiredParentName), relative(root, file));
    assert.doesNotMatch(source, new RegExp(retiredChildPrefix, "i"), relative(root, file));
    assert.doesNotMatch(source, /guest-marketplace|ai-travel-planner/i, relative(root, file));
  }
});

test("legacy isolation document explains standalone deployment", () => {
  const doc = readFileSync(join(root, "docs/standalone-separation.md"), "utf8");
  assert.match(doc, /Standalone RentasHub product/);
  assert.match(doc, /not a child module/);
  assert.match(doc, /does not require a child-route prefix/);
  assert.match(doc, /can be zipped, downloaded, and deployed independently/);
});

test("brand constants and category naming use RentasHub convention", async () => {
  const brand = await import("../../src/lib/brand.js");
  const listing = await import("../../src/lib/assetListing.js");
  assert.equal(brand.APP_NAME, "RentasHub");
  assert.equal(brand.APP_TAGLINE, "Rent. Buy. Sell. Trade. Auction.");
  assert.match(brand.APP_DESCRIPTION, /rent, buy, sell, trade, auction/);
  assert.deepEqual(
    listing.ASSET_CATEGORIES.map((category) => category.label),
    [
      "RentasHub Car Rentals",
      "RentasHub Truck Rentals",
      "RentasHub Heavy Equipment",
      "RentasHub Tools & Machinery",
      "RentasHub Event Spaces",
      "RentasHub Real Estate",
      "RentasHub Fleet Marketplace",
      "RentasHub Storage & Containers",
      "RentasHub Specialty Assets",
    ],
  );
});
