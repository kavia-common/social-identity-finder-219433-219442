import React from 'react';

// PUBLIC_INTERFACE
export default function Header({ theme, onToggleTheme }) {
  /** App header with title and theme switch */
  return (
    <div className="card" style={{ border: 'none', boxShadow: 'none', background: 'transparent' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0' }}>
        <div>
          <h1 style={{ fontSize: 24 }}>
            <span
              aria-hidden="true"
              style={{
                display: 'inline-block',
                width: 8,
                height: 24,
                background: 'linear-gradient(180deg, rgba(37,99,235,0.9), rgba(245,158,11,0.9))',
                borderRadius: 8,
                marginRight: 10,
                verticalAlign: 'middle',
              }}
            />
            Social Identity Finder
          </h1>
          <p style={{ marginTop: 4, color: 'var(--color-muted)' }}>
            Upload a photo and we’ll search for matching social profiles across platforms.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          onClick={onToggleTheme}
        >
          {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
      </div>
    </div>
  );
}
