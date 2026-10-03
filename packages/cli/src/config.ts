/**
 * Where the API key lives.
 *
 * Resolution order, highest first:
 *   1. `--api-key` / `--base-url` flags
 *   2. `DEVTO_API_KEY` / `DEVTO_BASE_URL` environment variables
 *   3. the config file written by `devto auth login`
 */

import { chmodSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface Config {
  apiKey?: string;
  baseUrl?: string;
}

export const DEFAULT_BASE_URL = "https://dev.to";

/** The directory holding the config file. `DEVTO_CONFIG_DIR` overrides it, which tests rely on. */
export function configDir(): string {
  const override = process.env["DEVTO_CONFIG_DIR"];
  if (override !== undefined && override !== "") return override;

  const home = homedir();
  if (process.platform === "darwin") return join(home, "Library", "Application Support", "devto");
  if (process.platform === "win32") {
    return join(process.env["APPDATA"] ?? home, "devto");
  }
  return join(process.env["XDG_CONFIG_HOME"] ?? join(home, ".config"), "devto");
}

export function configPath(): string {
  return join(configDir(), "config.json");
}

/** Read the config file. Returns `{}` when it does not exist or cannot be parsed. */
export function readConfig(): Config {
  let raw: string;
  try {
    raw = readFileSync(configPath(), "utf8");
  } catch {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    const record = parsed as Record<string, unknown>;
    const config: Config = {};
    if (typeof record["apiKey"] === "string") config.apiKey = record["apiKey"];
    if (typeof record["baseUrl"] === "string") config.baseUrl = record["baseUrl"];
    return config;
  } catch {
    return {};
  }
}

/** Write the config file, readable only by the current user. */
export function writeConfig(config: Config): void {
  mkdirSync(configDir(), { recursive: true });
  writeFileSync(configPath(), `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  chmodSync(configPath(), 0o600);
}

/** Delete the config file. Returns false when there was nothing to delete. */
export function deleteConfig(): boolean {
  try {
    rmSync(configPath());
    return true;
  } catch {
    return false;
  }
}

/** Show only the last four characters of a secret. */
export function maskSecret(secret: string | undefined): string {
  if (secret === undefined || secret === "") return "(not set)";
  if (secret.length <= 4) return "****";
  return `****${secret.slice(-4)}`;
}

/** Work out the API key and base URL to use, from flags, environment and the config file. */
export function resolveCredentials(flags: { apiKey?: string; baseUrl?: string }): {
  apiKey: string | undefined;
  baseUrl: string;
  sources: { apiKey: string; baseUrl: string };
} {
  const config = readConfig();

  const flagKey = flags.apiKey;
  const envKey = process.env["DEVTO_API_KEY"];
  const fileKey = config.apiKey;

  const apiKey = flagKey ?? envKey ?? fileKey;
  const apiKeySource =
    flagKey !== undefined
      ? "--api-key"
      : envKey !== undefined
        ? "DEVTO_API_KEY"
        : fileKey !== undefined
          ? "config file"
          : "none";

  const flagUrl = flags.baseUrl;
  const envUrl = process.env["DEVTO_BASE_URL"];
  const fileUrl = config.baseUrl;

  const baseUrl = flagUrl ?? envUrl ?? fileUrl ?? DEFAULT_BASE_URL;
  const baseUrlSource =
    flagUrl !== undefined
      ? "--base-url"
      : envUrl !== undefined
        ? "DEVTO_BASE_URL"
        : fileUrl !== undefined
          ? "config file"
          : "default";

  return { apiKey, baseUrl, sources: { apiKey: apiKeySource, baseUrl: baseUrlSource } };
}
