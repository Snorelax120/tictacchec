const ACTIVE_SESSION_KEY = 'tictacchec:active-online-session';

async function parseJsonResponse(response) {
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Something went wrong.');
  }

  return payload;
}

function createCurrentOriginWebSocketUrl(code, sessionToken) {
  const url = new URL(window.location.href);
  url.pathname = `/ws/${code}`;
  url.search = new URLSearchParams({ session: sessionToken }).toString();
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';

  return url.toString();
}

export async function createOnlineLobby({ playerName, colorChoice }) {
  const response = await fetch('/api/lobbies', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ playerName, colorChoice }),
  });

  return parseJsonResponse(response);
}

export async function joinOnlineLobby({ code, playerName }) {
  const response = await fetch(`/api/lobbies/${code}/join`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ playerName }),
  });

  return parseJsonResponse(response);
}

export function saveActiveOnlineSession(session) {
  localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
}

export function loadActiveOnlineSession() {
  const rawValue = localStorage.getItem(ACTIVE_SESSION_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
    return null;
  }
}

export function clearActiveOnlineSession() {
  localStorage.removeItem(ACTIVE_SESSION_KEY);
}

export function buildSocketUrl(session) {
  if (session.wsUrl) {
    return session.wsUrl;
  }

  return createCurrentOriginWebSocketUrl(session.code, session.sessionToken);
}
