// 照片接口 + 站长解锁令牌
const TOKEN_KEY = 'zion-admin-token';

export function getToken() {
  try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; }
}
export function setToken(t) {
  try {
    if (t) sessionStorage.setItem(TOKEN_KEY, t);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch (e) {}
}

class UnauthorizedError extends Error {
  constructor() {
    super('unauthorized');
    this.unauthorized = true;
  }
}

async function apiFetch(url, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  const token = getToken();
  if (token) headers['X-Admin-Token'] = token;
  const res = await fetch(url, { ...opts, headers });
  if (res.status === 401) throw new UnauthorizedError();
  return res.json();
}

export const api = {
  list: () => fetch('/api/photos').then((r) => r.json()),

  create: (obj) =>
    apiFetch('/api/photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(obj)
    }),

  update: (id, obj) =>
    apiFetch('/api/photos/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(obj)
    }),

  remove: (id) => apiFetch('/api/photos/' + id, { method: 'DELETE' }),

  unlock: async (password) => {
    const res = await fetch('/api/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    const body = await res.json().catch(() => ({}));
    if (res.status === 200 && body.token) return body.token;
    return null;
  },

  session: async (token) => {
    const res = await fetch('/api/session', { headers: { 'X-Admin-Token': token } });
    return res.status === 200;
  }
};

export { UnauthorizedError };
