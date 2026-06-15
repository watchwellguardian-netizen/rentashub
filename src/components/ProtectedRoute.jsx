import { Lock, ShieldAlert } from "lucide-react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";
import { canAccessRole, expandAllowedRoles, roleLabel } from "../lib/rbac.js";
import { APP_NAME } from "../lib/brand.js";
import { AUTH_MODES } from "../lib/adapters/authAdapter.js";
import Button from "./Button.jsx";

export default function ProtectedRoute({ allowedRoles = [] }) {
  const { user, isAuthenticated, isLoadingAuth, authMode, signInReviewUser } = useAuth();
  const location = useLocation();

  if (isLoadingAuth) {
    return <main className="center-screen">Loading {APP_NAME}...</main>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!canAccessRole(user?.role, allowedRoles)) {
    return (
      <main className="center-screen">
        <section className="access-panel">
          <ShieldAlert aria-hidden="true" />
          <h1>Access not available for this role</h1>
          <p>Your current role is {roleLabel(user?.role)}. This area is limited to {expandAllowedRoles(allowedRoles).map(roleLabel).join(", ")}.</p>
          {authMode === AUTH_MODES.LOCAL ? <Button onClick={() => signInReviewUser("customer")}>Review as customer</Button> : null}
        </section>
      </main>
    );
  }

  return <Outlet />;
}
