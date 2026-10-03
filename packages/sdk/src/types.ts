/**
 * Every type the API returns, written out by hand.
 *
 * They are a *baseline*, not a contract. The published OpenAPI spec is
 * incomplete: live article payloads carry fields the spec never mentions, and
 * the spec's `Comment` schema is simply wrong. So these types include the fields
 * we have actually seen, and the SDK never rejects a response for having extra
 * fields. Every object type allows unknown keys via the index signature below.
 */

/** Anything the API may add in future. Extra fields are normal, not an error. */
export interface Extensible {
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

/** The author shape embedded inside articles, comments and podcasts. */
export interface SharedUser extends Extensible {
  name: string;
  username: string;
  twitter_username: string | null;
  github_username: string | null;
  website_url: string | null;
  profile_image: string;
  profile_image_90: string;
}

export interface User extends Extensible {
  type_of: string;
  id: number;
  username: string;
  name: string;
  summary: string | null;
  twitter_username: string | null;
  github_username: string | null;
  website_url: string | null;
  location: string | null;
  joined_at: string;
  profile_image: string;
}

export interface ExtendedUser extends User {
  email: string;
  badge_ids: number[];
}

/** `GET /api/users/me` — the signed-in user. */
export interface MyUser extends ExtendedUser {
  followers_count: number;
  following_users_count?: number;
  followed_tags_count?: number;
  followed_organizations_count?: number;
  followed_podcasts_count?: number;
}

// ---------------------------------------------------------------------------
// Articles
// ---------------------------------------------------------------------------

export interface ArticleFlareTag extends Extensible {
  name: string;
  bg_color_hex: string;
  text_color_hex: string;
}

export interface SharedOrganization extends Extensible {
  name: string;
  username: string;
  slug: string;
  profile_image: string;
  profile_image_90: string;
}

/**
 * An article as it appears in a list.
 *
 * The last block of fields is not in the published spec but is present in real
 * responses, so it is typed here to keep `article.language` compiling.
 */
export interface Article extends Extensible {
  type_of: string;
  id: number;
  title: string;
  description: string;
  cover_image: string | null;
  readable_publish_date: string;
  social_image: string;
  tag_list: string[];
  tags: string;
  slug: string;
  path: string;
  url: string;
  canonical_url: string;
  positive_reactions_count: number;
  public_reactions_count: number;
  created_at: string;
  edited_at: string | null;
  crossposted_at: string | null;
  published_at: string;
  last_comment_at: string;
  published_timestamp: string;
  reading_time_minutes: number;
  user: SharedUser;
  flare_tag?: ArticleFlareTag;
  organization?: SharedOrganization;

  // Not in the spec, but returned by the live API.
  collection_id?: number | null;
  language?: string;
  subforem_id?: number | null;
  ai_disclosure_level?: string | null;
  ai_disclosure_label?: string | null;
}

/** `GET /api/articles/{id}` — an article with its body. */
export interface ArticleDetail extends Article {
  body_html: string;
  body_markdown: string;
}

/** The payload for creating or updating an article. */
export interface ArticlePayload {
  title?: string;
  body_markdown?: string;
  published?: boolean;
  series?: string | null;
  main_image?: string | null;
  canonical_url?: string | null;
  description?: string;
  tags?: string;
  organization_id?: number | null;
}

// ---------------------------------------------------------------------------
// Comments and reactions
// ---------------------------------------------------------------------------

/**
 * The spec claims a comment is `{type_of, id_code, created_at, image_url}`.
 * Real responses also carry `body_html` and `user`, so both are typed here.
 */
export interface Comment extends Extensible {
  type_of: string;
  id_code: string;
  created_at: string;
  body_html: string;
  user: SharedUser;
  children?: Comment[];
}

export type ReactionCategory = "like" | "unicorn" | "exploding_head" | "raised_hands" | "fire";
export type ReactableType = "Comment" | "Article" | "User";

export interface ReactionResult extends Extensible {
  result: string;
  category: ReactionCategory;
  id: number;
  reactable_type: ReactableType;
  reactable_id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Tags, trends, videos, podcasts
// ---------------------------------------------------------------------------

export interface Tag extends Extensible {
  id: number;
  name: string;
  bg_color_hex: string;
  text_color_hex: string;
  /** Not in the published spec, but returned by the live API. */
  short_summary?: string;
}

export interface FollowedTag extends Extensible {
  id: number;
  name: string;
  points: number;
}

export interface Trend extends Extensible {
  type_of: string;
  id: number;
  name: string;
  slug: string;
  description: string;
  key_questions: string[];
  score: number;
  articles_count: number;
  cover_image: string | null;
  first_observed_at: string;
  last_observed_at: string;
  created_at: string;
  updated_at: string;
}

export interface VideoArticle extends Extensible {
  type_of: string;
  id: number;
  path: string;
  cloudinary_video_url: string;
  title: string;
  user_id: number;
  video_duration_in_minutes: string;
  video_source_url: string;
  user: SharedUser;
}

export interface SharedPodcast extends Extensible {
  title: string;
  slug: string;
  image_url: string;
}

export interface PodcastEpisode extends Extensible {
  type_of: string;
  id: number;
  class_name: string;
  path: string;
  title: string;
  image_url: string;
  podcast: SharedPodcast;
}

export interface ProfileImage extends Extensible {
  type_of: string;
  image_of: string;
  profile_image: string;
  profile_image_90: string;
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export interface AnalyticsTotals extends Extensible {
  comments: { total: number };
  follows: { total: number };
  reactions: { total: number; like: number; readinglist: number; unicorn: number };
  page_views: {
    total: number;
    average_read_time_in_seconds: number;
    total_read_time_in_seconds: number;
  };
}

export interface AnalyticsHistorical extends Extensible {
  comments: { date: string; count: number }[];
  follows: { date: string; count: number }[];
  reactions: { date: string; count: number }[];
  page_views: { date: string; count: number }[];
}

export interface AnalyticsPastDay extends Extensible {
  comments: number;
  follows: number;
  reactions: number;
  page_views: number;
}

export interface AnalyticsReferrer extends Extensible {
  domain: string;
  count: number;
}

export interface AnalyticsTopContributor extends Extensible {
  user: SharedUser;
  comments: number;
  reactions: number;
  page_views: number;
}

export interface AnalyticsFollowerEngagement extends Extensible {
  date: string;
  count: number;
}

export interface AnalyticsDashboard extends Extensible {
  comments: { total: number };
  follows: { total: number };
  reactions: { total: number };
  page_views: { total: number };
}

export interface AnalyticsHeatmap extends Extensible {
  date: string;
  count: number;
}

// ---------------------------------------------------------------------------
// Organizations
// ---------------------------------------------------------------------------

export interface Organization extends Extensible {
  type_of: string;
  username: string;
  name: string;
  summary: string;
  twitter_username: string | null;
  github_username: string | null;
  url: string;
  location: string;
  joined_at: string;
  tech_stack: string;
  tag_line: string | null;
  story: string | null;
  id?: number;
  slug?: string;
  profile_image?: string;
  profile_image_90?: string;
}

export interface OrganizationPayload {
  type_of?: string;
  username?: string;
  name?: string;
  summary?: string;
  twitter_username?: string;
  github_username?: string;
  url?: string;
  location?: string;
  joined_at?: string;
  tech_stack?: string;
  tag_line?: string | null;
  story?: string | null;
}

// ---------------------------------------------------------------------------
// Pages, segments, billboards
// ---------------------------------------------------------------------------

export type PageTemplate =
  "contained" | "full_within_layout" | "nav_bar_included" | "json" | "css" | "txt";

export interface Page extends Extensible {
  id: number;
  title: string;
  slug: string;
  description: string;
  body_markdown: string | null;
  body_json: string | null;
  is_top_level_path: boolean;
  social_image: Record<string, unknown> | null;
  template: PageTemplate;
}

export interface PagePayload {
  title?: string;
  slug?: string;
  description?: string;
  body_markdown?: string | null;
  body_json?: string | null;
  is_top_level_path?: boolean;
  social_image?: Record<string, unknown> | null;
  template?: PageTemplate;
}

export interface Segment extends Extensible {
  id: number;
  type_of: string;
  user_count: number;
}

export type BillboardPlacementArea = string;

export interface Billboard extends Extensible {
  id: number;
  name: string;
  body_markdown: string;
  approved: boolean;
  published: boolean;
  expires_at: string | null;
  organization_id: number | null;
  creator_id: number;
  placement_area: BillboardPlacementArea;
  tag_list: string;
  exclude_article_ids: string;
  audience_segment_id: number | null;
  audience_segment_type: string | null;
  target_geolocations: string[] | null;
  display_to: string;
  type_of: string;
}

export type BillboardPayload = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Concepts
// ---------------------------------------------------------------------------

export interface ConceptDailyMetric extends Extensible {
  date: string;
  articles_count: number;
  comments_count: number;
  page_views: number;
  reactions_count: number;
  popularity_score: number;
}

export interface Concept extends Extensible {
  id: number;
  name: string;
  slug: string;
  description: string;
  parent_id: number | null;
  score: number;
  similarity_threshold: number;
  created_at: string;
  updated_at: string;
  daily_metrics?: ConceptDailyMetric[];
  top_articles?: Article[];
}

export interface ConceptPayload {
  name?: string;
  description?: string;
  parent_id?: number | null;
  similarity_threshold?: number;
  score?: number;
}

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

export interface Badge extends Extensible {
  id: number;
  title: string;
  slug: string;
  description: string;
  badge_image: string;
  credits_awarded: number;
  allow_multiple_awards: boolean;
  created_at: string;
  updated_at: string;
}

export interface BadgePayload {
  title?: string;
  description?: string;
  remote_badge_image_url?: string;
  credits_awarded?: number;
  allow_multiple_awards?: boolean;
}

export interface BadgeAchievement extends Extensible {
  id: number;
  user_id: number;
  badge_id: number;
  rewarding_context_message_markdown: string;
  include_default_description: boolean;
  created_at: string;
  updated_at: string;
}

export interface BadgeAchievementPayload {
  user_id?: number;
  badge_id?: number;
  rewarding_context_message_markdown?: string;
  include_default_description?: boolean;
}

// ---------------------------------------------------------------------------
// Recommended articles lists
// ---------------------------------------------------------------------------

export interface RecommendedArticlesList extends Extensible {
  id: number;
  name: string;
  placement_area: string;
  expires_at: string | null;
  user_id: number;
  article_ids: number[];
  created_at: string;
  updated_at: string;
}

export interface RecommendedArticlesListPayload {
  name?: string;
  placement_area?: string;
  expires_at?: string;
  user_id?: number;
  article_ids?: number[];
}

// ---------------------------------------------------------------------------
// Surveys
// ---------------------------------------------------------------------------

export interface PollOption extends Extensible {
  type_of: string;
  id: number;
  markdown: string;
  processed_html: string;
  position: number;
  poll_votes_count: number;
  supplementary_text: string | null;
}

export interface Poll extends Extensible {
  type_of: string;
  id: number;
  prompt_markdown: string;
  prompt_html: string;
  poll_type_of: string;
  position: number;
  poll_votes_count: number;
  poll_skips_count: number;
  poll_options_count: number;
  scale_min: number | null;
  scale_max: number | null;
  created_at: string;
  updated_at: string;
  poll_options: PollOption[];
}

export interface Survey extends Extensible {
  type_of: string;
  id: number;
  title: string;
  slug: string;
  survey_type_of: string;
  active: boolean;
  display_title: boolean;
  allow_resubmission: boolean;
  created_at: string;
  updated_at: string;
}

export interface SurveyWithPolls extends Survey {
  polls: Poll[];
}

export interface PollVote extends Extensible {
  type_of: string;
  id: number;
  poll_id: number;
  poll_option_id: number;
  user_id: number;
  user_email: string | null;
  session_start: string;
  created_at: string;
}

export interface PollTextResponse extends Extensible {
  type_of: string;
  id: number;
  poll_id: number;
  user_id: number;
  user_email: string | null;
  text_content: string;
  session_start: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Request redirects, subforems, instance
// ---------------------------------------------------------------------------

export interface RequestRedirect extends Extensible {
  id: number;
  original_url: string;
  destination_url: string;
  request_domain: string;
  created_at: string;
  updated_at: string;
}

export interface RequestRedirectPayload {
  original_url?: string;
  destination_url?: string;
  request_domain?: string;
}

export interface Subforem extends Extensible {
  id: number;
  domain: string;
  root: boolean;
  name: string;
  description: string;
  logo_image_url: string | null;
  cover_image_url: string | null;
}

export interface Instance extends Extensible {
  title: string;
  description: string;
  url: string;
  logo_image_url: string;
  cover_image_url: string;
}

// ---------------------------------------------------------------------------
// Agent sessions
// ---------------------------------------------------------------------------

export type AgentToolName =
  "claude_code" | "codex" | "gemini_cli" | "github_copilot" | "opencode" | "pi";

export interface AgentSession extends Extensible {
  id: number;
  slug: string;
  title: string;
  tool_name: AgentToolName;
  total_messages: number;
  published: boolean;
  created_at: string;
  updated_at: string;
  url: string;
}

export interface AgentSessionDetail extends AgentSession {
  curated_count: number;
  metadata: Record<string, unknown> | null;
  messages: unknown[];
  slices: unknown[];
}

export interface AgentSessionPayload {
  title?: string;
  /**
   * A JSON **string**, not an object. The API rejects a real object here.
   * Use `JSON.stringify(data)`.
   */
  curated_data?: string;
  s3_key?: string;
  tool_name?: AgentToolName;
}

/**
 * `POST /api/agent_sessions/presign` — undocumented, but it exists and works.
 * Returns 503 when the instance has no S3 bucket configured.
 */
export interface PresignedUpload extends Extensible {
  s3_key: string;
  presigned_url: string;
}

// ---------------------------------------------------------------------------
// Listings (deprecated v0 API)
// ---------------------------------------------------------------------------

export interface ListingCategory extends Extensible {
  id: number;
  name: string;
  slug: string;
  cost: number;
}

export interface Listing extends Extensible {
  type_of: string;
  id: number;
  title: string;
  slug: string;
  body_markdown: string;
  category: string;
  processed_html: string;
  tag_list: string;
  tags: string[];
  user: SharedUser;
  organization?: SharedOrganization;
  published: boolean;
  created_at: string;
  expires_at: string | null;
  listing_category: ListingCategory;
}
