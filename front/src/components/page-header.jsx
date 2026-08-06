import { Link } from "react-router-dom";

export function PageTrail({ items = [] }) {
  if (!items.length) return null;
  return <nav className="page-hero-trail" aria-label="Ruta de navegación">{items.map((item, index) => <span key={`${item.label}-${index}`}>{index > 0 && <b aria-hidden="true">›</b>}{item.to && index < items.length - 1 ? <Link to={item.to}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}</span>)}</nav>;
}

export default function PageHeader({ eyebrow, trail = null, title, description, action = null, className = "" }) {
  return (
    <header className={`page-hero ${className}`.trim()}>
      <div className="page-heading-copy">
        {trail?.length ? <PageTrail items={trail} /> : eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </header>
  );
}
