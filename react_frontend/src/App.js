import React, { useCallback, useMemo, useRef, useState } from 'react';
import './App.css';
import Header from './components/Header';
import Footer from './components/Footer';
import UploadBox from './components/UploadBox';
import ResultsList from './components/ResultsList';
import { uploadImage, pollResults, mapErrorForUi } from './api/client';
import { useApiBase } from './hooks/useApiBase';

// PUBLIC_INTERFACE
function App() {
  /** Main app managing state and wiring flow, with clearer errors and retry UI */
  const { apiBase } = useApiBase();
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle|uploading|success|error
  const [jobId, setJobId] = useState(null);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null); // structured: { type, message, details }
  const [retrying, setRetrying] = useState(false);
  const [lastAction, setLastAction] = useState(null); // 'upload' | 'poll'
  const [pollNotice, setPollNotice] = useState(null); // transient banner when auto-retrying
  const [showDetails, setShowDetails] = useState(false);
  const abortRef = useRef(null);

  const reset = useCallback(() => {
    setSelectedFile(null);
    setUploadStatus('idle');
    setJobId(null);
    setResults([]);
    setError(null);
    setRetrying(false);
    setPollNotice(null);
    setLastAction(null);
    setShowDetails(false);
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const onFileSelected = useCallback((file) => {
    setSelectedFile(file);
    setError(null);
    setShowDetails(false);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      setError({ type: 'validation', message: 'Please select an image file before uploading.' });
      return;
    }
    if (!selectedFile.type || !selectedFile.type.startsWith('image/')) {
      setError({ type: 'validation', message: 'Invalid file type. Please upload an image.' });
      return;
    }
    setUploadStatus('uploading');
    setError(null);
    setShowDetails(false);
    setResults([]);
    setJobId(null);
    setLastAction('upload');

    try {
      const response = await uploadImage(selectedFile);
      if (response && Array.isArray(response.matches)) {
        setResults(response.matches);
        setUploadStatus('success');
      } else if (response && response.jobId) {
        setJobId(response.jobId);
        // Begin polling
        const controller = new AbortController();
        abortRef.current = controller;
        setLastAction('poll');
        setPollNotice(null);
        const pollData = await pollResults(response.jobId, {
          signal: controller.signal,
          onTick: ({ attempt }) => {
            if (attempt > 0) {
              setPollNotice({ type: 'info', message: 'Fetching results… retrying automatically.' });
            }
          },
        });
        if (pollData && Array.isArray(pollData.matches)) {
          setResults(pollData.matches);
          setUploadStatus('success');
          setPollNotice(null);
        } else {
          setUploadStatus('error');
          setError({ type: 'format', message: 'Completed, but results format was unexpected.' });
        }
      } else {
        setUploadStatus('error');
        setError({ type: 'format', message: 'Unexpected response from server.' });
      }
    } catch (e) {
      setUploadStatus('error');
      setError(mapErrorForUi(e));
    } finally {
      abortRef.current = null;
    }
  }, [selectedFile]);

  const retryLast = useCallback(async () => {
    if (!lastAction) return;
    setRetrying(true);
    setShowDetails(false);
    try {
      if (lastAction === 'upload') {
        await handleUpload();
      } else if (lastAction === 'poll' && jobId) {
        const controller = new AbortController();
        abortRef.current = controller;
        const pollData = await pollResults(jobId, {
          signal: controller.signal,
          onTick: ({ attempt }) => {
            if (attempt > 0) {
              setPollNotice({ type: 'info', message: 'Fetching results… retrying automatically.' });
            }
          },
        });
        if (pollData && Array.isArray(pollData.matches)) {
          setResults(pollData.matches);
          setUploadStatus('success');
          setError(null);
          setPollNotice(null);
        }
      }
    } catch (e) {
      setError(mapErrorForUi(e));
    } finally {
      setRetrying(false);
      abortRef.current = null;
    }
  }, [lastAction, jobId, handleUpload]);

  const dismissError = useCallback(() => {
    setError(null);
    setShowDetails(false);
  }, []);

  const stateSummary = useMemo(
    () => ({ selectedFile, uploadStatus, jobId, results }),
    [selectedFile, uploadStatus, jobId, results]
  );

  const advice = useMemo(() => {
    if (!error) return null;
    switch (error.type) {
      case 'cors':
        return 'Verify your backend CORS settings or use a same-origin proxy.';
      case 'mixed-content':
        return 'Switch your API to HTTPS or proxy through the frontend origin.';
      case 'offline':
        return 'Check your internet connection and try again.';
      case 'http':
        return 'Server returned an error. Check server logs or configuration.';
      case 'timeout':
        return 'The operation took too long. Try again or check server load.';
      default:
        return 'Please try again. If the issue persists, check your configuration.';
    }
  }, [error]);

  return (
    <div className="app">
      <Header title="Social Identity Finder" />
      <main className="container">
        <section className="panel">
          <div className="panel-body">
            <UploadBox
              onFileSelected={onFileSelected}
              onUpload={handleUpload}
              selectedFile={selectedFile}
              isUploading={uploadStatus === 'uploading' || retrying}
              retrying={retrying}
            />
            {error && (
              <div className={`alert ${error.type === 'cors' || error.type === 'mixed-content' ? 'warn' : ''}`} role="alert" aria-live="assertive" style={{ marginTop: 12 }}>
                <div style={{ display: 'grid', gap: 4 }}>
                  <span>⚠️ {error.message}</span>
                  {advice && <small style={{ color: 'var(--color-muted)' }}>Tip: {advice}</small>}
                  <details className="details" open={showDetails} onToggle={(e) => setShowDetails(e.target.open)}>
                    <summary>Details</summary>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
{JSON.stringify(error.details || {}, null, 2)}
                    </pre>
                  </details>
                  <div className="row">
                    <button className="btn" onClick={retryLast} disabled={retrying}>
                      {retrying ? 'Retrying…' : 'Retry'}
                    </button>
                    <button className="btn btn-secondary" onClick={dismissError}>Dismiss</button>
                  </div>
                </div>
                <button className="close" onClick={dismissError} aria-label="Dismiss error">×</button>
              </div>
            )}
            <ResultsList
              status={uploadStatus}
              results={results}
              summary={stateSummary}
              pollNotice={pollNotice}
              onManualRetry={retryLast}
              isRetrying={retrying}
            />
            {(uploadStatus === 'success' || uploadStatus === 'error') && (
              <div className="row" style={{ marginTop: 12 }}>
                <button className="btn btn-secondary" onClick={reset} disabled={retrying}>New Search</button>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

export default App;
