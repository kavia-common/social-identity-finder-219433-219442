/* Header component with app title */

// PUBLIC_INTERFACE
export default function Header({ title = 'Social Identity Finder' }) {
  /** Top bar with app title and a placeholder for theme toggle */
  return (
    <header className="header" role="banner">
      <div className="header-inner">
        <div className="brand" aria-label={title}>
          <div className="brand-badge" aria-hidden="true" />
          <div className="brand-title">{title}</div>
        </div>
        <div className="header-actions" aria-hidden="true">
          {/* Placeholder: Theme toggle or settings can go here */}
        </div>
      </div>
    </header>
  );
}
