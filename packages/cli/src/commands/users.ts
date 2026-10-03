/**
 * `devto users ...` — profiles and moderation.
 *
 * Everything under `devto users admin` needs an admin API key and changes real
 * accounts, so those commands confirm before they run.
 */

import { Command } from "commander";
import {
  confirm,
  dryRunNotice,
  globalOf,
  openClient,
  parseIntArg,
  readJsonInput,
  type Context,
} from "../helpers.js";
import { info, print, success } from "../output.js";
import type { AdminUpdateUserPayload } from "@dishant0406/dev-to";

export function registerUsersCommands(program: Command): void {
  const users = program.command("users").description("Profiles and moderation");

  users
    .command("me")
    .description("Show the user the current API key belongs to")
    .action(async (_options: unknown, command: Command) => {
      const { client, options } = await openClient(globalOf(command));
      print(await client.users.me(), options);
    });

  users
    .command("get")
    .description("Get a public profile by id or username")
    .argument("<id-or-username>")
    .action(async (idOrUsername: string, _options: unknown, command: Command) => {
      const { client, options } = await openClient(globalOf(command));
      const numeric = Number(idOrUsername);
      print(await client.users.get(Number.isInteger(numeric) ? numeric : idOrUsername), options);
    });

  users
    .command("search")
    .description("Find a user by email (admin key required)")
    .requiredOption("-e, --email <email>")
    .action(async (options: { email: string }, command: Command) => {
      const { client, options: output } = await openClient(globalOf(command));
      print(await client.users.search(options.email), output);
    });

  registerModeration(users);
  registerAdmin(users);
}

function registerModeration(users: Command): void {
  const moderation: Array<{
    name: string;
    description: string;
    run: (context: Context, id: number) => Promise<void>;
  }> = [
    {
      name: "suspend",
      description: "Suspend a user",
      run: async (context, id) => {
        await context.client.users.suspend(id);
      },
    },
    {
      name: "limit",
      description: "Limit a user",
      run: async (context, id) => {
        await context.client.users.limit(id);
      },
    },
    {
      name: "unlimit",
      description: "Remove a user's limit",
      run: async (context, id) => {
        await context.client.users.unlimit(id);
      },
    },
    {
      name: "spam",
      description: "Mark a user as spam",
      run: async (context, id) => {
        await context.client.users.spam(id);
      },
    },
    {
      name: "unspam",
      description: "Remove a user's spam flag",
      run: async (context, id) => {
        await context.client.users.unspam(id);
      },
    },
    {
      name: "trust",
      description: "Mark a user as trusted",
      run: async (context, id) => {
        await context.client.users.trust(id);
      },
    },
    {
      name: "untrust",
      description: "Remove a user's trusted status",
      run: async (context, id) => {
        await context.client.users.untrust(id);
      },
    },
    {
      name: "unpublish",
      description: "Unpublish every article written by a user",
      run: async (context, id) => {
        await context.client.users.unpublish(id);
      },
    },
  ];

  for (const item of moderation) {
    users
      .command(item.name)
      .description(item.description)
      .argument("<id>")
      .action(async (id: string, _options: unknown, command: Command) => {
        const context = await openClient(globalOf(command));
        const userId = parseIntArg(id, "id");

        if (context.dryRun) {
          dryRunNotice(`${item.name} user ${userId}`, { userId }, context.options);
          return;
        }

        const ok = await confirm(`${item.description}? This takes effect immediately.`, {
          yes: context.global.yes,
        });
        if (!ok) {
          info("Cancelled.", context.options);
          return;
        }

        await item.run(context, userId);
        success(`${item.name}: user ${userId}`, context.options);
      });
  }
}

function registerAdmin(users: Command): void {
  const admin = users
    .command("admin")
    .description("Admin-only user management (needs an admin key)");

  admin
    .command("list")
    .description("List users")
    .option("--page <n>")
    .option("--per-page <n>")
    .option("--email <email>")
    .option("--username <username>")
    .action(
      async (
        options: { page?: string; perPage?: string; email?: string; username?: string },
        command: Command,
      ) => {
        const { client, options: output } = await openClient(globalOf(command));
        print(
          await client.users.adminList({
            page: options.page === undefined ? undefined : parseIntArg(options.page, "page"),
            perPage:
              options.perPage === undefined ? undefined : parseIntArg(options.perPage, "per-page"),
            email: options.email,
            username: options.username,
          }),
          output,
        );
      },
    );

  admin
    .command("get")
    .description("Get a user")
    .argument("<id>")
    .action(async (id: string, _options: unknown, command: Command) => {
      const { client, options } = await openClient(globalOf(command));
      print(await client.users.adminGet(parseIntArg(id, "id")), options);
    });

  admin
    .command("create")
    .description("Invite a user by email")
    .requiredOption("--email <email>")
    .option("--name <name>")
    .action(async (options: { email: string; name?: string }, command: Command) => {
      const context = await openClient(globalOf(command));
      const payload = { email: options.email, name: options.name };

      if (context.dryRun) {
        dryRunNotice("POST /api/admin/users", payload, context.options);
        return;
      }
      print(await context.client.users.adminCreate(payload), context.options);
    });

  admin
    .command("update")
    .description("Update a user's profile")
    .argument("<id>")
    .option("--name <name>")
    .option("--username <username>")
    .option("--summary <summary>")
    .option("--location <location>")
    .option("--website-url <url>")
    .action(
      async (
        id: string,
        options: {
          name?: string;
          username?: string;
          summary?: string;
          location?: string;
          websiteUrl?: string;
        },
        command: Command,
      ) => {
        const context = await openClient(globalOf(command));
        const payload: AdminUpdateUserPayload = {
          name: options.name,
          username: options.username,
          summary: options.summary,
          location: options.location,
          website_url: options.websiteUrl,
        };
        const userId = parseIntArg(id, "id");

        if (context.dryRun) {
          dryRunNotice(`PATCH /api/admin/users/${userId}`, payload, context.options);
          return;
        }
        print(await context.client.users.adminUpdate(userId, payload), context.options);
      },
    );

  admin
    .command("set-email")
    .description("Change a user's email address")
    .argument("<id>")
    .requiredOption("--email <email>")
    .action(async (id: string, options: { email: string }, command: Command) => {
      const context = await openClient(globalOf(command));
      const userId = parseIntArg(id, "id");

      if (context.dryRun) {
        dryRunNotice(
          `PUT /api/admin/users/${userId}/email`,
          { email: options.email },
          context.options,
        );
        return;
      }
      print(await context.client.users.adminUpdateEmail(userId, options.email), context.options);
    });

  admin
    .command("set-status")
    .description("Change a user's moderation status")
    .argument("<id>")
    .requiredOption("--status <status>")
    .option("--note <note>")
    .action(async (id: string, options: { status: string; note?: string }, command: Command) => {
      const context = await openClient(globalOf(command));
      const userId = parseIntArg(id, "id");

      if (context.dryRun) {
        dryRunNotice(`PUT /api/admin/users/${userId}/status`, options, context.options);
        return;
      }

      const ok = await confirm(`Set user ${userId} to status "${options.status}"?`, {
        yes: context.global.yes,
      });
      if (!ok) {
        info("Cancelled.", context.options);
        return;
      }
      print(
        await context.client.users.adminUpdateStatus(userId, {
          status: options.status,
          note: options.note,
        }),
        context.options,
      );
    });

  admin
    .command("set-notification-settings")
    .description("Change a user's newsletter setting")
    .argument("<id>")
    .requiredOption("--email-newsletter <true|false>")
    .action(async (id: string, options: { emailNewsletter: string }, command: Command) => {
      const context = await openClient(globalOf(command));
      const userId = parseIntArg(id, "id");
      const payload = {
        notification_setting: { email_newsletter: options.emailNewsletter === "true" },
      };

      if (context.dryRun) {
        dryRunNotice(
          `PUT /api/admin/users/${userId}/notification_settings`,
          payload,
          context.options,
        );
        return;
      }
      print(
        await context.client.users.adminUpdateNotificationSettings(userId, payload),
        context.options,
      );
    });

  admin
    .command("merge")
    .description("Merge one user into another (irreversible)")
    .argument("<id>")
    .requiredOption("--into <id>", "the user id that survives")
    .action(async (id: string, options: { into: string }, command: Command) => {
      const context = await openClient(globalOf(command));
      const userId = parseIntArg(id, "id");
      const targetId = parseIntArg(options.into, "into");

      if (context.dryRun) {
        dryRunNotice(
          `POST /api/admin/users/${userId}/merge`,
          { merge_user_id: targetId },
          context.options,
        );
        return;
      }

      const ok = await confirm(
        `Merge user ${userId} into user ${targetId}? This cannot be undone.`,
        {
          yes: context.global.yes,
        },
      );
      if (!ok) {
        info("Cancelled.", context.options);
        return;
      }
      print(await context.client.users.adminMerge(userId, targetId), context.options);
    });

  admin
    .command("notes")
    .description("List a user's admin notes")
    .argument("<user-id>")
    .action(async (userId: string, _options: unknown, command: Command) => {
      const { client, options } = await openClient(globalOf(command));
      print(await client.users.adminListNotes(parseIntArg(userId, "user-id")), options);
    });

  admin
    .command("add-note")
    .description("Add an admin note to a user")
    .argument("<user-id>")
    .requiredOption("--content <text>")
    .option("--reason <reason>")
    .action(
      async (userId: string, options: { content: string; reason?: string }, command: Command) => {
        const context = await openClient(globalOf(command));
        const payload = { content: options.content, reason: options.reason };
        const id = parseIntArg(userId, "user-id");

        if (context.dryRun) {
          dryRunNotice(`POST /api/admin/users/${id}/notes`, payload, context.options);
          return;
        }
        print(await context.client.users.adminCreateNote(id, payload), context.options);
      },
    );

  admin
    .command("identities")
    .description("List a user's identities")
    .argument("<user-id>")
    .action(async (userId: string, _options: unknown, command: Command) => {
      const { client, options } = await openClient(globalOf(command));
      print(await client.users.adminListIdentities(parseIntArg(userId, "user-id")), options);
    });

  admin
    .command("add-identity")
    .description("Add an identity to a user")
    .argument("<user-id>")
    .requiredOption("--provider <provider>")
    .requiredOption("--uid <uid>")
    .option("--username <username>")
    .action(
      async (
        userId: string,
        options: { provider: string; uid: string; username?: string },
        command: Command,
      ) => {
        const context = await openClient(globalOf(command));
        const payload = {
          provider: options.provider,
          uid: options.uid,
          username: options.username,
        };
        const id = parseIntArg(userId, "user-id");

        if (context.dryRun) {
          dryRunNotice(`POST /api/admin/users/${id}/identities`, payload, context.options);
          return;
        }
        print(await context.client.users.adminCreateIdentity(id, payload), context.options);
      },
    );

  admin
    .command("remove-identity")
    .description("Remove an identity from a user")
    .argument("<user-id>")
    .argument("<identity-id>")
    .action(async (userId: string, identityId: string, _options: unknown, command: Command) => {
      const context = await openClient(globalOf(command));
      const user = parseIntArg(userId, "user-id");
      const identity = parseIntArg(identityId, "identity-id");

      if (context.dryRun) {
        dryRunNotice(`DELETE /api/admin/users/${user}/identities/${identity}`, {}, context.options);
        return;
      }

      const ok = await confirm(`Remove identity ${identity} from user ${user}?`, {
        yes: context.global.yes,
      });
      if (!ok) {
        info("Cancelled.", context.options);
        return;
      }
      await context.client.users.adminDeleteIdentity(user, identity);
      success("Identity removed.", context.options);
    });

  admin
    .command("bulk-identities")
    .description("Add many identities at once from a JSON file")
    .requiredOption("--data <json>", "JSON body, @file.json, or - for stdin")
    .action(async (options: { data: string }, command: Command) => {
      const context = await openClient(globalOf(command));
      const payload = (await readJsonInput(options.data)) as {
        provider: string;
        identities: { user_id: number; uid: string }[];
      };

      if (context.dryRun) {
        dryRunNotice("POST /api/admin/users/identities/bulk", payload, context.options);
        return;
      }
      print(await context.client.users.adminBulkIdentities(payload), context.options);
    });
}
