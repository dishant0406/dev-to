# API coverage

Every operation in the Forem API v1 spec, and where it lives in this project.

Every row is checked by a test. `coverage.test.ts` fails if this list stops matching
`spec/forem-api-v1.yaml`, and `params.test.ts` checks the query parameters and request
bodies each SDK method sends.

**126 / 126 operations implemented.**

## Not in the spec, but live

Found in the Forem source and confirmed against the live API. The published spec does
not mention them.

| Method | Path | SDK | CLI |
| --- | --- | --- | --- |
| POST | `/api/agent_sessions/presign` | `agentSessions.presign()` | used by `agent-sessions upload` |
| GET | `/api/agent_sessions/{id}/raw_url` | `agentSessions.rawUrl(id)` | `devto agent-sessions raw-url <id>` |

## Deprecated v0 API

Still live, but only present in the v0 spec, so Forem may remove them. Isolated in
`packages/sdk/src/resources/platform.ts`.

| Method | Path | SDK | CLI |
| --- | --- | --- | --- |
| GET | `/api/listings` | `listings.list()` | `devto listings list` |
| GET | `/api/listings/category/{category}` | `listings.byCategory()` | `devto listings by-category` |
| GET | `/api/listings/{id}` | `listings.get()` | `devto listings get` |
| GET | `/api/organizations/{username}/listings` | `listings.byOrganization()` | `devto listings by-organization` |

## v1 operations

### admin (25)

| Method | Path | SDK | CLI |
| --- | --- | --- | --- |
| DELETE | `/api/admin/concepts/{id}` | `devto.concepts.adminDelete(1)` | `devto concepts admin delete <id>` |
| DELETE | `/api/admin/request_redirects/{id}` | `devto.requestRedirects.delete(1)` | `devto request-redirects delete <id>` |
| DELETE | `/api/admin/users/{user_id}/identities/{id}` | `devto.users.adminDeleteIdentity(1, 2)` | `devto users admin remove-identity <user-id> <identity-id>` |
| GET | `/api/admin/concepts` | `devto.concepts.adminList()` | `devto concepts admin list` |
| GET | `/api/admin/concepts/{id}` | `devto.concepts.adminGet(1)` | `devto concepts admin get <id>` |
| GET | `/api/admin/request_redirects` | `devto.requestRedirects.list()` | `devto request-redirects list` |
| GET | `/api/admin/request_redirects/{id}` | `devto.requestRedirects.get(1)` | `devto request-redirects get <id>` |
| GET | `/api/admin/users` | `devto.users.adminList()` | `devto users admin list` |
| GET | `/api/admin/users/{id}` | `devto.users.adminGet(1)` | `devto users admin get <id>` |
| GET | `/api/admin/users/{user_id}/identities` | `devto.users.adminListIdentities(1)` | `devto users admin identities <user-id>` |
| GET | `/api/admin/users/{user_id}/notes` | `devto.users.adminListNotes(1)` | `devto users admin notes <user-id>` |
| PATCH | `/api/admin/concepts/{id}` | `devto.concepts.adminUpdate(1, { name: "n" })` | `devto concepts admin update <id> --data @concept.json` |
| PATCH | `/api/admin/request_redirects/{id}` | `devto.requestRedirects.update(1, { original_url: "a" })` | `devto request-redirects update <id>` |
| PATCH | `/api/admin/users/{id}` | `devto.users.adminUpdate(1, { name: "n" })` | `devto users admin update <id>` |
| POST | `/api/admin/concepts` | `devto.concepts.adminCreate({ name: "n" })` | `devto concepts admin create --data @concept.json` |
| POST | `/api/admin/concepts/{id}/trigger_lookback` | `devto.concepts.adminTriggerLookback(1, 7)` | `devto concepts admin trigger-lookback <id> --days <n>` |
| POST | `/api/admin/request_redirects` | `devto.requestRedirects.create({ original_url: "a" })` | `devto request-redirects create --original-url <u> --destination-url <u> --request-domain <d>` |
| POST | `/api/admin/users` | `devto.users.adminCreate({ email: "a@b.co" })` | `devto users admin create --email <e>` |
| POST | `/api/admin/users/identities/bulk` | `devto.users.adminBulkIdentities({ provider: "p", identities: [] })` | `devto users admin bulk-identities --data @ids.json` |
| POST | `/api/admin/users/{id}/merge` | `devto.users.adminMerge(1, 2)` | `devto users admin merge <id> --into <id>` |
| POST | `/api/admin/users/{user_id}/identities` | `devto.users.adminCreateIdentity(1, { provider: "p", uid: "u" })` | `devto users admin add-identity <user-id> --provider p --uid u` |
| POST | `/api/admin/users/{user_id}/notes` | `devto.users.adminCreateNote(1, { content: "c" })` | `devto users admin add-note <user-id> --content <text>` |
| PUT | `/api/admin/users/{id}/email` | `devto.users.adminUpdateEmail(1, "a@b.co")` | `devto users admin set-email <id> --email <e>` |
| PUT | `/api/admin/users/{id}/notification_settings` | `devto.users.adminUpdateNotificationSettings(1, { notification_setting: { email_newsletter: true } })` | `devto users admin set-notification-settings <id> --email-newsletter true` |
| PUT | `/api/admin/users/{id}/status` | `devto.users.adminUpdateStatus(1, { status: "s" })` | `devto users admin set-status <id> --status <s>` |

### agent_sessions (3)

| Method | Path | SDK | CLI |
| --- | --- | --- | --- |
| GET | `/api/agent_sessions` | `devto.agentSessions.list()` | `devto agent-sessions list` |
| GET | `/api/agent_sessions/{id}` | `devto.agentSessions.get(1)` | `devto agent-sessions get <id>` |
| POST | `/api/agent_sessions` | `devto.agentSessions.create({ title: "t" })` | `devto agent-sessions upload --file <f> --title <t>` |

### analytics (8)

| Method | Path | SDK | CLI |
| --- | --- | --- | --- |
| GET | `/api/analytics/dashboard` | `devto.analytics.dashboard()` | `devto analytics dashboard` |
| GET | `/api/analytics/follower_engagement` | `devto.analytics.followerEngagement()` | `devto analytics follower-engagement` |
| GET | `/api/analytics/heatmap` | `devto.analytics.heatmap()` | `devto analytics heatmap` |
| GET | `/api/analytics/historical` | `devto.analytics.historical({ start: "2026-01-01" })` | `devto analytics historical --start <date>` |
| GET | `/api/analytics/past_day` | `devto.analytics.pastDay()` | `devto analytics past-day` |
| GET | `/api/analytics/referrers` | `devto.analytics.referrers()` | `devto analytics referrers` |
| GET | `/api/analytics/top_contributors` | `devto.analytics.topContributors()` | `devto analytics top-contributors` |
| GET | `/api/analytics/totals` | `devto.analytics.totals()` | `devto analytics totals` |

### articles (12)

| Method | Path | SDK | CLI |
| --- | --- | --- | --- |
| GET | `/api/articles` | `devto.articles.list()` | `devto articles list` |
| GET | `/api/articles/latest` | `devto.articles.latest()` | `devto articles latest` |
| GET | `/api/articles/me` | `devto.articles.mine()` | `devto articles mine` |
| GET | `/api/articles/me/all` | `devto.articles.mineAll()` | `devto articles mine --state all` |
| GET | `/api/articles/me/published` | `devto.articles.minePublished()` | `devto articles mine --state published` |
| GET | `/api/articles/me/unpublished` | `devto.articles.mineUnpublished()` | `devto articles mine --state unpublished` |
| GET | `/api/articles/search` | `devto.articles.search({ q: "x" })` | `devto articles search -q <text>` |
| GET | `/api/articles/{id}` | `devto.articles.get(1)` | `devto articles get <id>` |
| GET | `/api/articles/{username}/{slug}` | `devto.articles.getByPath("user", "slug")` | `devto articles get-by-path <u> <s>` |
| POST | `/api/articles` | `devto.articles.create({ title: "t" })` | `devto articles create --file <f>` |
| PUT | `/api/articles/{id}` | `devto.articles.update(1, { title: "t" })` | `devto articles update <id> --file <f>` |
| PUT | `/api/articles/{id}/unpublish` | `devto.articles.unpublish(1)` | `devto articles unpublish <id>` |

### badge_achievements (4)

| Method | Path | SDK | CLI |
| --- | --- | --- | --- |
| DELETE | `/api/badge_achievements/{id}` | `devto.badgeAchievements.delete(1)` | `devto badge-achievements delete <id>` |
| GET | `/api/badge_achievements` | `devto.badgeAchievements.list()` | `devto badge-achievements list` |
| GET | `/api/badge_achievements/{id}` | `devto.badgeAchievements.get(1)` | `devto badge-achievements get <id>` |
| POST | `/api/badge_achievements` | `devto.badgeAchievements.create({ user_id: 1, badge_id: 2 })` | `devto badge-achievements create --user <id> --badge <id>` |

### badges (5)

| Method | Path | SDK | CLI |
| --- | --- | --- | --- |
| DELETE | `/api/badges/{id}` | `devto.badges.delete(1)` | `devto badges delete <id>` |
| GET | `/api/badges` | `devto.badges.list()` | `devto badges list` |
| GET | `/api/badges/{id}` | `devto.badges.get(1)` | `devto badges get <id>` |
| PATCH | `/api/badges/{id}` | `devto.badges.update(1, { title: "t" })` | `devto badges update <id> --data @badge.json` |
| POST | `/api/badges` | `devto.badges.create({ title: "t" })` | `devto badges create --data @badge.json` |

### billboards (5)

| Method | Path | SDK | CLI |
| --- | --- | --- | --- |
| GET | `/api/billboards` | `devto.billboards.list()` | `devto billboards list` |
| GET | `/api/billboards/{id}` | `devto.billboards.get(1)` | `devto billboards get <id>` |
| POST | `/api/billboards` | `devto.billboards.create({})` | `devto billboards create --data @billboard.json` |
| PUT | `/api/billboards/{id}` | `devto.billboards.update(1, {})` | `devto billboards update <id> --data @billboard.json` |
| PUT | `/api/billboards/{id}/unpublish` | `devto.billboards.unpublish(1)` | `devto billboards unpublish <id>` |

### comments (2)

| Method | Path | SDK | CLI |
| --- | --- | --- | --- |
| GET | `/api/comments` | `devto.comments.list({ aId: 1 })` | `devto comments list --article <id>` |
| GET | `/api/comments/{id}` | `devto.comments.get("abc")` | `devto comments get <id-code>` |

### concepts (4)

| Method | Path | SDK | CLI |
| --- | --- | --- | --- |
| GET | `/api/concepts` | `devto.concepts.list()` | `devto concepts list` |
| GET | `/api/concepts/{id}` | `devto.concepts.get(1)` | `devto concepts get <id>` |
| GET | `/api/concepts/{id}/articles` | `devto.concepts.articles(1)` | `devto concepts articles <id>` |
| PATCH | `/api/concepts/{id}` | `devto.concepts.update(1, { score: 1 })` | `devto concepts update <id> --data @concept.json` |

### feedback_messages (1)

| Method | Path | SDK | CLI |
| --- | --- | --- | --- |
| PATCH | `/api/feedback_messages/{id}` | `devto.feedbackMessages.update(1, "Resolved")` | `devto feedback-messages <id> --status <s>` |

### followers (1)

| Method | Path | SDK | CLI |
| --- | --- | --- | --- |
| GET | `/api/followers/users` | `devto.followers.list()` | `devto followers list` |

### follows (2)

| Method | Path | SDK | CLI |
| --- | --- | --- | --- |
| GET | `/api/follows/tags` | `devto.follows.tags()` | `devto follows tags` |
| POST | `/api/follows` | `devto.follows.create({ userIds: [1] })` | `devto follows create --users 1,2` |

### health_checks (3)

| Method | Path | SDK | CLI |
| --- | --- | --- | --- |
| GET | `/api/health_checks/app` | `devto.healthChecks.app()` | `devto health app` |
| GET | `/api/health_checks/cache` | `devto.healthChecks.cache()` | `devto health cache` |
| GET | `/api/health_checks/database` | `devto.healthChecks.database()` | `devto health database` |

### instance (1)

| Method | Path | SDK | CLI |
| --- | --- | --- | --- |
| GET | `/api/instance` | `devto.instance.get()` | `devto instance` |

### organizations (8)

| Method | Path | SDK | CLI |
| --- | --- | --- | --- |
| DELETE | `/api/organizations/{id}` | `devto.organizations.delete(1)` | `devto organizations delete <id>` |
| GET | `/api/organizations` | `devto.organizations.list()` | `devto organizations list` |
| GET | `/api/organizations/{id}` | `devto.organizations.getById(1)` | `devto organizations get <id>` |
| GET | `/api/organizations/{organization_id_or_username}/articles` | `devto.organizations.articles("org")` | `devto organizations articles <u>` |
| GET | `/api/organizations/{organization_id_or_username}/users` | `devto.organizations.users("org")` | `devto organizations users <u>` |
| GET | `/api/organizations/{username}` | `devto.organizations.get("org")` | `devto organizations get <username>` |
| POST | `/api/organizations` | `devto.organizations.create({ name: "n" })` | `devto organizations create --data @org.json` |
| PUT | `/api/organizations/{id}` | `devto.organizations.update(1, { name: "n" })` | `devto organizations update <id> --data @org.json` |

### pages (5)

| Method | Path | SDK | CLI |
| --- | --- | --- | --- |
| DELETE | `/api/pages/{id}` | `devto.pages.delete(1)` | `devto pages delete <id>` |
| GET | `/api/pages` | `devto.pages.list()` | `devto pages list` |
| GET | `/api/pages/{id}` | `devto.pages.get(1)` | `devto pages get <id>` |
| POST | `/api/pages` | `devto.pages.create({ title: "t" })` | `devto pages create --data @page.json` |
| PUT | `/api/pages/{id}` | `devto.pages.update(1, { title: "t" })` | `devto pages update <id> --data @page.json` |

### podcast_episodes (1)

| Method | Path | SDK | CLI |
| --- | --- | --- | --- |
| GET | `/api/podcast_episodes` | `devto.podcastEpisodes.list()` | `devto podcast-episodes list` |

### profile_images (1)

| Method | Path | SDK | CLI |
| --- | --- | --- | --- |
| GET | `/api/profile_images/{username}` | `devto.profileImages.get("user")` | `devto profile-images <username>` |

### reactions (2)

| Method | Path | SDK | CLI |
| --- | --- | --- | --- |
| POST | `/api/reactions` | `devto.reactions.create({ category: "like", reactableId: 1, reactableType: "Article" })` | `devto reactions create --type Article --id <n> --category like` |
| POST | `/api/reactions/toggle` | `devto.reactions.toggle({ category: "like", reactableId: 1, reactableType: "Article" })` | `devto reactions toggle --type Article --id <n> --category like` |

### readinglist (1)

| Method | Path | SDK | CLI |
| --- | --- | --- | --- |
| GET | `/api/readinglist` | `devto.readingList.list()` | `devto reading-list list` |

### recommended_articles_lists (4)

| Method | Path | SDK | CLI |
| --- | --- | --- | --- |
| GET | `/api/recommended_articles_lists` | `devto.recommendedLists.list()` | `devto recommended-lists list` |
| GET | `/api/recommended_articles_lists/{id}` | `devto.recommendedLists.get(1)` | `devto recommended-lists get <id>` |
| PATCH | `/api/recommended_articles_lists/{id}` | `devto.recommendedLists.update(1, { name: "n" })` | `devto recommended-lists update <id> --data @list.json` |
| POST | `/api/recommended_articles_lists` | `devto.recommendedLists.create({ placement_area: "x", user_id: 1 })` | `devto recommended-lists create --data @list.json` |

### segments (7)

| Method | Path | SDK | CLI |
| --- | --- | --- | --- |
| DELETE | `/api/segments/{id}` | `devto.segments.delete(1)` | `devto segments delete <id>` |
| GET | `/api/segments` | `devto.segments.list()` | `devto segments list` |
| GET | `/api/segments/{id}` | `devto.segments.get(1)` | `devto segments get <id>` |
| GET | `/api/segments/{id}/users` | `devto.segments.users(1)` | `devto segments users <id>` |
| POST | `/api/segments` | `devto.segments.create()` | `devto segments create` |
| PUT | `/api/segments/{id}/add_users` | `devto.segments.addUsers(1, [2])` | `devto segments add-users <id> --users 1,2` |
| PUT | `/api/segments/{id}/remove_users` | `devto.segments.removeUsers(1, [2])` | `devto segments remove-users <id> --users 1,2` |

### subforems (1)

| Method | Path | SDK | CLI |
| --- | --- | --- | --- |
| GET | `/api/subforems` | `devto.subforems.list()` | `devto subforems` |

### surveys (4)

| Method | Path | SDK | CLI |
| --- | --- | --- | --- |
| GET | `/api/surveys` | `devto.surveys.list()` | `devto surveys list` |
| GET | `/api/surveys/{id_or_slug}` | `devto.surveys.get("item")` | `devto surveys get <id-or-slug>` |
| GET | `/api/surveys/{id_or_slug}/poll_text_responses` | `devto.surveys.pollTextResponses("item")` | `devto surveys poll-text-responses <id-or-slug>` |
| GET | `/api/surveys/{id_or_slug}/poll_votes` | `devto.surveys.pollVotes("item")` | `devto surveys poll-votes <id-or-slug>` |

### tags (1)

| Method | Path | SDK | CLI |
| --- | --- | --- | --- |
| GET | `/api/tags` | `devto.tags.list()` | `devto tags list` |

### trends (3)

| Method | Path | SDK | CLI |
| --- | --- | --- | --- |
| GET | `/api/trends` | `devto.trends.list()` | `devto trends list` |
| GET | `/api/trends/{id_or_slug}` | `devto.trends.get("trend")` | `devto trends get <id-or-slug>` |
| GET | `/api/trends/{trend_id_or_slug}/articles` | `devto.trends.articles("trend")` | `devto trends articles <id-or-slug>` |

### users (11)

| Method | Path | SDK | CLI |
| --- | --- | --- | --- |
| DELETE | `/api/users/{id}/limited` | `devto.users.unlimit(1)` | `devto users unlimit <id>` |
| DELETE | `/api/users/{id}/spam` | `devto.users.unspam(1)` | `devto users unspam <id>` |
| DELETE | `/api/users/{id}/trusted` | `devto.users.untrust(1)` | `devto users untrust <id>` |
| GET | `/api/users/me` | `devto.users.me()` | `devto users me` |
| GET | `/api/users/search` | `devto.users.search("a@b.co")` | `devto users search --email <e>` |
| GET | `/api/users/{id}` | `devto.users.get(1)` | `devto users get <id-or-username>` |
| PUT | `/api/users/{id}/limited` | `devto.users.limit(1)` | `devto users limit <id>` |
| PUT | `/api/users/{id}/spam` | `devto.users.spam(1)` | `devto users spam <id>` |
| PUT | `/api/users/{id}/suspend` | `devto.users.suspend(1)` | `devto users suspend <id>` |
| PUT | `/api/users/{id}/trusted` | `devto.users.trust(1)` | `devto users trust <id>` |
| PUT | `/api/users/{id}/unpublish` | `devto.users.unpublish(1)` | `devto users unpublish <id>` |

### videos (1)

| Method | Path | SDK | CLI |
| --- | --- | --- | --- |
| GET | `/api/videos` | `devto.videos.list()` | `devto videos list` |

