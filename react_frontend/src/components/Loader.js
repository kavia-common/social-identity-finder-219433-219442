import React from 'react';

// PUBLIC_INTERFACE
export default function Loader({ label = 'Loading...' }) {
  return (
    <div className="loader" role="status" aria-live="polite" aria-atomic="true">
      <div className="spinner" />
      <span>{label}</span>
    </div>
  );
}
