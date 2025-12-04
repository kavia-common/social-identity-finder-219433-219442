import React from 'react';
import { platformLabel, confidencePct, safeProfileUrl } from '../utils/formatters';
import placeholder from '../assets/placeholder-avatar.svg';

// PUBLIC_INTERFACE
export default function ResultCard({ result }) {
  const {
    avatarUrl,
    displayName,
    username,
    platform,
    profileUrl,
    confidence,
    verified
  } = result || {};

  const pct = confidencePct(confidence);
  const url = safeProfileUrl(profileUrl);

  return (
    <article className="result-card card" aria-label={`Result ${displayName || username || ''}`}>
      <div className="result-header">
        <img className="result-avatar" src={avatarUrl || placeholder} alt="" />
        <div className="result-meta">
          <strong>{displayName || username || 'Unknown'}</strong>
          <small>@{username || 'unknown'} · <span className="platform-badge">{platformLabel(platform)}</span>
            {verified ? <span className="verified" title="Verified">✔</span> : null}
          </small>
        </div>
      </div>

      <div className="confidence">
        <small>Match confidence: {pct}%</small>
        <div className="conf-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="conf-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="result-actions">
        {url && (
          <a className="btn btn-secondary" href={url} target="_blank" rel="noopener noreferrer">
            Visit Profile
          </a>
        )}
      </div>
    </article>
  );
}
