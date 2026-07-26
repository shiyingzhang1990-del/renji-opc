const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

let refreshPromise = null;

async function refreshToken() {
  const refresh = localStorage.getItem("refresh_token");
  if (!refresh) return null;
  try {
    const r = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!r.ok) { localStorage.removeItem("token"); localStorage.removeItem("refresh_token"); return null; }
    const data = await r.json();
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    return data.access_token;
  } catch { return null; }
}

export async function apiFetch(url, options = {}) {
  let token = localStorage.getItem("token") || "";
  const headers = { ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let r = await fetch(`${API_BASE}${url}`, { ...options, headers });

  if (r.status === 401 && token) {
    if (!refreshPromise) {
      refreshPromise = refreshToken().finally(() => { refreshPromise = null; });
    }
    const newToken = await refreshPromise;
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      r = await fetch(`${API_BASE}${url}`, { ...options, headers });
    }
  }
  return r;
}

export function saveTokens(access_token, refresh_token) {
  localStorage.setItem("token", access_token);
  localStorage.setItem("refresh_token", refresh_token);
  window.dispatchEvent(new Event("auth-change"));
}

export function clearTokens() {
  localStorage.removeItem("token");
  localStorage.removeItem("refresh_token");
  window.dispatchEvent(new Event("auth-change"));
}
