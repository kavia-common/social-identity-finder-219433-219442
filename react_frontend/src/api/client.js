import { getEnv } from '../config/env';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// PUBLIC_INTERFACE
export async function findIdentities(file, { signal } = {}) {
  /** Calls POST /api/v1/identify with FormData 'image'.
   * Normalizes response to:
   *  { status: 'completed'|'processing'|'error', requestId?, results?, error? }
   */
  const env = getEnv();
  if (env.FEATURE_FLAGS.mockApi) {
    // Mock: 50% immediate, 50% processing
    await sleep(500);
    if (Math.random() > 0.5) {
      return { status: 'completed', results: mockResults() };
    }
    return { status: 'processing', requestId: 'mock-req-' + Math.random().toString(36).slice(2, 8) };
  }

  if (!env.API_BASE_URL) {
    return { status: 'error', error: 'API base URL is not configured.' };
  }

  const url = `${env.API_BASE_URL.replace(/\/+$/, '')}/api/v1/identify`;
  const form = new FormData();
  form.append('image', file);
  try {
    const res = await fetch(url, { method: 'POST', body: form, signal });
    if (res.status === 200) {
      const data = await res.json();
      return { status: 'completed', results: normalizeResults(data) };
    }
    if (res.status === 202) {
      const data = await res.json().catch(() => ({}));
      return { status: 'processing', requestId: data.requestId || data.id || data.request_id };
    }
    const txt = await res.text();
    return { status: 'error', error: `Unexpected response (${res.status}): ${txt}` };
  } catch (e) {
    if (e.name === 'AbortError') return { status: 'error', error: 'Request was cancelled' };
    return { status: 'error', error: e.message || 'Network error' };
  }
}

// PUBLIC_INTERFACE
export async function getResults(requestId, { signal } = {}) {
  /** Polling endpoint GET /api/v1/identify/{requestId} */
  const env = getEnv();
  if (env.FEATURE_FLAGS.mockApi) {
    await sleep(800);
    return { status: 'completed', results: mockResults() };
    // or simulate processing longer depending on randomization if needed
  }
  if (!env.API_BASE_URL) {
    return { status: 'error', error: 'API base URL is not configured.' };
  }
  const url = `${env.API_BASE_URL.replace(/\/+$/, '')}/api/v1/identify/${encodeURIComponent(requestId)}`;
  try {
    const res = await fetch(url, { method: 'GET', signal });
    if (res.status === 200) {
      const data = await res.json();
      return { status: 'completed', results: normalizeResults(data) };
    }
    if (res.status === 202) {
      return { status: 'processing' };
    }
    const txt = await res.text();
    return { status: 'error', error: `Unexpected response (${res.status}): ${txt}` };
  } catch (e) {
    if (e.name === 'AbortError') return { status: 'error', error: 'Request was cancelled' };
    return { status: 'error', error: e.message || 'Network error' };
  }
}

/** Optional WS connector - no deps, raw WebSocket if URL present. */
// PUBLIC_INTERFACE
export function connectWS(onMessage) {
  const { WS_URL } = getEnv();
  if (!WS_URL) return null;
  try {
    const ws = new WebSocket(WS_URL);
    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        onMessage && onMessage(data);
      } catch {
        // ignore
      }
    };
    return ws;
  } catch {
    return null;
  }
}

function normalizeResults(data) {
  // Accepts array or {results: []}
  const arr = Array.isArray(data) ? data : (Array.isArray(data.results) ? data.results : []);
  return arr.map((r, i) => ({
    id: r.id || r.profileId || i,
    avatarUrl: r.avatarUrl || r.photo || r.image_url,
    displayName: r.displayName || r.name || r.full_name,
    username: r.username || r.handle,
    platform: r.platform || r.site || 'unknown',
    profileUrl: r.profileUrl || r.url,
    confidence: typeof r.confidence === 'number' ? r.confidence : (typeof r.score === 'number' ? r.score : 0.5),
    verified: !!(r.verified || r.isVerified)
  }));
}

function mockResults() {
  return [
    {
      id: 'tw-1',
      avatarUrl: 'https://unavatar.io/twitter/kavianet',
      displayName: 'Kavia User',
      username: 'kavianet',
      platform: 'twitter',
      profileUrl: 'https://twitter.com/kavianet',
      confidence: 0.87,
      verified: true
    },
    {
      id: 'ig-2',
      avatarUrl: 'https://unavatar.io/instagram/instagram',
      displayName: 'Photo Lover',
      username: 'insta_user',
      platform: 'instagram',
      profileUrl: 'https://instagram.com/instagram',
      confidence: 0.61,
      verified: false
    }
  ];
}
