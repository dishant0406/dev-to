import type { HttpClient } from "../http.js";
import type { ExtendedUser, MyUser, User } from "../types.js";

export interface AdminListUsersParams {
  page?: number;
  perPage?: number;
  email?: string;
  username?: string;
}

export interface AdminUpdateUserPayload {
  name?: string;
  username?: string;
  summary?: string;
  location?: string;
  website_url?: string;
}

export interface AdminUserStatusPayload {
  status: string;
  note?: string;
}

export interface AdminCreateUserPayload {
  email?: string;
  name?: string | null;
}

export interface AdminNotificationSettingsPayload {
  notification_setting: { email_newsletter: boolean };
}

export interface AdminNotePayload {
  content: string;
  reason?: string;
}

export interface AdminIdentityPayload {
  provider: string;
  uid: string;
  username?: string;
}

export interface AdminBulkIdentityPayload {
  provider: string;
  identities: { user_id: number; uid: string }[];
}

/** Shape not covered by the published spec; taken from the API source. */
export interface AdminNote {
  id: number;
  content: string;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

/** Shape not covered by the published spec; taken from the API source. */
export interface AdminIdentity {
  id: number;
  provider: string;
  uid: string;
  username: string | null;
}

export class UsersResource {
  constructor(private readonly http: HttpClient) {}

  /** `GET /api/users/me` — the user the API key belongs to. */
  me() {
    return this.http.get<MyUser>("/api/users/me");
  }

  /** `GET /api/users/{id}` — public profile. Accepts an id or a username. */
  get(idOrUsername: number | string) {
    return this.http.get<User>(`/api/users/${encodeURIComponent(String(idOrUsername))}`);
  }

  /** `GET /api/users/search?email=` — requires an admin key. */
  search(email: string) {
    return this.http.get<User[]>("/api/users/search", { query: { email } });
  }

  // --- Moderation. These are admin-only and take effect immediately. ---

  /** `PUT /api/users/{id}/suspend` */
  suspend(id: number) {
    return this.http.put<void>(`/api/users/${id}/suspend`);
  }

  /** `PUT /api/users/{id}/limited` */
  limit(id: number) {
    return this.http.put<void>(`/api/users/${id}/limited`);
  }

  /** `DELETE /api/users/{id}/limited` */
  unlimit(id: number) {
    return this.http.delete<void>(`/api/users/${id}/limited`);
  }

  /** `PUT /api/users/{id}/spam` */
  spam(id: number) {
    return this.http.put<void>(`/api/users/${id}/spam`);
  }

  /** `DELETE /api/users/{id}/spam` */
  unspam(id: number) {
    return this.http.delete<void>(`/api/users/${id}/spam`);
  }

  /** `PUT /api/users/{id}/trusted` */
  trust(id: number) {
    return this.http.put<void>(`/api/users/${id}/trusted`);
  }

  /** `DELETE /api/users/{id}/trusted` */
  untrust(id: number) {
    return this.http.delete<void>(`/api/users/${id}/trusted`);
  }

  /** `PUT /api/users/{id}/unpublish` — unpublishes every article by the user. */
  unpublish(id: number) {
    return this.http.put<void>(`/api/users/${id}/unpublish`);
  }

  // --- Admin user management. All of these need an admin key. ---

  /** `POST /api/admin/users` — invite a user by email. */
  adminCreate(payload: AdminCreateUserPayload) {
    return this.http.post<ExtendedUser>("/api/admin/users", { body: payload });
  }

  /** `GET /api/admin/users` */
  adminList(params: AdminListUsersParams = {}) {
    return this.http.get<ExtendedUser[]>("/api/admin/users", {
      query: {
        page: params.page,
        per_page: params.perPage,
        email: params.email,
        username: params.username,
      },
    });
  }

  /** `GET /api/admin/users/{id}` */
  adminGet(id: number) {
    return this.http.get<ExtendedUser>(`/api/admin/users/${id}`);
  }

  /** `PATCH /api/admin/users/{id}` */
  adminUpdate(id: number, payload: AdminUpdateUserPayload) {
    return this.http.patch<ExtendedUser>(`/api/admin/users/${id}`, { body: payload });
  }

  /** `PUT /api/admin/users/{id}/email` */
  adminUpdateEmail(id: number, email: string) {
    return this.http.put<ExtendedUser>(`/api/admin/users/${id}/email`, { body: { email } });
  }

  /** `PUT /api/admin/users/{id}/status` */
  adminUpdateStatus(id: number, payload: AdminUserStatusPayload) {
    return this.http.put<ExtendedUser>(`/api/admin/users/${id}/status`, { body: payload });
  }

  /** `PUT /api/admin/users/{id}/notification_settings` */
  adminUpdateNotificationSettings(id: number, payload: AdminNotificationSettingsPayload) {
    return this.http.put<ExtendedUser>(`/api/admin/users/${id}/notification_settings`, {
      body: payload,
    });
  }

  /** `POST /api/admin/users/{id}/merge` — irreversible. */
  adminMerge(id: number, mergeUserId: number) {
    return this.http.post<ExtendedUser>(`/api/admin/users/${id}/merge`, {
      body: { merge_user_id: mergeUserId },
    });
  }

  /** `GET /api/admin/users/{user_id}/notes` */
  adminListNotes(userId: number) {
    return this.http.get<AdminNote[]>(`/api/admin/users/${userId}/notes`);
  }

  /** `POST /api/admin/users/{user_id}/notes` */
  adminCreateNote(userId: number, payload: AdminNotePayload) {
    return this.http.post<AdminNote>(`/api/admin/users/${userId}/notes`, { body: payload });
  }

  /** `GET /api/admin/users/{user_id}/identities` */
  adminListIdentities(userId: number) {
    return this.http.get<AdminIdentity[]>(`/api/admin/users/${userId}/identities`);
  }

  /** `POST /api/admin/users/{user_id}/identities` */
  adminCreateIdentity(userId: number, payload: AdminIdentityPayload) {
    return this.http.post<AdminIdentity>(`/api/admin/users/${userId}/identities`, {
      body: payload,
    });
  }

  /** `DELETE /api/admin/users/{user_id}/identities/{id}` */
  adminDeleteIdentity(userId: number, identityId: number) {
    return this.http.delete<void>(`/api/admin/users/${userId}/identities/${identityId}`);
  }

  /** `POST /api/admin/users/identities/bulk` */
  adminBulkIdentities(payload: AdminBulkIdentityPayload) {
    return this.http.post<AdminIdentity[]>("/api/admin/users/identities/bulk", { body: payload });
  }
}
