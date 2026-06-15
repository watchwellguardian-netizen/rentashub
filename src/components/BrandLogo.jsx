import { APP_NAME, APP_TAGLINE } from "../lib/brand.js";

export function BrandIcon({ label = `${APP_NAME} app icon` }) {
  return (
    <span className="brand-icon" aria-label={label}>
      R
    </span>
  );
}

export default function BrandLogo({ compact = false }) {
  if (compact) return <BrandIcon />;

  return (
    <div className="brand-logo" aria-label={`${APP_NAME} ${APP_TAGLINE}`}>
      <BrandIcon label="" />
      <div className="brand-logo-text">
        <strong>{APP_NAME}</strong>
        <span>{APP_TAGLINE}</span>
      </div>
    </div>
  );
}
