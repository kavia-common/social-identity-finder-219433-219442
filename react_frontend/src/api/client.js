/**
 * API client for uploading images and polling results.
 * Uses env-based API base URL resolution and Fetch API.
 */

export const API_BASE =
  (process.env.REACT_APP_API_BASE ||
    process.env.REACT_APP_BACKEND_URL ||
    (typeof window !== 'undefined' ? window.__API_BASE__ : '') ||
    (typeof window !== 'undefined' ? window.location.origin : '') ||
    '')?.replace(/\/+$/, '') || '';

export const UPLOAD_PATH =
  process.env.REACT_APP_UPLOAD_PATH || '/api/upload';
export const RESULTS_PATH =
  process.env.REACT_APP_RESULTS_PATH || '/api/results';
export const HEALTHCHECK_PATH =
  process.env.REACT_APP_HEALTHCHECK_PATH || '';

/**
 * Feature toggles (no new behavior mandated; adding minimal toggle wiring).
 * If REACT_APP_FEATURE_FLAGS contains "livePolling", use it to slightly adjust backoff.
 */
function hasFeatureFlag(flag) {
  const v = process.env.REACT_APP_FEATURE_FLAGS;
  if (!v) return false;
  const s = String(v).trim();
  try {
    const parsed = (s.startsWith('[') || s.startsWith('{')) ? JSON.parse(s) : null;
    if (Array.isArray(parsed)) {
      return parsed.map(x => String(x).toLowerCase()).includes(String(flag).toLowerCase());
    }
    if (parsed && typeof parsed === 'object') {
      return Boolean(parsed[flag]);
    }
  } catch { /* ignore */ }
  // CSV fallback
  return s.split(',').map(x => x.trim().toLowerCase()).includes(String(flag).toLowerCase());
}

// PUBLIC_INTERFACE
export function getApiBase() {
  /** Resolve base URL from env or window location */
  return API_BASE;
}

// PUBLIC_INTERFACE
export function computeHealthcheckUrl() {
  /** Returns healthcheck URL if HEALTHCHECK_PATH provided, else undefined */
  if (!HEALTHCHECK_PATH) return undefined;
  return `${API_BASE}${HEALTHCHECK_PATH}`;
}

/**
 * Internal helper: fetch JSON with sensible defaults.
 */
async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const msg = data?.message || data?.error || res.statusText || 'Request failed';
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// PUBLIC_INTERFACE
export async function uploadImage(file) {
  /**
   * Uploads an image to the server.
   * Returns either { matches: [...] } for immediate results
   * or { jobId } to indicate async processing with polling.
   * Sends multipart/form-data with field name 'image'.
   */
  const form = new FormData();
  // requirement: field name 'image'
  form.append('image', file, file.name || 'upload.jpg');

  const url = `${API_BASE}${UPLOAD_PATH}`;
  const res = await fetchJson(url, {
    method: 'POST',
    body: form,
  });
  return res;
}

// PUBLIC_INTERFACE
export async function pollResults(jobId, { signal } = {}) {
  /**
   * Poll results endpoint until status === 'completed' or error/timeout.
   * Includes simple backoff and respects AbortSignal.
   */
  const start = Date.now();
  const timeoutMs = 60_000; // 60s total timeout
  let attempt = 0;

  while (true) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const url = `${API_BASE}${RESULTS_PATH}/${encodeURIComponent(jobId)}`;
    const data = await fetchJson(url, { method: 'GET', signal });

    if (data?.status === 'completed') {
      return data;
    }
    if (data?.status === 'failed' || data?.error) {
      const err = new Error(data?.error || 'Job failed');
      err.data = data;
      throw err;
    }

    // Check timeout
    if (Date.now() - start > timeoutMs) {
      const err = new Error('Polling timed out');
      err.code = 'ETIMEOUT';
      throw err;
    }

    // Backoff with a cap; slightly faster if livePolling feature enabled
    const livePolling = hasFeatureFlag('livePolling');
    attempt += 1;
    const baseDelay = livePolling ? 350 : 500;
    const delay = Math.min(baseDelay * Math.pow(1.35, attempt), 3000);
    await new Promise((r, rej) => {
      const id = setTimeout(r, delay);
      if (signal) {
        const onAbort = () => {
          clearTimeout(id);
          signal.removeEventListener('abort', onAbort);
          rej(new DOMException('Aborted', 'AbortError'));
        };
        signal.addEventListener('abort', onAbort);
      }
    });
  }
}
