/**
 * `devto organizations`, `devto pages`, `devto segments`, `devto billboards`.
 */

import { Command } from "commander";
import {
  confirm,
  dryRunNotice,
  globalOf,
  openClient,
  parseIntArg,
  parseNumberList,
  readJsonInput,
} from "../helpers.js";
import { info, print, success } from "../output.js";
import type { BillboardPayload, OrganizationPayload, PagePayload } from "@dishant0406/dev-to";

export function registerContentCommands(program: Command): void {
  registerOrganizations(program);
  registerPages(program);
  registerSegments(program);
  registerBillboards(program);
}

function registerOrganizations(program: Command): void {
  const organizations = program.command("organizations").description("Organization profiles");

  organizations
    .command("list")
    .description("List organizations")
    .option("--page <n>")
    .option("--per-page <n>")
    .action(async (options: { page?: string; perPage?: string }, command: Command) => {
      const { client, options: output } = await openClient(globalOf(command));
      print(
        await client.organizations.list({
          page: options.page === undefined ? undefined : parseIntArg(options.page, "page"),
          perPage:
            options.perPage === undefined ? undefined : parseIntArg(options.perPage, "per-page"),
        }),
        output,
      );
    });

  organizations
    .command("get")
    .description("Get an organization by username or numeric id")
    .argument("<username-or-id>")
    .action(async (value: string, _options: unknown, command: Command) => {
      const { client, options } = await openClient(globalOf(command));
      const numeric = Number(value);
      print(
        await client.organizations.get(String(Number.isInteger(numeric) ? numeric : value)),
        options,
      );
    });

  organizations
    .command("articles")
    .description("List an organization's articles")
    .argument("<username-or-id>")
    .option("--page <n>")
    .option("--per-page <n>")
    .action(
      async (value: string, options: { page?: string; perPage?: string }, command: Command) => {
        const { client, options: output } = await openClient(globalOf(command));
        print(
          await client.organizations.articles(value, {
            page: options.page === undefined ? undefined : parseIntArg(options.page, "page"),
            perPage:
              options.perPage === undefined ? undefined : parseIntArg(options.perPage, "per-page"),
          }),
          output,
        );
      },
    );

  organizations
    .command("users")
    .description("List an organization's members")
    .argument("<username-or-id>")
    .option("--page <n>")
    .option("--per-page <n>")
    .action(
      async (value: string, options: { page?: string; perPage?: string }, command: Command) => {
        const { client, options: output } = await openClient(globalOf(command));
        print(
          await client.organizations.users(value, {
            page: options.page === undefined ? undefined : parseIntArg(options.page, "page"),
            perPage:
              options.perPage === undefined ? undefined : parseIntArg(options.perPage, "per-page"),
          }),
          output,
        );
      },
    );

  organizations
    .command("create")
    .description("Create an organization from a JSON file")
    .requiredOption("--data <json>", "JSON body, @file.json, or - for stdin")
    .action(async (options: { data: string }, command: Command) => {
      const context = await openClient(globalOf(command));
      const payload = (await readJsonInput(options.data)) as OrganizationPayload;

      if (context.dryRun) {
        dryRunNotice("POST /api/organizations", payload, context.options);
        return;
      }
      print(await context.client.organizations.create(payload), context.options);
    });

  organizations
    .command("update")
    .description("Update an organization from a JSON file")
    .argument("<id>")
    .requiredOption("--data <json>", "JSON body, @file.json, or - for stdin")
    .action(async (id: string, options: { data: string }, command: Command) => {
      const context = await openClient(globalOf(command));
      const payload = (await readJsonInput(options.data)) as OrganizationPayload;
      const organizationId = parseIntArg(id, "id");

      if (context.dryRun) {
        dryRunNotice(`PUT /api/organizations/${organizationId}`, payload, context.options);
        return;
      }
      print(await context.client.organizations.update(organizationId, payload), context.options);
    });

  organizations
    .command("delete")
    .description("Delete an organization")
    .argument("<id>")
    .action(async (id: string, _options: unknown, command: Command) => {
      const context = await openClient(globalOf(command));
      const organizationId = parseIntArg(id, "id");

      if (context.dryRun) {
        dryRunNotice(`DELETE /api/organizations/${organizationId}`, {}, context.options);
        return;
      }

      const ok = await confirm(`Delete organization ${organizationId}?`, {
        yes: context.global.yes,
      });
      if (!ok) {
        info("Cancelled.", context.options);
        return;
      }
      print(await context.client.organizations.delete(organizationId), context.options);
    });
}

function registerPages(program: Command): void {
  const pages = program.command("pages").description("Custom pages");

  pages
    .command("list")
    .description("List pages")
    .action(async (_options: unknown, command: Command) => {
      const { client, options } = await openClient(globalOf(command));
      print(await client.pages.list(), options);
    });

  pages
    .command("get")
    .description("Get a page")
    .argument("<id>")
    .action(async (id: string, _options: unknown, command: Command) => {
      const { client, options } = await openClient(globalOf(command));
      print(await client.pages.get(parseIntArg(id, "id")), options);
    });

  pages
    .command("create")
    .description("Create a page from a JSON file")
    .requiredOption("--data <json>", "JSON body, @file.json, or - for stdin")
    .action(async (options: { data: string }, command: Command) => {
      const context = await openClient(globalOf(command));
      const payload = (await readJsonInput(options.data)) as PagePayload;

      if (context.dryRun) {
        dryRunNotice("POST /api/pages", payload, context.options);
        return;
      }
      print(await context.client.pages.create(payload), context.options);
    });

  pages
    .command("update")
    .description("Update a page from a JSON file")
    .argument("<id>")
    .requiredOption("--data <json>", "JSON body, @file.json, or - for stdin")
    .action(async (id: string, options: { data: string }, command: Command) => {
      const context = await openClient(globalOf(command));
      const payload = (await readJsonInput(options.data)) as PagePayload;
      const pageId = parseIntArg(id, "id");

      if (context.dryRun) {
        dryRunNotice(`PUT /api/pages/${pageId}`, payload, context.options);
        return;
      }
      print(await context.client.pages.update(pageId, payload), context.options);
    });

  pages
    .command("delete")
    .description("Delete a page")
    .argument("<id>")
    .action(async (id: string, _options: unknown, command: Command) => {
      const context = await openClient(globalOf(command));
      const pageId = parseIntArg(id, "id");

      if (context.dryRun) {
        dryRunNotice(`DELETE /api/pages/${pageId}`, {}, context.options);
        return;
      }

      const ok = await confirm(`Delete page ${pageId}?`, { yes: context.global.yes });
      if (!ok) {
        info("Cancelled.", context.options);
        return;
      }
      print(await context.client.pages.delete(pageId), context.options);
    });
}

function registerSegments(program: Command): void {
  const segments = program.command("segments").description("Audience segments");

  segments
    .command("list")
    .description("List segments")
    .option("--per-page <n>")
    .action(async (options: { perPage?: string }, command: Command) => {
      const { client, options: output } = await openClient(globalOf(command));
      print(
        await client.segments.list({
          perPage:
            options.perPage === undefined ? undefined : parseIntArg(options.perPage, "per-page"),
        }),
        output,
      );
    });

  segments
    .command("get")
    .description("Get a segment")
    .argument("<id>")
    .action(async (id: string, _options: unknown, command: Command) => {
      const { client, options } = await openClient(globalOf(command));
      print(await client.segments.get(parseIntArg(id, "id")), options);
    });

  segments
    .command("create")
    .description("Create an empty segment")
    .action(async (_options: unknown, command: Command) => {
      const context = await openClient(globalOf(command));
      if (context.dryRun) {
        dryRunNotice("POST /api/segments", {}, context.options);
        return;
      }
      print(await context.client.segments.create(), context.options);
    });

  segments
    .command("delete")
    .description("Delete a segment (fails with 409 while a billboard uses it)")
    .argument("<id>")
    .action(async (id: string, _options: unknown, command: Command) => {
      const context = await openClient(globalOf(command));
      const segmentId = parseIntArg(id, "id");

      if (context.dryRun) {
        dryRunNotice(`DELETE /api/segments/${segmentId}`, {}, context.options);
        return;
      }

      const ok = await confirm(`Delete segment ${segmentId}?`, { yes: context.global.yes });
      if (!ok) {
        info("Cancelled.", context.options);
        return;
      }
      print(await context.client.segments.delete(segmentId), context.options);
    });

  segments
    .command("users")
    .description("List the users in a segment")
    .argument("<id>")
    .option("--per-page <n>")
    .action(async (id: string, options: { perPage?: string }, command: Command) => {
      const { client, options: output } = await openClient(globalOf(command));
      print(
        await client.segments.users(parseIntArg(id, "id"), {
          perPage:
            options.perPage === undefined ? undefined : parseIntArg(options.perPage, "per-page"),
        }),
        output,
      );
    });

  for (const action of ["add-users", "remove-users"] as const) {
    segments
      .command(action)
      .description(
        action === "add-users" ? "Add users to a segment" : "Remove users from a segment",
      )
      .argument("<id>")
      .requiredOption("--users <ids>", "comma-separated user ids")
      .action(async (id: string, options: { users: string }, command: Command) => {
        const context = await openClient(globalOf(command));
        const segmentId = parseIntArg(id, "id");
        const userIds = parseNumberList(options.users, "users");

        if (context.dryRun) {
          dryRunNotice(
            `PUT /api/segments/${segmentId}/${action.replace("-", "_")}`,
            { user_ids: userIds },
            context.options,
          );
          return;
        }

        const result =
          action === "add-users"
            ? await context.client.segments.addUsers(segmentId, userIds)
            : await context.client.segments.removeUsers(segmentId, userIds);
        print(result, context.options);
      });
  }
}

function registerBillboards(program: Command): void {
  const billboards = program.command("billboards").description("Billboards (sponsored content)");

  billboards
    .command("list")
    .description("List billboards")
    .action(async (_options: unknown, command: Command) => {
      const { client, options } = await openClient(globalOf(command));
      print(await client.billboards.list(), options);
    });

  billboards
    .command("get")
    .description("Get a billboard")
    .argument("<id>")
    .action(async (id: string, _options: unknown, command: Command) => {
      const { client, options } = await openClient(globalOf(command));
      print(await client.billboards.get(parseIntArg(id, "id")), options);
    });

  billboards
    .command("create")
    .description("Create a billboard from a JSON file")
    .requiredOption("--data <json>", "JSON body, @file.json, or - for stdin")
    .action(async (options: { data: string }, command: Command) => {
      const context = await openClient(globalOf(command));
      const payload = (await readJsonInput(options.data)) as BillboardPayload;

      if (context.dryRun) {
        dryRunNotice("POST /api/billboards", payload, context.options);
        return;
      }
      print(await context.client.billboards.create(payload), context.options);
    });

  billboards
    .command("update")
    .description("Update a billboard from a JSON file")
    .argument("<id>")
    .requiredOption("--data <json>", "JSON body, @file.json, or - for stdin")
    .action(async (id: string, options: { data: string }, command: Command) => {
      const context = await openClient(globalOf(command));
      const payload = (await readJsonInput(options.data)) as BillboardPayload;
      const billboardId = parseIntArg(id, "id");

      if (context.dryRun) {
        dryRunNotice(`PUT /api/billboards/${billboardId}`, payload, context.options);
        return;
      }
      print(await context.client.billboards.update(billboardId, payload), context.options);
    });

  billboards
    .command("unpublish")
    .description("Unpublish a billboard")
    .argument("<id>")
    .action(async (id: string, _options: unknown, command: Command) => {
      const context = await openClient(globalOf(command));
      const billboardId = parseIntArg(id, "id");

      if (context.dryRun) {
        dryRunNotice(`PUT /api/billboards/${billboardId}/unpublish`, {}, context.options);
        return;
      }

      const ok = await confirm(`Unpublish billboard ${billboardId}?`, { yes: context.global.yes });
      if (!ok) {
        info("Cancelled.", context.options);
        return;
      }
      await context.client.billboards.unpublish(billboardId);
      success("Billboard unpublished.", context.options);
    });
}
