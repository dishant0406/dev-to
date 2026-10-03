import type { HttpClient } from "../http.js";
import type {
  Article,
  Billboard,
  BillboardPayload,
  Organization,
  OrganizationPayload,
  Page,
  PagePayload,
  Segment,
  SharedUser,
} from "../types.js";

export interface OrganizationArticlesParams {
  page?: number;
  perPage?: number;
}

export class OrganizationsResource {
  constructor(private readonly http: HttpClient) {}

  /** `GET /api/organizations` */
  list(params: { page?: number; perPage?: number } = {}) {
    return this.http.get<Organization[]>("/api/organizations", {
      query: { page: params.page, per_page: params.perPage },
    });
  }

  /** `GET /api/organizations/{username}` */
  get(username: string) {
    return this.http.get<Organization>(`/api/organizations/${encodeURIComponent(username)}`);
  }

  /** `GET /api/organizations/{id}` — by numeric id. */
  getById(id: number) {
    return this.http.get<Organization>(`/api/organizations/${id}`);
  }

  /** `GET /api/organizations/{organization_id_or_username}/users` — accepts either. */
  users(organizationIdOrUsername: number | string, params: OrganizationArticlesParams = {}) {
    return this.http.get<SharedUser[]>(
      `/api/organizations/${encodeURIComponent(String(organizationIdOrUsername))}/users`,
      { query: { page: params.page, per_page: params.perPage } },
    );
  }

  /** `GET /api/organizations/{organization_id_or_username}/articles` — accepts either. */
  articles(organizationIdOrUsername: number | string, params: OrganizationArticlesParams = {}) {
    return this.http.get<Article[]>(
      `/api/organizations/${encodeURIComponent(String(organizationIdOrUsername))}/articles`,
      { query: { page: params.page, per_page: params.perPage } },
    );
  }

  /** `POST /api/organizations` */
  create(payload: OrganizationPayload) {
    return this.http.post<Organization>("/api/organizations", { body: payload });
  }

  /** `PUT /api/organizations/{id}` */
  update(id: number, payload: OrganizationPayload) {
    return this.http.put<Organization>(`/api/organizations/${id}`, { body: payload });
  }

  /** `DELETE /api/organizations/{id}` */
  delete(id: number) {
    return this.http.delete<Organization>(`/api/organizations/${id}`);
  }
}

export class PagesResource {
  constructor(private readonly http: HttpClient) {}

  /** `GET /api/pages` */
  list() {
    return this.http.get<Page[]>("/api/pages");
  }

  /** `GET /api/pages/{id}` */
  get(id: number) {
    return this.http.get<Page>(`/api/pages/${id}`);
  }

  /** `POST /api/pages` */
  create(payload: PagePayload) {
    return this.http.post<Page>("/api/pages", { body: payload });
  }

  /** `PUT /api/pages/{id}` */
  update(id: number, payload: PagePayload) {
    return this.http.put<Page>(`/api/pages/${id}`, { body: payload });
  }

  /** `DELETE /api/pages/{id}` */
  delete(id: number) {
    return this.http.delete<Page>(`/api/pages/${id}`);
  }
}

export class SegmentsResource {
  constructor(private readonly http: HttpClient) {}

  /** `GET /api/segments` */
  list(params: { perPage?: number } = {}) {
    return this.http.get<Segment[]>("/api/segments", { query: { per_page: params.perPage } });
  }

  /** `GET /api/segments/{id}` */
  get(id: number) {
    return this.http.get<Segment>(`/api/segments/${id}`);
  }

  /** `POST /api/segments` — creates an empty segment. */
  create() {
    return this.http.post<Segment>("/api/segments");
  }

  /** `DELETE /api/segments/{id}` — fails with 409 if a billboard still uses it. */
  delete(id: number) {
    return this.http.delete<Segment>(`/api/segments/${id}`);
  }

  /** `GET /api/segments/{id}/users` */
  users(id: number, params: { perPage?: number } = {}) {
    return this.http.get<SharedUser[]>(`/api/segments/${id}/users`, {
      query: { per_page: params.perPage },
    });
  }

  /** `PUT /api/segments/{id}/add_users` */
  addUsers(id: number, userIds: number[]) {
    return this.http.put<Segment>(`/api/segments/${id}/add_users`, { body: { user_ids: userIds } });
  }

  /** `PUT /api/segments/{id}/remove_users` */
  removeUsers(id: number, userIds: number[]) {
    return this.http.put<Segment>(`/api/segments/${id}/remove_users`, {
      body: { user_ids: userIds },
    });
  }
}

export class BillboardsResource {
  constructor(private readonly http: HttpClient) {}

  /** `GET /api/billboards` */
  list() {
    return this.http.get<Billboard[]>("/api/billboards");
  }

  /** `GET /api/billboards/{id}` */
  get(id: number) {
    return this.http.get<Billboard>(`/api/billboards/${id}`);
  }

  /** `POST /api/billboards` — the payload is free-form; the API validates it. */
  create(payload: BillboardPayload) {
    return this.http.post<Billboard>("/api/billboards", { body: payload });
  }

  /** `PUT /api/billboards/{id}` */
  update(id: number, payload: BillboardPayload) {
    return this.http.put<Billboard>(`/api/billboards/${id}`, { body: payload });
  }

  /** `PUT /api/billboards/{id}/unpublish` — returns 204. */
  unpublish(id: number) {
    return this.http.put<void>(`/api/billboards/${id}/unpublish`);
  }
}
