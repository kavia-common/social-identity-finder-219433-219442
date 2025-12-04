/**
 * Helpers for environment-driven feature/config.
 * Supports CSV or JSON values for flags, used by API client for optional toggles (e.g., "livePolling").
 */

// PUBLIC_INTERFACE
export function parseCsvOrJson(value) {
  /** Accepts CSV string or JSON array/object string; returns parsed value or null */
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try { return JSON.parse(trimmed); } catch { return null; }
  }
  return trimmed.split(',').map(s => s.trim()).filter(Boolean);
}

// PUBLIC_INTERFACE
export function getFeatureFlags() {
  /** Returns feature flags array/object from REACT_APP_FEATURE_FLAGS */
  return parseCsvOrJson(process.env.REACT_APP_FEATURE_FLAGS);
}

// PUBLIC_INTERFACE
export function isExperimentsEnabled() {
  /** Returns boolean from REACT_APP_EXPERIMENTS_ENABLED */
  const v = process.env.REACT_APP_EXPERIMENTS_ENABLED;
  if (v == null) return false;
  const s = String(v).toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

// PUBLIC_INTERFACE
export function getLogLevel() {
  /** Returns REACT_APP_LOG_LEVEL or 'info' */
  return process.env.REACT_APP_LOG_LEVEL || 'info';
}
