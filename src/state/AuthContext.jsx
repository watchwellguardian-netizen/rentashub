import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authAdapter, getConfiguredAuthMode } from "../lib/adapters/authAdapter.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const authMode = getConfiguredAuthMode();

  useEffect(() => {
    let active = true;
    async function loadUser() {
      setIsLoadingAuth(true);
      try {
        const cached = await Promise.resolve(authAdapter.getCurrentUser(window.localStorage, authMode));
        if (active) setUser(cached);
        if (authMode === "api") {
          const current = await authAdapter.me(window.localStorage, authMode);
          if (active) setUser(current);
        }
      } catch {
        authAdapter.logout(window.localStorage, authMode);
        if (active) setUser(null);
      } finally {
        if (active) setIsLoadingAuth(false);
      }
    }
    loadUser();
    return () => {
      active = false;
    };
  }, [authMode]);

  const value = useMemo(() => ({
    user,
    authMode,
    isLoadingAuth,
    isAuthenticated: Boolean(user),
    async signInReviewUser(role = "customer") {
      const nextUser = authAdapter.signInReviewUser(window.localStorage, role, authMode);
      setUser(nextUser);
      return nextUser;
    },
    async login(credentials) {
      const result = await authAdapter.login(window.localStorage, credentials, authMode);
      setUser(result.user);
      return result;
    },
    async register(input) {
      const result = await authAdapter.register(window.localStorage, input, authMode);
      setUser(result.user);
      return result;
    },
    async refresh() {
      const result = await authAdapter.refresh(window.localStorage, authMode);
      setUser(result.user);
      return result;
    },
    async logout() {
      await authAdapter.logout(window.localStorage, authMode);
      setUser(null);
    },
  }), [authMode, isLoadingAuth, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
