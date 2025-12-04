import { useMemo } from 'react';
import { getApiBase, computeHealthcheckUrl } from '../api/client';

// PUBLIC_INTERFACE
export function useApiBase() {
  /**
   * Returns { apiBase, wsUrl, healthcheckUrl }
   * Using provided env vars and current origin as fallback.
   */
  return useMemo(() => {
    const apiBase = getApiBase();
    const customWs = process.env.REACT_APP_WS_URL;
    let wsUrl = customWs;
    if (!wsUrl && typeof window !== 'undefined') {
      const loc = window.location;
      const proto = loc.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${proto}//${loc.host}`;
    }
    const healthcheckUrl = computeHealthcheckUrl();
    return { apiBase, wsUrl, healthcheckUrl };
  }, []);
}
