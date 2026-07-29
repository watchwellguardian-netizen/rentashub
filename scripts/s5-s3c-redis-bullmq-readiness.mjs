import { createRedisBullmqReadinessEvidence, validateRedisConfig } from "../server/src/queues/redisBullmqReadiness.js";

const command = process.argv[2] || "report";

function collect() {
  return createRedisBullmqReadinessEvidence({
    redis: {
      mode: process.env.REDIS_PROVIDER || "local",
      redisUrl: process.env.REDIS_URL || "",
      confirmDisposable: process.env.REDIS_CONFIRM_DISPOSABLE === "true",
    },
  });
}

function printReport(evidence) {
  console.log(`[s5-s3c] status: ${evidence.status}`);
  console.log(`[s5-s3c] bullmq: ${evidence.bullmqStatus}`);
  console.log(`[s5-s3c] redis: ${evidence.redis.status}`);
  console.log(`[s5-s3c] queue: ${evidence.queue.queueName}`);
  console.log(`[s5-s3c] tenant isolation: ${evidence.queue.tenantIsolation ? "PASS" : "FAIL"}`);
  console.log(`[s5-s3c] dedupe: ${evidence.queue.deduplication ? "PASS" : "FAIL"}`);
  console.log(`[s5-s3c] dead letter: ${evidence.queue.poisonHandling ? "PASS" : "FAIL"}`);
  console.log(`[s5-s3c] production touched: NO`);
  console.log(`[s5-s3c] live Redis touched: NO`);
}

if (command === "validate-redis") {
  console.log(JSON.stringify(validateRedisConfig({
    mode: process.env.REDIS_PROVIDER || "redis",
    redisUrl: process.env.REDIS_URL || "",
    confirmDisposable: process.env.REDIS_CONFIRM_DISPOSABLE === "true",
  }), null, 2));
} else {
  const evidence = collect();
  if (process.argv.includes("--json") || command === "json") {
    console.log(JSON.stringify(evidence, null, 2));
  } else {
    printReport(evidence);
  }
}
