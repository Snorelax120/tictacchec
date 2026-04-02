export function normalizeName(name) {
  return typeof name === 'string' ? name.trim() : '';
}

export function createLobbyCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(6));

  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('');
}

export async function hashToken(token) {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', data);

  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function createSessionToken() {
  return `${crypto.randomUUID()}-${crypto.randomUUID()}`;
}

export function buildWebSocketUrl(request, code, sessionToken) {
  const url = new URL(request.url);
  url.pathname = `/ws/${code}`;
  url.search = new URLSearchParams({ session: sessionToken }).toString();
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';

  return url.toString();
}
