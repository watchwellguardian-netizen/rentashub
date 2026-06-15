import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function run(command, args, label, { optional = false } = {}) {
  return new Promise((resolve, reject) => {
    console.log(`\n[verify] ${label}`);
    const child = spawn(command, args, { cwd: root, stdio: "inherit", shell: process.platform === "win32" });
    child.on("close", (code) => {
      if (code === 0) {
        console.log(`[verify] PASS: ${label}`);
        resolve();
        return;
      }
      const message = `[verify] ${optional ? "SKIP/FAIL" : "FAIL"}: ${label} exited with ${code}`;
      if (optional) {
        console.warn(message);
        resolve();
      } else {
        reject(new Error(message));
      }
    });
  });
}

async function main() {
  console.log("[verify] RentasHub standalone verification");
  if (!existsSync(join(root, "package.json"))) throw new Error("[verify] package.json was not found.");
  if (!existsSync(join(root, ".env.example"))) throw new Error("[verify] .env.example was not found.");
  if (!existsSync(join(root, "src/lib/repositories/index.js"))) throw new Error("[verify] repository index was not found.");
  if (!existsSync(join(root, "server/src/db/connection.js"))) throw new Error("[verify] backend database adapter was not found.");
  if (!existsSync(join(root, "server/src/db/databaseProvider.js"))) throw new Error("[verify] backend database provider was not found.");
  if (!existsSync(join(root, "server/src/config/integrationReadiness.js"))) throw new Error("[verify] integration readiness config was not found.");
  if (!existsSync(join(root, "server/migrations/001_initial_schema.sql"))) throw new Error("[verify] backend initial migration was not found.");
  if (!existsSync(join(root, "docs/production-credential-readiness.md"))) throw new Error("[verify] production credential readiness doc was not found.");
  console.log("[verify] PASS: required project files exist");

  await run("npm", ["--version"], "dependency tool check: npm is available");
  await run("npm", ["run", "test"], "production test suite");
  await run("npm", ["run", "test:server"], "backend scaffold test suite");
  await run("npm", ["run", "readiness"], "credential-level readiness report");
  await run("npm", ["run", "build"], "production build");

  if (process.env.RENTASHUB_VERIFY_SMOKE === "1") {
    console.log("[verify] Route smoke checks are optional. Start preview separately, then run browser or HTTP checks against the selected port.");
  } else {
    console.log("[verify] SKIP: optional route smoke checks. Set RENTASHUB_VERIFY_SMOKE=1 for manual smoke-check guidance.");
  }

  console.log("\n[verify] All required local verification steps passed.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
