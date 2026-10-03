/**
 * Verify what each package looks like to a real consumer.
 *
 * Typechecking cannot see a broken `exports` map, a missing `types` file, a CJS
 * build that is not actually CommonJS, or a `bin` that `npm publish` silently
 * drops. This script can: it packs the SDK, installs the tarball into a scratch
 * project and imports it from both ESM and CJS, then dry-run publishes both
 * packages and fails if npm reports that it would drop any metadata.
 *
 *   node scripts/check-packaging.mjs
 */

import { execFileSync, spawnSync } from "node:child_process";
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

/**
 * `npm pack` keeps the bin, but `npm publish` silently drops a bin whose path
 * starts with "./". A published CLI with no bin installs no command at all, so
 * check the real publish path for every package. `--dry-run` needs no token.
 */
function checkPublishMetadata(dir, name) {
  const result = spawnSync("npm", ["publish", "--dry-run", "--json"], {
    cwd: dir,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(`npm publish --dry-run failed for ${name}:\n${result.stderr}`);
  }
  if (/was invalid and removed/.test(result.stderr)) {
    throw new Error(
      `${name} has invalid publish metadata that npm would silently drop:\n${result.stderr.trim()}`,
    );
  }

  console.log(`  ${name} publish metadata ok`);
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

  console.log("Checking publish metadata...");
  checkPublishMetadata(join(root, "packages/sdk"), "@dishant0406/dev-to");
  checkPublishMetadata(join(root, "packages/cli"), "@dishant0406/dev-to-cli");

  console.log("Packaging check passed.");
} finally {
  rmSync(workdir, { recursive: true, force: true });
}
