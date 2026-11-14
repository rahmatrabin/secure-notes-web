const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000').replace(/\/+$/, '');

export class RequestError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export type User = {
  _id: string; name: string; email: string; role: 'user' | 'admin'; active: boolean; interests: string[];
};
export type Session = { token: string; user: User };
export type Note = { _id: string; ownerId: string; title: string; body: string; updatedAt: string };
export type Post = { _id: string; title: string; body: string };
export type Group = { interest: string; users: Pick<User, '_id' | 'name'>[] };
export type Page<T> = { items: T[]; nextCursor: string | null };
export type PostsPage = Page<Post> & { author: Pick<User, '_id' | 'name'> };

export async function request<T>(path: string, options: {
  token?: string; method?: string; body?: object; signal?: AbortSignal;
} = {}): Promise<T> {
  const headers = new Headers({ Accept: 'application/json' });
  if (options.token) headers.set('Authorization', 'Bearer ' + options.token);
  if (options.body) headers.set('Content-Type', 'application/json');
  const response = await fetch(baseUrl + path, {
    headers, method: options.method, body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal, credentials: 'omit', cache: 'no-store'
  });
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    const issue = data?.issues?.[0];
    const message = issue ? [issue.field, issue.message].filter(Boolean).join(': ') : data?.message;
    throw new RequestError(response.status, message ??
      (response.status >= 500 || response.ok ? 'API unavailable. If it is starting up, try again shortly.' : 'Request failed.'));
  }
  return data as T;
}

export function errorMessage(error: unknown) {
  if (error instanceof RequestError) return error.message;
  return 'Could not reach the API. Check your connection and try again.';
}

export function pageUrl(path: string, cursor: string | null) {
  const query = new URLSearchParams({ limit: '10' });
  if (cursor) query.set('cursor', cursor);
  return path + '?' + query.toString();
}
