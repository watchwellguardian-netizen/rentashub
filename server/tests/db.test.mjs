import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { createDatabase } from "../src/db/connection.js";
import { runMigrations } from "../src/db/migrator.js";
import { runSeeds } from "../src/db/seed.js";
import { TABLES } from "../src/db/schema.js";
import { createRepositories } from "../src/repositories/index.js";

async function migratedDatabase() {
  const database = await createDatabase({ filePath: ":memory:" });
  assert.equal(database.provider, "json");
  const result = await runMigrations(database);
  return { database, result };
}

test("DB connection initializes with all table contracts", async () => {
  const database = await createDatabase({ filePath: ":memory:" });
  const snapshot = database.snapshot();
  for (const table of TABLES) {
    assert.ok(Array.isArray(snapshot.tables[table]), `${table} table should initialize`);
  }
});

test("migrations run and record schema version", async () => {
  const { database, result } = await migratedDatabase();
  const expectedMigrationCount = readdirSync(join(process.cwd(), "server/migrations")).filter((file) => file.endsWith(".sql")).length;
  const migrations = database.table("schema_migrations");
  assert.equal(result.tableCount, TABLES.length);
  assert.equal(database.snapshot().schemaVersion, "001_initial_schema");
  assert.equal(migrations.length, expectedMigrationCount);
  assert.equal(migrations.some((migration) => migration.name === "004_supabase_activation_architecture.sql"), true);
});

test("seed data loads demo users, assets, bookings, protection, and trust records", async () => {
  const { database } = await migratedDatabase();
  const result = await runSeeds(database);
  assert.ok(result.recordCount >= 10);
  assert.equal(database.table("users").some((user) => user.id === "supplier-demo"), true);
  assert.equal(database.table("assets").some((asset) => asset.id === "asset-demo-excavator"), true);
  assert.equal(database.table("bookings").some((booking) => booking.id === "booking-demo-approved"), true);
});

test("asset repository can create, list, find, update, and soft delete", async () => {
  const { database } = await migratedDatabase();
  const repositories = createRepositories(database);
  const created = await repositories.assets.create({
    owner_id: "supplier-demo",
    title: "Portable generator",
    category: "small-tools-machines",
    location: "Montego Bay",
    rental_type: "daily",
    price_rate: 75,
    listing_type: "rental",
    availability_status: "available",
    verification_status: "pending",
  });

  assert.equal(created.title, "Portable generator");
  assert.equal((await repositories.assets.findById(created.id)).category, "small-tools-machines");
  assert.equal((await repositories.assets.listByOwner("supplier-demo")).length, 1);

  const updated = await repositories.assets.update(created.id, { price_rate: 90 });
  assert.equal(updated.price_rate, 90);

  await repositories.assets.softDelete(created.id);
  assert.equal(await repositories.assets.findById(created.id), null);
  assert.equal((await repositories.assets.list({}, { includeDeleted: true })).length, 1);
});

test("booking repository can create, list, find, and update", async () => {
  const { database } = await migratedDatabase();
  const repositories = createRepositories(database);
  const booking = await repositories.bookings.create({
    asset_id: "asset-demo-excavator",
    customer_id: "customer-demo",
    supplier_id: "supplier-demo",
    status: "pending",
    payment_status: "unpaid",
    total_amount: 450,
  });

  assert.equal((await repositories.bookings.findById(booking.id)).status, "pending");
  assert.equal((await repositories.bookings.listByCustomer("customer-demo")).length, 1);
  assert.equal((await repositories.bookings.listBySupplier("supplier-demo")).length, 1);

  const updated = await repositories.bookings.update(booking.id, { status: "approved" });
  assert.equal(updated.status, "approved");
});

test("audit log insert works through repository helper", async () => {
  const { database } = await migratedDatabase();
  const repositories = createRepositories(database);
  const log = await repositories.audit_logs.record("asset.created", "asset", {
    actor_id: "supplier-demo",
    entity_id: "asset-test",
  });
  assert.equal(log.action, "asset.created");
  assert.equal(database.table("audit_logs").length, 1);
});

test("generic repositories expose create/find/list/update/softDelete where appropriate", async () => {
  const { database } = await migratedDatabase();
  const repositories = createRepositories(database);
  for (const name of ["users", "assets", "bookings", "reviews", "marketplace_offers", "claims", "file_metadata"]) {
    for (const method of ["create", "findById", "list", "update", "softDelete"]) {
      assert.equal(typeof repositories[name][method], "function", `${name}.${method} should exist`);
    }
  }
});
