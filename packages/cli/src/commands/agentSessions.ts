/**
 * `devto agent-sessions ...` — uploading AI coding-agent transcripts.
 *
 * `upload` is the only command in this CLI that talks to two different services:
 *   1. ask the API for a presigned S3 URL
 *   2. PUT the transcript straight to S3
 *   3. tell the API about it, with `curated_data` as a JSON *string*
 */

import { readFile } from "node:fs/promises";
import { Command } from "commander";
import { globalOf, openClient, parseIntArg, readJsonInput } from "../helpers.js";
import { info, print, success, warn } from "../output.js";
import { RateLimitError, type AgentToolName } from "@dishant0406/dev-to";

export function registerAgentSessionCommands(program: Command): void {
  const sessions = program.command("agent-sessions").description("AI coding-agent transcripts");

  sessions
    .command("list")
    .description("List agent sessions")
    .action(async (_options: unknown, command: Command) => {
      const { client, options } = await openClient(globalOf(command));
      print(await client.agentSessions.list(), options);
    });

  sessions
    .command("get")
    .description("Get an agent session with its messages")
    .argument("<id>")
    .action(async (id: string, _options: unknown, command: Command) => {
      const { client, options } = await openClient(globalOf(command));
      print(await client.agentSessions.get(parseIntArg(id, "id")), options);
    });

  sessions
    .command("raw-url")
    .description("Get the URL of an uploaded raw transcript")
    .argument("<id>")
    .action(async (id: string, _options: unknown, command: Command) => {
      const { client, options } = await openClient(globalOf(command));
      print(await client.agentSessions.rawUrl(parseIntArg(id, "id")), options);
    });

  sessions
    .command("upload")
    .description("Upload a transcript file and create an agent session")
    .requiredOption("-f, --file <path>", "the transcript file to upload")
    .requiredOption("--title <title>")
    .option("--tool <name>", "claude_code, codex, gemini_cli, github_copilot, opencode or pi")
    .option("--curated-data <json>", "JSON body, @file.json, or - for stdin")
    .action(
      async (
        options: { file: string; title: string; tool?: string; curatedData?: string },
        command: Command,
      ) => {
        const context = await openClient(globalOf(command));

        if (context.dryRun) {
          info(
            `[dry-run] would upload ${options.file}, then POST /api/agent_sessions`,
            context.options,
          );
          print(
            {
              title: options.title,
              tool_name: options.tool,
              curated_data: options.curatedData,
              steps: [
                "POST /api/agent_sessions/presign",
                "PUT the file to the returned presigned_url",
                "POST /api/agent_sessions",
              ],
            },
            context.options,
          );
          return;
        }

        let presigned;
        try {
          presigned = await context.client.agentSessions.presign();
        } catch (error) {
          if (error instanceof RateLimitError) throw error;
          warn(
            "The API did not return a presigned upload URL. This instance may not have S3 storage configured.",
            context.options,
          );
          throw error;
        }

        const transcript = await readFile(options.file);
        const upload = await fetch(presigned.presigned_url, { method: "PUT", body: transcript });
        if (upload.status !== 200 && upload.status !== 204) {
          throw new Error(`Upload to storage failed (${upload.status}).`);
        }
        info("Uploaded the transcript.", context.options);

        const curatedData =
          options.curatedData === undefined
            ? "{}"
            : JSON.stringify(await readJsonInput(options.curatedData));

        const created = await context.client.agentSessions.create({
          title: options.title,
          tool_name: options.tool as AgentToolName | undefined,
          s3_key: presigned.s3_key,
          curated_data: curatedData,
        });

        success(`Created agent session ${created.id}`, context.options);
        print({ id: created.id, url: created.url, title: created.title }, context.options);
      },
    );
}
