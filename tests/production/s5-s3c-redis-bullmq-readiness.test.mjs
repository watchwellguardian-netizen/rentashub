import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  LocalBullmqQueue,
  createRedisBullmqReadinessEvidence,
  redactRedisUrl,
  tenantQueueName,
  validateRedisConfig,
} from "../../server/src/queues/redisBullmqReadiness.js";

test("Redis config validates local and redacts credential-bearing URLs", () => {
  const local = validateRedisConfig({ mode: "local" });
  assert.equal(local.status, "READY");
  assert.equal(local.safeForRuntime, true);

  const redis = validateRedisConfig({ mode: "redis", redisUrl: "redis://default:super-secret@localhost:6379/0" });
  assert.equal(redis.status, "READY");
  assert.equal(redis.safeForRuntime, true);
  assert.doesNotMatch(JSON.stringify(redis), /super-secret/);
  assert.match(redis.sanitizedUrl, /REDACTED/);
  assert.equal(redactRedisUrl("redis://default:secret@localhost:6379/0"), "redis://default:REDACTED@localhost:6379/0");
});

test("Redis config blocks production-like and missing external targets", () => {
  const missing = validateRedisConfig({ mode: "redis" });
  assert.equal(missing.status, "BLOCKED");
  assert.equal(missing.code, "missing_redis_url");

  const remote = validateRedisConfig({ mode: "redis", redisUrl: "rediss://default:secret@prod-redis.upstash.io:6379/0" });
  assert.equal(remote.status, "BLOCKED");
  assert.equal(remote.safeForRuntime, false);
  assert.doesNotMatch(JSON.stringify(remote), /secret/);
});

test("tenant queue names are isolated and normalized", () => {
  assert.equal(tenantQueueName({ tenantId: "Tenant A", queue: "Rental Events" }), "rentashub:tenant-a:rental-events");
  assert.notEqual(
    tenantQueueName({ tenantId: "tenant-a", queue: "rental-events" }),
    tenantQueueName({ tenantId: "tenant-b", queue: "rental-events" }),
  );
  assert.throws(() => tenantQueueName({ tenantId: "!!!", queue: "rental-events" }), /empty/);
});

test("local BullMQ-compatible queue supports enqueue, processing, delays, dedupe, and metrics", () => {
  const queue = new LocalBullmqQueue({ tenantId: "tenant-a", name: "jobs", defaultAttempts: 2 });
  const job = queue.enqueue("asset.index", { assetId: "asset-1" }, { dedupeKey: "asset-1:index" });
  const duplicate = queue.enqueue("asset.index", { assetId: "asset-1" }, { dedupeKey: "asset-1:index" });
  const delayed = queue.enqueue("asset.reminder", { assetId: "asset-1" }, { delayMs: 500 });
  assert.equal(job.status, "queued");
  assert.equal(duplicate.deduplicated, true);
  assert.equal(delayed.status, "delayed");

  const processed = queue.processJob(job.id, () => ({ indexed: true }));
  assert.equal(processed.status, "completed");
  assert.equal(queue.metrics().completed, 1);
});

test("local queue handles retries, dead letters, poison messages, cancellation, cleanup, and shutdown", () => {
  const queue = new LocalBullmqQueue({ tenantId: "tenant-a", name: "failures", defaultAttempts: 2, defaultBackoffMs: 1 });
  const retry = queue.enqueue("retry.me", {}, { dedupeKey: "retry" });
  const retryResult = queue.processJob(retry.id, () => {
    throw new Error("temporary failure");
  });
  assert.equal(retryResult.status, "retry_scheduled");

  const poison = queue.enqueue("poison.me", {}, { attempts: 2, dedupeKey: "poison" });
  const poisonResult = queue.processJob(poison.id, () => {
    const error = new Error("bad payload");
    error.code = "POISON_MESSAGE";
    throw error;
  });
  assert.equal(poisonResult.status, "dead_lettered");

  const delayed = queue.enqueue("cancel.me", {}, { delayMs: 500 });
  assert.equal(queue.cancel(delayed.id).status, "cancelled");
  assert.equal(queue.metrics().deadLettered, 1);
  assert.equal(queue.shutdown().status, "shutdown");
  assert.throws(() => queue.enqueue("after.shutdown"), /closed/);
  assert.equal(queue.cleanup().status, "cleaned");
});

test("S5-S3C evidence reports engineering-complete status without live Redis claims", () => {
  const evidence = createRedisBullmqReadinessEvidence();
  assert.equal(evidence.status, "REDIS_ENGINEERING_COMPLETE");
  assert.equal(evidence.bullmqStatus, "BULLMQ_ENGINEERING_COMPLETE");
  assert.equal(evidence.liveCiExecution, "LIVE_CI_EXECUTION_PENDING");
  assert.equal(evidence.productionTouched, false);
  assert.equal(evidence.liveRedisTouched, false);
  assert.equal(evidence.queue.tenantIsolation, true);
  assert.equal(evidence.queue.deduplication, true);
  assert.equal(evidence.queue.poisonHandling, true);
});

test("S5-S3C workflow declares disposable Redis service and no production activation", () => {
  const workflow = readFileSync(".github/workflows/redis-bullmq-runtime-validation.yml", "utf8");
  for (const required of [
    "image: redis:7",
    "redis-cli ping",
    "REDIS_PROVIDER: redis",
    "REDIS_URL: redis://localhost:6379/0",
    "REDIS_CONFIRM_DISPOSABLE: \"true\"",
    "node scripts/s5-s3c-redis-bullmq-readiness.mjs json",
  ]) {
    assert.match(workflow, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(workflow, /\*upstash\*\|\*redis\.com\*\|\*amazonaws\.com\*\|\*prod\*\|\*production\*/);
  assert.doesNotMatch(workflow, /REDIS_PASSWORD|SUPABASE_SERVICE_ROLE_KEY|rediss:\/\/[^:\s]+:[^@\s]+@/i);
});
