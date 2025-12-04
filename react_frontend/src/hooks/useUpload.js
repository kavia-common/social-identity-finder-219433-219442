import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { validateImageFile } from '../utils/validators';
import { findIdentities, getResults, connectWS } from '../api/client';
import { getEnv } from '../config/env';

// PUBLIC_INTERFACE
export function useUpload() {
  /** Encapsulates file selection, validation, submit, and fetching results */
  const env = useMemo(() => getEnv(), []);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [requestId, setRequestId] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const abortRef = useRef(null);
  const wsRef = useRef(null);
  const pollTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
      if (wsRef.current) wsRef.current.close();
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const clearError = useCallback(() => setError(''), []);
  const removeFile = useCallback(() => {
    setSelectedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
  }, [previewUrl]);

  const selectFile = useCallback((file) => {
    const { ok, message } = validateImageFile(file, env?.FEATURE_FLAGS?.maxUploadMB);
    if (!ok) {
      setError(message);
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setSelectedFile(file);
    setPreviewUrl(url);
    setError('');
  }, [previewUrl, env]);

  const startPolling = useCallback((rid) => {
    const started = Date.now();
    const poll = async () => {
      if (Date.now() - started > 60000) { // ~60s timeout
        setLoading(false);
        setError('Timed out while processing. Please try again later.');
        return;
      }
      const res = await getResults(rid, { signal: abortRef.current?.signal });
      if (res.status === 'completed') {
        setResults(res.results || []);
        setLoading(false);
      } else if (res.status === 'processing') {
        pollTimerRef.current = setTimeout(poll, 2500);
      } else {
        setError(res.error || 'Unknown error');
        setLoading(false);
      }
    };
    pollTimerRef.current = setTimeout(poll, 2500);
  }, []);

  const submit = useCallback(async () => {
    if (!selectedFile) {
      setError('Please select an image to continue.');
      return;
    }
    setLoading(true);
    setError('');
    setResults(null);
    setRequestId(null);

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    const res = await findIdentities(selectedFile, { signal: abortRef.current.signal });
    if (res.status === 'completed') {
      setResults(res.results || []);
      setLoading(false);
    } else if (res.status === 'processing') {
      const rid = res.requestId;
      setRequestId(rid || null);

      // Try WS if available
      if (env.WS_URL && !env.FEATURE_FLAGS.mockApi) {
        wsRef.current = connectWS((msg) => {
          if (msg && (msg.requestId === rid || msg.id === rid) && msg.type === 'complete') {
            setResults(msg.results || []);
            setLoading(false);
            if (wsRef.current) wsRef.current.close();
          }
        });
      }
      startPolling(rid);
    } else {
      setError(res.error || 'Something went wrong.');
      setLoading(false);
    }
  }, [selectedFile, env, startPolling]);

  return {
    selectedFile,
    previewUrl,
    loading,
    error,
    results,
    requestId,
    selectFile,
    removeFile,
    submit,
    clearError
  };
}
