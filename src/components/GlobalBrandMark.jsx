import { Link, useLocation } from "react-router-dom";
import { APP_NAME } from "../lib/brand.js";
import BrandLogo from "./BrandLogo.jsx";

const shellRoutePrefixes = [
  "/dashboard",
  "/supplier",
  "/dealer",
  "/landing",
  "/messages",
  "/booking",
  "/notifications",
  "/reviews",
  "/customer-dashboard",
  "/bookings",
  "/payments",
  "/wallet",
  "/inspection",
  "/transaction",
  "/trade-request",
  "/trust/customer",
  "/claims",
  "/claim",
  "/disputes",
  "/dispute",
  "/brokerage/leads",
  "/supplier-dashboard",
  "/list-asset",
  "/my-listings",
  "/rental-requests",
  "/earnings",
  "/payouts",
  "/supplier-profile",
  "/verification",
  "/admin",
  "/ai-help",
  "/supplier-info",
];

export default function GlobalBrandMark() {
  const { pathname } = useLocation();
  const shellRoute = shellRoutePrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  const protectedAssetRoute = /^\/assets?\/[^/]+\/(book|edit|reviews\/write)/.test(pathname);
  if (shellRoute || protectedAssetRoute) return null;

  return (
    <Link className="global-brand-mark" to="/" aria-label={`${APP_NAME} home`}>
      <BrandLogo compact />
    </Link>
  );
}
