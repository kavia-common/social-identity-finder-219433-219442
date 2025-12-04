import React from 'react';
import ResultCard from './ResultCard';

// PUBLIC_INTERFACE
export default function ResultsList({ results }) {
  if (!results || results.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-card">
          <h3>No matches yet</h3>
          <p>Try uploading a clearer image or different angle.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="results-grid">
      {results.map((r, idx) => (
        <ResultCard key={r.id || idx} result={r} />
      ))}
    </div>
  );
}
