/**
 * Check the vendored OpenAPI spec against the published one.
 *
 * The Forem API changes without warning — the spec already disagrees with the
 * live API in several places. This script is how that drift gets noticed: CI runs
 * it on a schedule, and it fails when the checked-in copy is out of date.
 *
 *   node scripts/check-spec-drift.mjs           # compare (exit 1 on drift)
 *   node scripts/check-spec-drift.mjs --update  # replace the vendored copy
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SOURCE = "https://developers.forem.com/redocusaurus/plugin-redoc-1.yaml";
const target = fileURLToPath(new URL("../spec/forem-api-v1.yaml", import.meta.url));
const update = process.argv.includes("--update");

async function download() {
  const response = await fetch(SOURCE);
  if (!response.ok) {
    throw new Error(`Could not download the spec: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

function countOperations(text) {
  // Counting path keys is enough to detect a real change without a YAML parser.
  const paths = text.match(/^ {2}\/api\//gm) ?? [];
  const methods = text.match(/^ {4}(get|post|put|patch|delete):/gm) ?? [];
  return { paths: paths.length, operations: methods.length };
}

const remote = await download();
const local = readFileSync(target, "utf8");

if (remote === local) {
  console.log("Spec is up to date.");
  process.exit(0);
}

const before = countOperations(local);
const after = countOperations(remote);

if (update) {
  writeFileSync(target, remote);
  console.log(
    `Updated spec/forem-api-v1.yaml (${before.operations} -> ${after.operations} operations).`,
  );
  console.log("Run `npm test` to see whether coverage.ts needs new entries.");
  process.exit(0);
}

console.error("The published Forem API spec has changed.");
console.error(`  vendored: ${before.paths} paths, ${before.operations} operations`);
console.error(`  upstream: ${after.paths} paths, ${after.operations} operations`);
console.error("");
console.error("Run `npm run spec:update` to refresh it, then `npm test` to check coverage.");
process.exit(1);
