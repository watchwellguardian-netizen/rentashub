import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "../state/AuthContext.jsx";
import Button from "../components/Button.jsx";
import { APP_NAME, APP_TAGLINE, brandTitle } from "../lib/brand.js";
import { API_AUTH_MIGRATION_NOTICE, AUTH_MODES, SUPABASE_AUTH_MIGRATION_NOTICE } from "../lib/adapters/authAdapter.js";
import BrandLogo from "../components/BrandLogo.jsx";

export default function Login() {
  const { authMode, isAuthenticated, signInReviewUser, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const target = location.state?.from || "/dashboard";
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "customer" });
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = brandTitle("Login");
  }, []);

  useEffect(() => {
    if (isAuthenticated) navigate(target, { replace: true });
  }, [isAuthenticated, navigate, target]);

  const signIn = async (role) => {
    await signInReviewUser(role);
    navigate(target, { replace: true });
  };

  const submitApiAuth = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const payload = mode === "register"
        ? { name: form.name, email: form.email, password: form.password, role: form.role }
        : { email: form.email, password: form.password };
      await (mode === "register" ? register(payload) : login(payload));
      navigate(target, { replace: true });
    } catch (err) {
      setError(err.message || "Authentication failed. Please check your details and try again.");
    }
  };

  return (
    <main className="login-screen">
      <section className="login-panel">
        <BrandLogo />
        <h1>{APP_TAGLINE}</h1>
        <p>Rent, list, buy, sell, trade, auction, broker, and manage assets from one clean marketplace.</p>
        {authMode === AUTH_MODES.LOCAL ? (
          <p className="notice-text">Local demo sign-in is active for review. Backend authentication is prepared separately and is not enabled for this login screen yet.</p>
        ) : authMode === AUTH_MODES.SUPABASE ? (
          <p className="notice-text">{SUPABASE_AUTH_MIGRATION_NOTICE} Demo users are hidden in Supabase mode.</p>
        ) : (
          <p className="notice-text">{API_AUTH_MIGRATION_NOTICE} Use backend test accounts or register a development account through the API auth flow.</p>
        )}
        {authMode === AUTH_MODES.LOCAL ? (
          <div className="login-actions">
            <Button onClick={() => signIn("customer")}>
              <ShieldCheck size={18} aria-hidden="true" />
              Review as customer
            </Button>
            <Button variant="secondary" onClick={() => signIn("supplier")}>Review as supplier</Button>
            <Button variant="secondary" onClick={() => signIn("broker")}>Review as broker</Button>
            <Button variant="secondary" onClick={() => signIn("admin")}>Review as admin</Button>
          </div>
        ) : authMode === AUTH_MODES.SUPABASE ? (
          <form className="asset-form" onSubmit={submitApiAuth}>
            {error ? <p className="field-error">{error}</p> : null}
            <label>
              Email
              <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} autoComplete="email" />
            </label>
            <label>
              Password
              <input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} autoComplete="current-password" />
            </label>
            <Button type="submit">Check Supabase auth readiness</Button>
          </form>
        ) : (
          <form className="asset-form" onSubmit={submitApiAuth}>
            {error ? <p className="field-error">{error}</p> : null}
            <div className="tabs compact-tabs" role="tablist" aria-label="Authentication mode">
              <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>Login</button>
              <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>Register</button>
            </div>
            {mode === "register" ? (
              <label>
                Name
                <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} autoComplete="name" />
              </label>
            ) : null}
            <label>
              Email
              <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} autoComplete="email" />
            </label>
            <label>
              Password
              <input type="password" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} autoComplete={mode === "register" ? "new-password" : "current-password"} />
            </label>
            {mode === "register" ? (
              <label>
                Role
                <select value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}>
                  <option value="customer">Customer</option>
                  <option value="supplier">Supplier</option>
                  <option value="broker">Broker</option>
                </select>
              </label>
            ) : null}
            <Button type="submit">{mode === "register" ? "Create account" : "Login"}</Button>
          </form>
        )}
      </section>
    </main>
  );
}
