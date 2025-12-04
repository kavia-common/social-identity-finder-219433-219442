import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import './index.css';
import Header from './components/Header';
import UploadCard from './components/UploadCard';
import ResultsList from './components/ResultsList';
import ErrorBanner from './components/ErrorBanner';
import Loader from './components/Loader';
import Footer from './components/Footer';
import { useUpload } from './hooks/useUpload';
import { getEnv } from './config/env';

// PUBLIC_INTERFACE
function App() {
  /** App-level theme toggle support (light default) */
  const [theme, setTheme] = useState('light');
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  const toggleTheme = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  const env = useMemo(() => getEnv(), []);
  const {
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
  } = useUpload();

  // aria-live region ref
  const liveRef = useRef(null);
  useEffect(() => {
    if (!liveRef.current) return;
    let msg = '';
    if (loading) msg = 'Processing image. Please wait.';
    else if (results && results.length > 0) msg = `Found ${results.length} potential profiles.`;
    else if (error) msg = 'An error occurred.';
    else msg = '';
    if (msg) {
      liveRef.current.textContent = msg;
    }
  }, [loading, results, error]);

  const baseUrlMissing = !env.API_BASE_URL;

  return (
    <div className="app-root">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="app-header">
        <Header theme={theme} onToggleTheme={toggleTheme} />
      </header>

      <main id="main" className="app-main">
        <div
          className="sr-live"
          aria-live="polite"
          aria-atomic="true"
          ref={liveRef}
        />
        {!baseUrlMissing ? (
          <>
            {error && (
              <ErrorBanner message={error} onDismiss={clearError} />
            )}

            <UploadCard
              selectedFile={selectedFile}
              previewUrl={previewUrl}
              onFileSelect={selectFile}
              onRemove={removeFile}
              onSubmit={submit}
              primaryLabel="Find Social Profiles"
              loading={loading}
              requestId={requestId}
            />

            {loading && (
              <div className="loader-row" aria-label="Loading search results">
                <Loader label="Analyzing image and searching profiles..." />
              </div>
            )}

            {results && results.length > 0 && !loading && (
              <section className="results-section" aria-label="Results">
                <ResultsList results={results} />
              </section>
            )}

            {!results && !loading && (
              <section className="empty-state">
                <div className="empty-card">
                  <h3>Upload an image to begin</h3>
                  <p>We’ll try to find matching social profiles for the person in your photo.</p>
                </div>
              </section>
            )}
          </>
        ) : (
          <section className="setup-hint" role="alert">
            <div className="hint-card">
              <h2>Configuration required</h2>
              <p>
                Please set REACT_APP_API_BASE or REACT_APP_BACKEND_URL in your environment to enable API access.
              </p>
              <p className="hint-details">
                Current origin default would be: <code>{window.location.origin}</code>
              </p>
            </div>
          </section>
        )}
      </main>

      <footer className="app-footer">
        <Footer />
      </footer>
    </div>
  );
}

export default App;
