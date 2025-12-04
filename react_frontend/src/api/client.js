 /**
  * API client for uploading images and polling results.
  * Uses env-based API base URL resolution and Fetch API.
  * Adds robust error mapping and retry with exponential backoff.
  */

export const API_BASE =
  (process.env.REACT_APP_API_BASE ||
    process.env.REACT_APP_BACKEND_URL ||
    (typeof window !== 'undefined' ? window.__API_BASE__ : '') ||
    (typeof window !== 'undefined' ? window.location.origin : '') ||
    '')?.replace(/\/*$/, '') || '';

/**
 * Allow configurable endpoint paths with env overrides and sane defaults.
 * These are appended to API_BASE when constructing URLs.
 */
export const UPLOAD_PATH =
  (process.env.REACT_APP_UPLOAD_PATH || '/api/upload').replace(/^\/?/, '/');
export const RESULTS_PATH =
  (process.env.REACT_APP_RESULTS_PATH || '/api/results').replace(/^\/?/, '/');
export const HEALTHCHECK_PATH =
  (process.env.REACT_APP_HEALTHCHECK_PATH || '').replace(/^\/?/, '/');

/**
 * Retry tuning via env vars with sensible defaults.
 * REACT_APP_RETRY_MAX, REACT_APP_RETRY_BASE_DELAY_MS
 */
const RETRY_MAX =
  Number.isFinite(Number(process.env.REACT_APP_RETRY_MAX))
    ? Math.max(0, Number(process.env.REACT_APP_RETRY_MAX))
    : 5;
const RETRY_BASE_DELAY_MS =
  Number.isFinite(Number(process.env.REACT_APP_RETRY_BASE_DELAY_MS))
    ? Math.max(100, Number(process.env.REACT_APP_RETRY_BASE_DELAY_MS))
    : 500;

/**
 * Feature toggles.
 * If REACT_APP_FEATURE_FLAGS contains "livePolling", slightly adjust backoff.
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
  /**
   * Returns full healthcheck URL if HEALTHCHECK_PATH provided; else undefined.
   * Ensures single slash between base and path.
   */
  if (!process.env.REACT_APP_HEALTHCHECK_PATH) return undefined;
  return `${API_BASE}${HEALTHCHECK_PATH}`;
}

/**
 * Maps low-level fetch/network errors to structured error objects.
 * Returns { type, message, details }
 */
function mapFetchError(err, context = {}) {
  const isAbort = err?.name === 'AbortError';
  if (isAbort) {
    return { type: 'aborted', message: 'The request was canceled.', details: { cause: err?.message, ...context } };
  }

  // Mixed content: HTTPS page trying HTTP API, or blocked by browser
  const pageIsHttps = typeof window !== 'undefined' && window.location?.protocol === 'https:';
  const apiIsHttp = API_BASE.startsWith('http://');
  if (pageIsHttps && apiIsHttp) {
    return {
      type: 'mixed-content',
      message: 'Blocked mixed content: the app is served over HTTPS but the API is HTTP.',
      details: {
        recommendation: 'Serve your API over HTTPS or enable a secure proxy.',
        apiBase: API_BASE,
        ...context,
      },
    };
  }

  // CORS heuristics: fetch throws TypeError: Failed to fetch, or browser CORS message
  const msg = String(err?.message || '');
  if (msg.toLowerCase().includes('cors') || msg.toLowerCase().includes('failed to fetch') || err?.type === 'opaque') {
    return {
      type: 'cors',
      message: 'Network request blocked due to CORS or connectivity issue.',
      details: {
        recommendation: 'Ensure backend includes correct CORS headers or use a same-origin proxy.',
        error: msg,
        apiBase: API_BASE,
        ...context,
      },
    };
  }

  // Offline or DNS/network down
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      type: 'offline',
      message: 'You appear to be offline.',
      details: { recommendation: 'Check your internet connection and retry.', ...context },
    };
  }

  if (err?.status) {
    // HTTP error from server with status code
    return {
      type: 'http',
      message: `Request failed with status ${err.status}`,
      details: { status: err.status, data: err.data, ...context },
    };
  }

  // Generic fallback
  return {
    type: 'network',
    message: 'A network error occurred.',
    details: { error: msg || 'Unknown error', ...context },
  };
}

/**
 * Internal helper: fetch JSON with sensible defaults and error mapping.
 * Throws an Error but attaches .structured for UI consumption.
 */
async function fetchJson(url, options = {}) {
  try {
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
      err.structured = mapFetchError(err, { url });
      throw err;
    }
    return data;
  } catch (e) {
    // Map low-level fetch errors
    if (!e.structured) {
      e.structured = mapFetchError(e, { url });
    }
    throw e;
  }
}

/**
 * Retry helper with exponential backoff.
 * fn: () => Promise<T>
 * options: { maxRetries, baseDelay, factor, onRetry(attempt, error) }
 */
async function withRetry(fn, { maxRetries = RETRY_MAX, baseDelay = RETRY_BASE_DELAY_MS, factor = 1.8, onRetry } = {}) {
  let attempt = 0;
  let lastErr;
  while (attempt <= maxRetries) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      // do not retry on AbortError
      if (err?.name === 'AbortError') break;
      if (attempt === maxRetries) break;
      if (typeof onRetry === 'function') {
        try { onRetry(attempt + 1, err); } catch { /* ignore */ }
      }
      const delay = Math.min(baseDelay * Math.pow(factor, attempt), 8000);
      await new Promise(r => setTimeout(r, delay));
      attempt += 1;
    }
  }
  throw lastErr;
}

// PUBLIC_INTERFACE
export async function uploadImage(file) {
  /**
   * Uploads an image to the server with retry.
   * Returns either { matches: [...] } for immediate results
   * or { jobId } to indicate async processing with polling.
   * Sends multipart/form-data with field name 'image'.
   */
  const form = new FormData();
  form.append('image', file, file.name || 'upload.jpg');

  const url = `${API_BASE}${UPLOAD_PATH}`;
  return withRetry(
    () => fetchJson(url, { method: 'POST', body: form }),
    {
      onRetry: (_attempt, _err) => { /* hook for logging if desired */ },
    }
  );
}

// PUBLIC_INTERFACE
export async function pollResults(jobId, { signal, onTick } = {}) {
  /**
   * Poll results endpoint until status === 'completed' or error/timeout.
   * Includes backoff, respects AbortSignal, and retries transient failures.
   * Returns final data or throws structured error.
   */
  const start = Date.now();
  const timeoutMs = 60_000; // 60s total timeout
  let attempt = 0;

  const livePolling = hasFeatureFlag('livePolling');
  const baseDelay = livePolling ? Math.max(250, RETRY_BASE_DELAY_MS * 0.7) : RETRY_BASE_DELAY_MS;
  const factor = 1.35;

  while (true) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const url = `${API_BASE}${RESULTS_PATH}/${encodeURIComponent(jobId)}`;

    try {
      const data = await withRetry(
        () => fetchJson(url, { method: 'GET', signal }),
        { maxRetries: 1, baseDelay, factor } // a small internal retry for transient fetch errors
      );

      if (data?.status === 'completed') {
        return data;
      }
      if (data?.status === 'failed' || data?.error) {
        const err = new Error(data?.error || 'Job failed');
        err.data = data;
        err.structured = mapFetchError(err, { url, jobId });
        throw err;
      }
    } catch (e) {
      // surface structured error with a hint that auto-retry may continue
      if (!e.structured) {
        e.structured = mapFetchError(e, { url, jobId });
      }
      // let outer loop decide to continue unless fatal or timed out
      if (e?.name === 'AbortError') throw e;
      // continue to backoff and retry polling
    }

    // Check timeout
    if (Date.now() - start > timeoutMs) {
      const err = new Error('Polling timed out');
      err.code = 'ETIMEOUT';
      err.structured = { type: 'timeout', message: 'Polling timed out.', details: { jobId } };
      throw err;
    }

    // Backoff with a cap
    attempt += 1;
    const delay = Math.min(baseDelay * Math.pow(factor, attempt), 3000);
    await new Promise((r, rej) => {
      const id = setTimeout(() => {
        if (typeof onTick === 'function') { try { onTick({ attempt, delay }); } catch { /* ignore */ } }
        r();
      }, delay);
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

// PUBLIC_INTERFACE
export function mapErrorForUi(err) {
  /**
   * Returns structured error object { type, message, details } for UI.
   */
  if (err?.structured) return err.structured;
  return mapFetchError(err);
}
