/**
 * `devto api <method> <path>` — the escape hatch.
 *
 * This command reaches every endpoint, including ones this CLI does not wrap yet
 * and ones added to the API after this release. It is what makes the tool
 * "completely granular" no matter how the API changes.
 *
 * Because it can call anything, it obeys the same safety rules as the rest of the
 * CLI: `--dry-run` sends nothing, and a request that changes data asks for
 * confirmation unless `--yes` was passed.
 */

import { Command } from "commander";
import {
  collectKeyValues,
  confirm,
  dryRunNotice,
  globalOf,
  openClient,
  readJsonInput,
} from "../helpers.js";
import { info, print } from "../output.js";

/** Methods that change or remove data, so they need confirmation. */
const WRITE_METHODS = ["POST", "PUT", "PATCH", "DELETE"];

export function registerApiCommands(program: Command): void {
  program
    .command("api")
    .description("Send a raw request to any endpoint")
    .argument("<method>", "HTTP method: GET, POST, PUT, PATCH or DELETE")
    .argument("<path>", "API path, for example /api/articles")
    .option("-q, --query <key=value...>", "query parameter (repeatable)")
    .option("-d, --data <json>", "request body as JSON, @file.json, or - for stdin")
    .addHelpText(
      "after",
      `
Examples:
  devto api GET /api/articles --query tag=rust --query per_page=5
  devto api GET /api/articles/me
  devto api POST /api/follows --data '{"user_ids":[1,2]}'
  devto api PUT /api/articles/123/unpublish

Methods other than GET ask for confirmation. Pass --yes to skip the prompt, or
--dry-run to see the request without sending it.`,
    )
    .action(
      async (
        method: string,
        path: string,
        options: { query?: string[]; data?: string },
        command: Command,
      ) => {
        const global = globalOf(command);
        const { client, options: output, dryRun } = await openClient(global);
        const httpMethod = method.toUpperCase();
        const query = collectKeyValues(options.query ?? []);
        const body = options.data === undefined ? undefined : await readJsonInput(options.data);

        if (dryRun) {
          dryRunNotice(`${httpMethod} ${path}`, { query, body }, output);
          return;
        }

        if (WRITE_METHODS.includes(httpMethod)) {
          const ok = await confirm(`Send ${httpMethod} ${path}?`, { yes: global.yes });
          if (!ok) {
            info("Cancelled.", output);
            return;
          }
        }

        const result = await client.request<unknown>(httpMethod, path, { query, body });

        // The raw escape hatch always prints JSON so it can be piped into jq.
        print(result === undefined ? { ok: true } : result, { ...output, json: true });
      },
    );
}
