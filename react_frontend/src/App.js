import React, { useCallback, useMemo, useRef, useState } from 'react';
import './App.css';
import Header from './components/Header';
import Footer from './components/Footer';
import UploadBox from './components/UploadBox';
import ResultsList from './components/ResultsList';
import { uploadImage, pollResults } from './api/client';
import { useApiBase } from './hooks/useApiBase';

// PUBLIC_INTERFACE
function App() {
  /** Main app managing state and wiring flow */
  const { apiBase } = useApiBase();
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle|uploading|success|error
  const [jobId, setJobId] = useState(null);
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const reset = useCallback(() => {
    setSelectedFile(null);
    setUploadStatus('idle');
    setJobId(null);
    setResults([]);
    setError(null);
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const onFileSelected = useCallback((file) => {
    setSelectedFile(file);
    setError(null);
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      setError('Please select an image file before uploading.');
      return;
    }
    if (!selectedFile.type.startsWith('image/')) {
      setError('Invalid file type. Please upload an image.');
      return;
    }
    setUploadStatus('uploading');
    setError(null);
    setResults([]);
    setJobId(null);

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
        const pollData = await pollResults(response.jobId, { signal: controller.signal });
        if (pollData && Array.isArray(pollData.matches)) {
          setResults(pollData.matches);
          setUploadStatus('success');
        } else {
          setUploadStatus('error');
          setError('Completed, but results format was unexpected.');
        }
      } else {
        setUploadStatus('error');
        setError('Unexpected response from server.');
      }
    } catch (e) {
      setUploadStatus('error');
      setError(e?.message || 'Upload failed.');
    } finally {
      abortRef.current = null;
    }
  }, [selectedFile]);

  const dismissError = useCallback(() => setError(null), []);

  const stateSummary = useMemo(
    () => ({ selectedFile, uploadStatus, jobId, results }),
    [selectedFile, uploadStatus, jobId, results]
  );

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
              isUploading={uploadStatus === 'uploading'}
            />
            {error && (
              <div className="alert" role="alert" aria-live="assertive">
                <span>⚠️ {error}</span>
                <button className="close" onClick={dismissError} aria-label="Dismiss error">×</button>
              </div>
            )}
            <ResultsList
              status={uploadStatus}
              results={results}
              summary={stateSummary}
            />
            {(uploadStatus === 'success' || uploadStatus === 'error') && (
              <div className="row" style={{ marginTop: 12 }}>
                <button className="btn btn-secondary" onClick={reset}>New Search</button>
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
