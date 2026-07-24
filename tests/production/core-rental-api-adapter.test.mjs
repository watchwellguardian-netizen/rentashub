import assert from "node:assert/strict";
import { test } from "node:test";
import { coreRentalApiAdapter } from "../../src/lib/adapters/coreRentalApiAdapter.js";

test("core rental API adapter remains behind feature flag and localStorage fallback", async () => {
  const readiness = coreRentalApiAdapter.readiness();
  assert.equal(readiness.enabled, false);
  assert.equal(readiness.status, "legacy_local_storage_fallback");
  assert.match(readiness.removalPath, /A4 persistence/);

  const quote = await coreRentalApiAdapter.quote({ asset_id: "asset-demo-excavator" });
  assert.equal(quote.enabled, false);
  assert.equal(quote.status, "legacy_local_storage_fallback");
});
