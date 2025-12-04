const PLATFORM_MAP = {
  twitter: 'Twitter',
  x: 'X',
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  reddit: 'Reddit',
  github: 'GitHub',
  unknown: 'Unknown'
};

// PUBLIC_INTERFACE
export function platformLabel(p) {
  const key = String(p || 'unknown').toLowerCase();
  return PLATFORM_MAP[key] || (p || 'Unknown');
}

// PUBLIC_INTERFACE
export function confidencePct(value) {
  if (typeof value === 'number') {
    if (value <= 1) return Math.max(0, Math.min(100, Math.round(value * 100)));
    return Math.max(0, Math.min(100, Math.round(value)));
  }
  return 0;
}

// PUBLIC_INTERFACE
export function safeProfileUrl(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    const u = new URL(url);
    if (['http:', 'https:'].includes(u.protocol)) return url;
    return '';
  } catch {
    return '';
  }
}
