import { computeHealthcheckUrl } from '../api/client';

// PUBLIC_INTERFACE
export default function Footer() {
  /** Footer with support/contact placeholders and healthcheck link if configured */
  const healthHref = computeHealthcheckUrl();

  return (
    <footer className="footer" role="contentinfo">
      <div className="footer-inner">
        <div>Need help? Contact support@example.com</div>
        <div className="row">
          {healthHref && (
            <a className="link" href={healthHref} target="_blank" rel="noopener noreferrer">
              API Health
            </a>
          )}
          <a className="link" href="https://example.com/privacy" target="_blank" rel="noopener noreferrer">
            Privacy
          </a>
          <a className="link" href="https://example.com/terms" target="_blank" rel="noopener noreferrer">
            Terms
          </a>
        </div>
      </div>
    </footer>
  );
}
