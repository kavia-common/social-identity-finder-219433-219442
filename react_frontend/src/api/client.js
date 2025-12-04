/**
 * API client for uploading images and polling results.
 * Uses env-based API base URL resolution and Fetch API.
 */

const UPLOAD_PATH = '/api/upload';
const RESULTS_PATH_PREFIX = '/api/results/';

// PUBLIC_INTERFACE
export function getApiBase() {
  /** Resolve base URL from env or window location */
  const envBase =
    process.env.REACT_APP_API_BASE ||
    process.env.REACT_APP_BACKEND_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '');
  return envBase?.replace(/\/+$/, '') || '';
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
   */
  const base = getApiBase();
  const form = new FormData();
  form.append('file', file, file.name || 'upload.jpg');

  const url = `${base}${UPLOAD_PATH}`;
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
   * Includes exponential backoff and respects AbortSignal.
   */
  const base = getApiBase();
  const start = Date.now();
  const timeoutMs = 60_000; // 60s total timeout
  let attempt = 0;

  while (true) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const url = `${base}${RESULTS_PATH_PREFIX}${encodeURIComponent(jobId)}`;
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

    // Backoff with a cap
    attempt += 1;
    const delay = Math.min(500 * Math.pow(1.4, attempt), 3000);
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
