const getJSON = (str, fallback) => {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
};

// PUBLIC_INTERFACE
export function getEnv() {
  /** Reads environment variables safely and provides defaults. */
  const API_BASE_URL =
    process.env.REACT_APP_API_BASE ||
    process.env.REACT_APP_BACKEND_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '');

  const WS_URL = process.env.REACT_APP_WS_URL || '';
  const NODE_ENV = process.env.REACT_APP_NODE_ENV || process.env.NODE_ENV || 'development';
  const LOG_LEVEL = process.env.REACT_APP_LOG_LEVEL || 'info';
  const FRONTEND_URL = process.env.REACT_APP_FRONTEND_URL || (typeof window !== 'undefined' ? window.location.origin : '');

  const FEATURE_FLAGS = getJSON(process.env.REACT_APP_FEATURE_FLAGS || '{}', {});
  const defaults = {
    mockApi: false,
    maxUploadMB: 5
  };

  return {
    API_BASE_URL: API_BASE_URL || '',
    WS_URL,
    NODE_ENV,
    LOG_LEVEL,
    FRONTEND_URL,
    FEATURE_FLAGS: { ...defaults, ...FEATURE_FLAGS }
  };
}
