import Spinner from './Spinner';

function platformIcon(platform) {
  const p = (platform || '').toLowerCase();
  if (p.includes('twitter') || p.includes('x')) return '𝕏';
  if (p.includes('instagram')) return '📸';
  if (p.includes('facebook')) return '📘';
  if (p.includes('linkedin')) return 'in';
  if (p.includes('tiktok')) return '🎵';
  return '🔎';
}

// PUBLIC_INTERFACE
export default function ResultsList({ status, results, summary, pollNotice, onManualRetry, isRetrying }) {
  /**
   * Shows different states: idle, loading, success, error.
   * For success, renders list of matched accounts with platform, handle, score, and link.
   * Displays a non-blocking banner if polling temporarily fails and auto-retry is ongoing.
   */
  if (status === 'idle') {
    return (
      <div className="alert info" role="status" aria-live="polite" style={{ marginTop: 12 }}>
        Drop a photo and click Upload to find social accounts.
      </div>
    );
  }

  if (status === 'uploading') {
    return (
      <div className="row" style={{ marginTop: 12 }}>
        <Spinner />
        <div>Processing...</div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="alert" role="alert" aria-live="assertive" style={{ marginTop: 12 }}>
        There was an error. Please try again.
      </div>
    );
  }

  if (status === 'success' && (!results || results.length === 0)) {
    return (
      <div className="alert info" role="status" aria-live="polite" style={{ marginTop: 12 }}>
        No matches found for this image.
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div>
        {pollNotice && (
          <div className="alert info" role="status" aria-live="polite" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span>ℹ️ {pollNotice.message}</span>
              {onManualRetry && (
                <button className="btn btn-secondary" onClick={onManualRetry} disabled={isRetrying}>
                  {isRetrying ? 'Retrying…' : 'Retry now'}
                </button>
              )}
            </div>
          </div>
        )}
        <div className="results" aria-live="polite">
          {results.map((item, idx) => {
            const platform = item.platform || item.site || 'Unknown';
            const handle = item.username || item.handle || item.name || 'Unknown';
            const scoreRaw = item.confidence ?? item.score ?? 0;
            const scorePct = Math.round(Math.max(0, Math.min(100, (scoreRaw > 1 ? scoreRaw : scoreRaw * 100))));
            const url = item.url || item.link || '#';
            return (
              <div className="result-card" key={`${platform}-${handle}-${idx}`}>
                <div className="result-main">
                  <div className="platform" aria-hidden="true">{platformIcon(platform)}</div>
                  <div>
                    <div style={{ fontWeight: 700 }}>{handle}</div>
                    <div style={{ color: 'var(--color-muted)', fontSize: 12 }}>{platform}</div>
                  </div>
                </div>
                <div className="result-meta">
                  <div className="score" aria-label={`Confidence ${scorePct}%`}>{scorePct}%</div>
                  <a className="link" href={url} target="_blank" rel="noreferrer" aria-label={`Open ${handle} on ${platform}`}>
                    Open
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}
