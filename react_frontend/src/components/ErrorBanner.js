import React from 'react';

// PUBLIC_INTERFACE
export default function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="error-banner" role="alert" aria-live="assertive">
      <div>⚠ {message}</div>
      <button type="button" className="btn btn-secondary" onClick={onDismiss} aria-label="Dismiss error">
        Dismiss
      </button>
    </div>
  );
}
