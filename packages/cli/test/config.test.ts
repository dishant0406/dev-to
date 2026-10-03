import { mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  configPath,
  deleteConfig,
  maskSecret,
  readConfig,
  resolveCredentials,
  writeConfig,
} from "../src/config.js";

let dir: string;
const originalEnv = { ...process.env };

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "devto-test-"));
  process.env["DEVTO_CONFIG_DIR"] = dir;
  delete process.env["DEVTO_API_KEY"];
  delete process.env["DEVTO_BASE_URL"];
});

afterEach(() => {
  process.env = { ...originalEnv };
  rmSync(dir, { recursive: true, force: true });
});

describe("config file", () => {
  it("round-trips values", () => {
    writeConfig({ apiKey: "abc", baseUrl: "https://example.test" });
    expect(readConfig()).toEqual({ apiKey: "abc", baseUrl: "https://example.test" });
  });

  it("returns an empty object when there is no file", () => {
    expect(readConfig()).toEqual({});
  });

  it("returns an empty object when the file is not valid JSON", () => {
    writeConfig({ apiKey: "abc" });
    writeFileSync(configPath(), "not json");
    expect(readConfig()).toEqual({});
  });

  it("writes the file readable only by the current user", () => {
    writeConfig({ apiKey: "secret" });
    const mode = statSync(configPath()).mode & 0o777;
    expect(mode).toBe(0o600);
  });

  it("deletes the file", () => {
    writeConfig({ apiKey: "abc" });
    expect(deleteConfig()).toBe(true);
    expect(readConfig()).toEqual({});
    expect(deleteConfig()).toBe(false);
  });
});

describe("resolveCredentials", () => {
  it("prefers the flag over everything else", () => {
    writeConfig({ apiKey: "from-file", baseUrl: "https://file.test" });
    process.env["DEVTO_API_KEY"] = "from-env";

    const resolved = resolveCredentials({ apiKey: "from-flag", baseUrl: "https://flag.test" });
    expect(resolved.apiKey).toBe("from-flag");
    expect(resolved.baseUrl).toBe("https://flag.test");
    expect(resolved.sources).toEqual({ apiKey: "--api-key", baseUrl: "--base-url" });
  });

  it("prefers the environment over the file", () => {
    writeConfig({ apiKey: "from-file" });
    process.env["DEVTO_API_KEY"] = "from-env";

    const resolved = resolveCredentials({});
    expect(resolved.apiKey).toBe("from-env");
    expect(resolved.sources.apiKey).toBe("DEVTO_API_KEY");
  });

  it("falls back to the config file", () => {
    writeConfig({ apiKey: "from-file", baseUrl: "https://file.test" });

    const resolved = resolveCredentials({});
    expect(resolved.apiKey).toBe("from-file");
    expect(resolved.baseUrl).toBe("https://file.test");
    expect(resolved.sources).toEqual({ apiKey: "config file", baseUrl: "config file" });
  });

  it("defaults the base URL to dev.to and reports no key", () => {
    const resolved = resolveCredentials({});
    expect(resolved.apiKey).toBeUndefined();
    expect(resolved.baseUrl).toBe("https://dev.to");
    expect(resolved.sources).toEqual({ apiKey: "none", baseUrl: "default" });
  });
});

describe("maskSecret", () => {
  it("shows only the last four characters", () => {
    expect(maskSecret("abcdefgh")).toBe("****efgh");
  });

  it("hides short secrets completely", () => {
    expect(maskSecret("abc")).toBe("****");
  });

  it("says when nothing is set", () => {
    expect(maskSecret(undefined)).toBe("(not set)");
    expect(maskSecret("")).toBe("(not set)");
  });
});
