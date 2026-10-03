/**
 * Turning API results into something a human or a script can read.
 *
 * `--json` prints exactly what the API returned. Anything else prints a table.
 */

import { maskSecret } from "./config.js";
import { DevToError } from "@dishant0406/dev-to";

export interface OutputOptions {
  json?: boolean;
  quiet?: boolean;
  noColor?: boolean;
  /** The API key to strip out of anything printed. */
  apiKey?: string;
}

const RESET = "\u001b[0m";
const BOLD = "\u001b[1m";
const DIM = "\u001b[2m";
const RED = "\u001b[31m";
const GREEN = "\u001b[32m";
const YELLOW = "\u001b[33m";

/** The widest a single cell can be before it is cut short. */
const MAX_CELL_WIDTH = 60;

function useColor(options: OutputOptions): boolean {
  if (options.noColor === true) return false;
  if (process.env["NO_COLOR"] !== undefined) return false;
  return process.stdout.isTTY === true;
}

function color(text: string, code: string, options: OutputOptions): string {
  return useColor(options) ? `${code}${text}${RESET}` : text;
}

/** Remove the API key from any text before it is printed. */
export function redact(text: string, apiKey?: string): string {
  if (apiKey === undefined || apiKey === "") return text;
  return text.split(apiKey).join(maskSecret(apiKey));
}

/** Print an API result. Objects and arrays become tables unless `--json` was passed. */
/** Print `value` as indented JSON, with the API key removed. */
export function printJson(value: unknown, options: OutputOptions = {}): void {
  console.log(redact(JSON.stringify(value, null, 2), options.apiKey));
}

export function print(value: unknown, options: OutputOptions = {}): void {
  if (options.quiet === true) return;

  if (options.json === true || !isTableable(value)) {
    printJson(value, options);
    return;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      console.log(color("No results.", DIM, options));
      return;
    }
    console.log(renderTable(value as Record<string, unknown>[], options));
    return;
  }

  console.log(renderTable([value as Record<string, unknown>], options));
}

function isTableable(value: unknown): boolean {
  if (Array.isArray(value)) return value.every(isPlainObject);
  return isPlainObject(value);
}

function isPlainObject(value: unknown): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** A table cell is still output, so it is redacted as well. */
function safeCell(value: unknown, options: OutputOptions): string {
  return redact(cell(value), options.apiKey);
}

/**
 * Render rows as a fixed-width table.
 *
 * Only the columns that exist in the data are shown, and columns whose values are
 * all empty or all identical are dropped — API objects carry a lot of noise.
 *
 * Cells are truncated to `MAX_CELL_WIDTH` *before* the column width is measured.
 * Measuring the untruncated value makes the column as wide as the longest value
 * (some fields, like an article body, are megabytes) and the final join then
 * exceeds the maximum string length in V8.
 */
export function renderTable(rows: Record<string, unknown>[], options: OutputOptions = {}): string {
  const columns = chooseColumns(rows);
  if (columns.length === 0) return color("(no fields)", DIM, options);

  const text = (row: Record<string, unknown>, column: string): string =>
    truncate(safeCell(row[column], options), MAX_CELL_WIDTH);

  const widths = columns.map((column) =>
    Math.max(column.length, ...rows.map((row) => text(row, column).length)),
  );

  const lines: string[] = [];
  const header = columns.map((column, index) => column.padEnd(widths[index] ?? 0)).join("  ");
  lines.push(color(header.trimEnd(), BOLD, options));

  for (const row of rows) {
    const line = columns
      .map((column, index) => text(row, column).padEnd(widths[index] ?? 0))
      .join("  ");
    lines.push(line.trimEnd());
  }

  return lines.join("\n");
}

function chooseColumns(rows: Record<string, unknown>[]): string[] {
  const first = rows[0];
  if (first === undefined) return [];

  return Object.keys(first).filter((key) => {
    const values = rows.map((row) => cell(row[key]));
    if (values.every((value) => value === "")) return false;
    if (values.length > 1 && new Set(values).size === 1) return false;
    return true;
  });
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

/** Print a success message. */
export function success(message: string, options: OutputOptions = {}): void {
  if (options.quiet === true) return;
  console.error(color(`✓ ${message}`, GREEN, options));
}

/** Print a note. */
export function info(message: string, options: OutputOptions = {}): void {
  if (options.quiet === true) return;
  console.error(color(message, DIM, options));
}

/** Print a warning. */
export function warn(message: string, options: OutputOptions = {}): void {
  console.error(color(`warning: ${message}`, YELLOW, options));
}

/**
 * Print an error and return the exit code to use: 1 for API errors,
 * 2 when the command was used incorrectly.
 */
export function printError(error: unknown, options: OutputOptions = {}, apiKey?: string): number {
  if (error instanceof DevToError) {
    const message = redact(error.message, apiKey);
    if (options.json === true) {
      console.error(
        JSON.stringify(
          { error: message, status: error.status, method: error.method, path: error.path },
          null,
          2,
        ),
      );
    } else {
      console.error(color(`error: ${message}`, RED, options));
    }
    return 1;
  }

  const message = error instanceof Error ? error.message : String(error);
  console.error(color(`error: ${redact(message, apiKey)}`, RED, options));
  return 2;
}
