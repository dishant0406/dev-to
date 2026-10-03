/**
 * Package the SDK and import it the way a real consumer would.
 *
 * Typechecking cannot see a broken `exports` map, a missing `types` file or a
 * CJS build that is not actually CommonJS. This script can: it packs the SDK,
 * installs the tarball into a scratch project, and imports it from both an ESM
 * and a CJS file.
 *
 *   node scripts/check-packaging.mjs
 */

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const workdir = mkdtempSync(join(tmpdir(), "devto-pack-"));

function run(command, args, cwd) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
}

try {
  console.log("Packing the SDK...");
  const tarball = run(
    "npm",
    ["pack", "--silent", "--pack-destination", workdir],
    join(root, "packages/sdk"),
  ).trim();

  writeFileSync(
    join(workdir, "package.json"),
    JSON.stringify({ name: "consumer", version: "1.0.0", private: true, type: "module" }, null, 2),
  );

  console.log("Installing the tarball into a scratch project...");
  run("npm", ["install", "--silent", "--no-audit", "--no-fund", join(workdir, tarball)], workdir);

  console.log("Importing from ESM...");
  writeFileSync(
    join(workdir, "esm.mjs"),
    `import { DevToClient, NotFoundError } from "@dishant0406/dev-to";
const client = new DevToClient({ apiKey: "x", fetch: async () => new Response("[]", { status: 200 }) });
const tags = await client.tags.list();
if (!Array.isArray(tags)) throw new Error("tags.list() did not return an array");
if (typeof NotFoundError !== "function") throw new Error("NotFoundError is not exported");
console.log("  esm ok");
`,
  );
  console.log(run(process.execPath, ["esm.mjs"], workdir));

  console.log("Importing from CJS...");
  writeFileSync(
    join(workdir, "cjs.cjs"),
    `const { DevToClient, NotFoundError } = require("@dishant0406/dev-to");
const client = new DevToClient({ apiKey: "x", fetch: async () => new Response("[]", { status: 200 }) });
client.tags.list().then((tags) => {
  if (!Array.isArray(tags)) throw new Error("tags.list() did not return an array");
  if (typeof NotFoundError !== "function") throw new Error("NotFoundError is not exported");
  console.log("  cjs ok");
});
`,
  );
  console.log(run(process.execPath, ["cjs.cjs"], workdir));

  console.log("Packaging check passed.");
} finally {
  rmSync(workdir, { recursive: true, force: true });
}
