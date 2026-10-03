/**
 * Small helpers every command uses.
 */

import { createInterface } from "node:readline/promises";
import type { DevToClient } from "@dishant0406/dev-to";
import type { Command } from "commander";
import { resolveCredentials } from "./config.js";
import { info, printJson, type OutputOptions } from "./output.js";

/** Global options commander attaches to every command. */
export interface GlobalOptions {
  apiKey?: string;
  baseUrl?: string;
  json?: boolean;
  quiet?: boolean;
  verbose?: boolean;
  noColor?: boolean;
  timeout?: number;
  dryRun?: boolean;
  yes?: boolean;
}

/** Read a `--flag` value as a number, failing loudly when it is not one. */
export function parseIntArg(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    throw new UsageError(`--${name} must be a whole number, got "${value}"`);
  }
  return parsed;
}

/**
 * Path parameters such as `{id_or_slug}` accept either a number or a string.
 * Send a number when the argument is one, so the API sees the id it expects.
 */
export function asIdOrSlug(value: string): number | string {
  const numeric = Number(value);
  return Number.isInteger(numeric) ? numeric : value;
}

/** Read a comma-separated flag such as `--users 1,2,3` into numbers. */
export function parseNumberList(value: string, name: string): number[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "")
    .map((part) => parseIntArg(part, name));
}

/** Collect a repeated `--query key=value` flag into an object. */
export function collectKeyValues(pairs: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const pair of pairs) {
    const index = pair.indexOf("=");
    if (index === -1) throw new UsageError(`Expected key=value, got "${pair}"`);
    result[pair.slice(0, index)] = pair.slice(index + 1);
  }
  return result;
}

/** A mistake in how the command was called. Exit code 2. */
export class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UsageError";
  }
}

/**
 * The client, plus the global options it was built from.
 *
 * Every command starts with `const { client, options } = await openClient(globalOf(cmd))`,
 * so the API key, base URL, timeout and dry-run state are resolved in one place.
 */
export interface Context {
  client: DevToClient;
  options: OutputOptions;
  global: GlobalOptions;
  apiKey: string | undefined;
  /** Print the request that would be sent, instead of sending it. */
  dryRun: boolean;
}

export async function openClient(global: GlobalOptions): Promise<Context> {
  // Imported here so `--help` does not pay for loading the SDK.
  const { DevToClient } = await import("@dishant0406/dev-to");
  const { apiKey, baseUrl } = resolveCredentials(global);

  if (global.verbose === true) {
    info(`base url: ${baseUrl}`);
    info(`api key: ${apiKey === undefined ? "(not set)" : "(set)"}`);
  }

  const client = new DevToClient({
    apiKey,
    baseUrl,
    timeout: global.timeout,
    // The throttle is what keeps bulk operations under the API's rate limits.
    throttle: { enabled: true },
  });

  return {
    client,
    apiKey,
    dryRun: global.dryRun === true,
    global,
    options: { json: global.json, quiet: global.quiet, noColor: global.noColor, apiKey },
  };
}

/** Ask a yes/no question. Returns false when stdin is not interactive. */
export async function confirm(
  question: string,
  options: { yes?: boolean; dryRun?: boolean } = {},
): Promise<boolean> {
  if (options.dryRun === true || options.yes === true) return true;
  if (process.stdin.isTTY !== true) {
    throw new UsageError(
      `This command changes or deletes data and needs confirmation, but stdin is not a terminal.\n` +
        `Re-run with --yes to confirm, or --dry-run to see what it would do.`,
    );
  }

  const readline = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await readline.question(`${question} [y/N] `);
    return answer.trim().toLowerCase() === "y" || answer.trim().toLowerCase() === "yes";
  } finally {
    readline.close();
  }
}

/** Print what a write would do, then tell the caller to stop. */
export function dryRunNotice(action: string, detail: unknown, options: OutputOptions = {}): void {
  console.log(`[dry-run] ${action}`);
  printJson(detail, options);
  info("Nothing was sent.", options);
}

/** Read `--data` from a file path, `-` for stdin, or an inline JSON string. */
export async function readJsonInput(value: string): Promise<unknown> {
  let text: string;

  if (value === "-") {
    text = await readStdin();
  } else if (value.startsWith("@")) {
    const { readFile } = await import("node:fs/promises");
    text = await readFile(value.slice(1), "utf8");
  } else {
    text = value;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new UsageError("--data must be valid JSON (or @file.json, or - for stdin)");
  }
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

/** Read the global options that commander attaches to every command. */
export function globalOf(command: Command): GlobalOptions {
  return command.optsWithGlobals() as GlobalOptions;
}
