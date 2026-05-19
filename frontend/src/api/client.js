const BASE = (import.meta.env.VITE_API_BASE_URL || '') + '/api';

const getToken = () => localStorage.getItem('token') || '';

async function request(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (!opts.isMultipart) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, { ...opts, headers });
  let data = null;
  try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok) {
    const err = new Error((data && data.message) || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  get:  (p)        => request(p),
  post: (p, body)  => request(p, { method: 'POST', body: JSON.stringify(body || {}) }),
  put:  (p, body)  => request(p, { method: 'PUT',  body: JSON.stringify(body || {}) }),
  del:  (p)        => request(p, { method: 'DELETE' }),
  upload: (p, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return request(p, { method: 'POST', body: fd, isMultipart: true });
  },
};
