/**
 * Guards the agent skill in `.agents/skills/devto/`.
 *
 * The skill tells a coding agent which commands to run. If a command, flag or
 * flag value is renamed or removed, the skill silently starts giving wrong
 * advice — nothing else in the test suite would notice. These tests check every
 * `devto ...` example in the skill against the real command tree, and check
 * SKILL.md against the rules the skill loader applies to it.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DevToClient } from "@dishant0406/dev-to";

const cliPath = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
const skillDir = fileURLToPath(new URL("../../../.agents/skills/devto/", import.meta.url));

/** Flags whose values the API only accepts from a fixed set. */
const ALLOWED_VALUES: Record<string, string[]> = {
  "reactions create --type": ["Article", "Comment", "User"],
  "reactions toggle --type": ["Article", "Comment", "User"],
  "reactions create --category": ["like", "unicorn", "exploding_head", "raised_hands", "fire"],
  "reactions toggle --category": ["like", "unicorn", "exploding_head", "raised_hands", "fire"],
  "comments list --per-page": ["10", "30"],
};

/** Run `devto <args> --help` and return its output. Never sends a request. */
function helpText(args: string[]): string {
  try {
    return execFileSync(process.execPath, [cliPath, ...args, "--help"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    return String((error as { stdout?: string }).stdout ?? "");
  }
}

/** Run the CLI and return its exit code, with no key and an unreachable API. */
function exitCodeFor(args: string[]): number {
  try {
    execFileSync(process.execPath, [cliPath, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        DEVTO_CONFIG_DIR: "/nonexistent",
        DEVTO_BASE_URL: "http://127.0.0.1:1",
      },
    });
    return 0;
  } catch (error) {
    return (error as { status?: number }).status ?? 0;
  }
}

/** The command names under a command path, read from the real help output. */
function childNames(path: string[]): Set<string> {
  const names = new Set<string>();
  const body = helpText(path);
  const at = body.indexOf("\nCommands:\n");
  if (at === -1) return names;

  const section = body.slice(at + "\nCommands:\n".length).split("\n\n")[0]!;
  for (const line of section.split("\n")) {
    const match = line.match(/^ {2}([a-z][a-z-]*)[ <[]/);
    if (match !== null && match[1] !== "help") names.add(match[1]!);
  }
  return names;
}

/** The flags a command accepts, mapped to whether each one takes a value. */
function optionNames(path: string[]): Map<string, boolean> {
  const options = new Map<string, boolean>();
  const body = helpText(path);
  const at = body.indexOf("\nOptions:\n");
  if (at === -1) return options;

  const section = body.slice(at + "\nOptions:\n".length).split("\n\n")[0]!;
  for (const line of section.split("\n")) {
    const match = line.match(/^ {2}(?:(-[a-zA-Z]), )?(--[a-z-]+)(.*)$/);
    if (match === null || match[2] === "--help") continue;
    const takesValue = /[<[]/.test(match[3] ?? "");
    options.set(match[2]!, takesValue);
    if (match[1] !== undefined) options.set(match[1], takesValue);
  }
  return options;
}

/** The number of values a command takes after its path, from its usage line. */
function positionalCount(path: string[]): number {
  const usage = helpText(path).split("\n")[0] ?? "";
  let count = 0;
  for (const token of usage.split(/\s+/)) {
    if (token.startsWith("<")) count += 1;
    else if (token.startsWith("[") && token !== "[options]" && token !== "[command]") count += 1;
  }
  return count;
}

const cache = new Map<string, unknown>();

function cached<T>(key: string, build: () => T): T {
  if (!cache.has(key)) cache.set(key, build());
  return cache.get(key) as T;
}

/**
 * Check one `devto ...` example against the real command tree.
 * Returns undefined when the example is a real invocation, or a reason string.
 */
function problemWith(example: string): string | undefined {
  const words = example
    .split(/\s+/)
    .slice(1)
    .filter((word) => word !== "");

  const path: string[] = [];
  const globalOptions = cached("opts:", () => optionNames([]));
  let argumentsSeen = 0;

  for (let index = 0; index < words.length; index += 1) {
    const word = words[index]!;

    if (word.startsWith("-")) {
      const [name, inlineValue] = word.split("=", 2);
      // Commander adds these to every command, so they are always valid.
      if (name === "--help" || name === "-h") continue;

      const local = cached(`opts:${path.join(" ")}`, () => optionNames(path));
      const takesValue = local.get(name!) ?? globalOptions.get(name!);

      if (takesValue === undefined) {
        return `"${example}" uses ${name}, which "devto ${path.join(" ")}" does not have`;
      }

      if (takesValue && inlineValue === undefined) {
        const value = words[index + 1];
        if (value === undefined) return `"${example}" gives ${name} no value`;
        index += 1;

        const allowed = ALLOWED_VALUES[`${path.join(" ")} ${name}`];
        if (allowed !== undefined && !value.startsWith("<") && !allowed.includes(value)) {
          return `"${example}" sets ${name} to "${value}"; the allowed values are ${allowed.join(", ")}`;
        }
      }
      continue;
    }

    // A bare word is part of the command only while no argument has been seen.
    if (argumentsSeen === 0 && cached(`kids:${path.join(" ")}`, () => childNames(path)).has(word)) {
      path.push(word);
      continue;
    }

    argumentsSeen += 1;
    const allowed = positionalCount(path);
    if (argumentsSeen > allowed) {
      return `"${example}" has ${argumentsSeen} arguments but "devto ${path.join(" ")}" takes ${allowed}`;
    }
  }

  if (path.length === 0) return `"${example}" does not start with a command`;
  return undefined;
}

/** Every `devto ...` invocation the skill tells an agent to run. */
function examplesIn(text: string): string[] {
  const found: string[] = [];

  const clean = (line: string) =>
    line
      .replace(/"[^"]*"|'[^']*'/g, "x")
      .replace(/\s+/g, " ")
      .trim();

  for (const raw of text.split("\n")) {
    let line = raw.trim();
    if (!line.startsWith("devto ")) continue;

    line = line.split(" #")[0]!;
    for (const stop of ["|", ">", "&&", "||", ";"]) {
      const at = line.indexOf(stop);
      if (at !== -1) line = line.slice(0, at);
    }
    found.push(clean(line));
  }

  for (const match of text.matchAll(/`(devto [^`\n]+)`/g)) {
    const line = clean(match[1]!);
    if (!found.includes(line)) found.push(line);
  }

  return found;
}

function frontmatter(text: string): { lines: string[]; body: string } {
  const lines = text.split("\n");
  if (lines[0] !== "---") throw new Error("SKILL.md must start with a --- frontmatter block");
  const end = lines.indexOf("---", 1);
  if (end === -1) throw new Error("SKILL.md frontmatter is not closed with ---");
  return { lines: lines.slice(1, end), body: lines.slice(end + 1).join("\n") };
}

function valueOf(lines: string[], key: string): { value: string; nextLine: string } | undefined {
  const index = lines.findIndex((line) => line.toLowerCase().startsWith(`${key}:`));
  if (index === -1) return undefined;
  return {
    value: lines[index]!.slice(key.length + 1)
      .trim()
      .replace(/^["']|["']$/g, ""),
    nextLine: lines[index + 1] ?? "",
  };
}

const skill = readFileSync(`${skillDir}SKILL.md`, "utf8");
const commandsReference = readFileSync(`${skillDir}references/commands.md`, "utf8");
const sdkReference = readFileSync(`${skillDir}references/sdk.md`, "utf8");
const { lines: front, body } = frontmatter(skill);

describe("skill frontmatter", () => {
  it("is named after its directory, which is what the loader matches on", () => {
    expect(valueOf(front, "name")?.value).toBe("devto");
  });

  it("has a non-empty description, which is the only thing that triggers the skill", () => {
    const description = valueOf(front, "description")?.value ?? "";
    expect(description.length).toBeGreaterThan(0);
    expect(description.length).toBeLessThanOrEqual(1024);
  });

  it("keeps the description on one line, because the loader reads only one", () => {
    // A block scalar (`description: >`) parses as the literal string ">", so the
    // skill would load with a description that triggers nothing.
    const description = valueOf(front, "description");
    expect(description?.value).not.toMatch(/^[>|][-+]?$/);
    expect(description?.nextLine).not.toMatch(/^\s+\S/);
  });

  it("stays inside the size the specification recommends", () => {
    expect(skill.split("\n").length).toBeLessThan(500);
  });

  it("points only at reference files that exist", () => {
    const referenced = [...body.matchAll(/`(references\/[^`]+)`/g)].map((match) => match[1]!);
    expect(referenced.length).toBeGreaterThan(0);
    for (const path of referenced) {
      expect(() => readFileSync(`${skillDir}${path}`, "utf8")).not.toThrow();
    }
  });
});

describe("skill commands", () => {
  it("reads the real command tree", () => {
    expect(cached("kids:", () => childNames([])).has("articles")).toBe(true);
    expect(cached("kids:articles", () => childNames(["articles"])).has("push")).toBe(true);
    expect(cached("kids:articles", () => childNames(["articles"])).has("psuh")).toBe(false);
    expect(positionalCount(["articles", "get"])).toBe(1);
    expect(positionalCount(["articles", "get-by-path"])).toBe(2);
    expect(positionalCount(["instance"])).toBe(0);
    expect(
      cached("opts:articles list", () => optionNames(["articles", "list"])).has("--per-page"),
    ).toBe(true);
  });

  it("documents the exit codes the CLI really uses", async () => {
    // The skill tells an agent to read the exit code, so the numbers must match.
    const exitFor = (args: string[]) =>
      execFileSync(process.execPath, [cliPath, ...args], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          DEVTO_CONFIG_DIR: "/nonexistent",
          DEVTO_BASE_URL: "http://127.0.0.1:1",
        },
      });

    let usageCode = 0;
    try {
      exitFor(["articles", "psuh"]);
    } catch (error) {
      usageCode = (error as { status?: number }).status ?? 0;
    }

    let apiCode = 0;
    try {
      exitFor(["instance"]);
    } catch (error) {
      apiCode = (error as { status?: number }).status ?? 0;
    }

    expect(skill).toContain(`\`${usageCode}\` the command was called wrongly`);
    expect(skill).toContain(`\`${apiCode}\` the API rejected the`);
  });

  it("quotes the comments per-page values the CLI actually accepts", () => {
    // The reference tells an agent these two values are the only ones allowed.
    for (const value of ALLOWED_VALUES["comments list --per-page"]!) {
      expect(exitCodeFor(["comments", "list", "--article", "1", "--per-page", value])).not.toBe(2);
      expect(commandsReference).toContain(`\`${value}\``);
    }
    expect(exitCodeFor(["comments", "list", "--article", "1", "--per-page", "99"])).toBe(2);
  });

  it("finds command examples to check", () => {
    expect(examplesIn(skill).length).toBeGreaterThan(5);
    expect(examplesIn(commandsReference).length).toBeGreaterThan(30);
  });

  it("only names commands and flags the CLI actually has", () => {
    const problems: string[] = [];
    for (const example of [...examplesIn(skill), ...examplesIn(commandsReference)]) {
      const problem = problemWith(example);
      if (problem !== undefined) problems.push(problem);
    }
    expect(problems).toEqual([]);
  });
});

describe("sdk reference", () => {
  it("lists every resource the client has, and no others", () => {
    const client = new DevToClient({ apiKey: "test" });
    // `private http` is TypeScript-only, so it still shows up at runtime.
    const real = Object.keys(client)
      .filter((name) => name !== "http")
      .sort();

    // The bare fence under `## Resources` is the resource list; the
    // language-tagged fences elsewhere are examples.
    const resources = sdkReference.split("## Resources")[1] ?? "";
    const section = resources.match(/```\n([\s\S]*?)```/);
    expect(section).not.toBeNull();

    const documented = section![1]!
      .split(/\s+/)
      .filter((name) => name !== "")
      .sort();

    expect(documented).toEqual(real);
  });
});
