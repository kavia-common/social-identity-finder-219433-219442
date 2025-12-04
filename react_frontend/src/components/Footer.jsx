import { getApiBase } from '../api/client';

// PUBLIC_INTERFACE
export default function Footer() {
  /** Footer with support/contact placeholders and healthcheck link if configured */
  const apiBase = getApiBase();
  const healthPath = process.env.REACT_APP_HEALTHCHECK_PATH;
  const healthHref = healthPath ? `${apiBase}${healthPath}` : null;

  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-inner">
        <div>Need help? Contact support@example.com</div>
        <div className="row">
          {healthHref && (
            <a className="link" href={healthHref} target="_blank" rel="noreferrer">
              API Healthcheck
            </a>
          )}
          <a className="link" href="https://example.com/privacy" target="_blank" rel="noreferrer">
            Privacy
          </a>
          <a className="link" href="https://example.com/terms" target="_blank" rel="noreferrer">
            Terms
          </a>
        </div>
      </div>
    </footer>
  );
}
