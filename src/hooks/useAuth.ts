import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const PRESET_ACCOUNTS = [
  {
    email: "admin@weaveone.com",
    password: "Aug@2026",
    role: "admin",
    full_name: "WeaveOne Admin",
    phone: "+919876543210",
  },
  {
    email: "user@weaveone.com",
    password: "Aug@2026",
    role: "user",
    full_name: "WeaveOne Standard User",
    phone: "+919825012345",
  },
];

export const MOCK_ADMIN_USER: User = {
  id: "00000000-0000-0000-0000-000000000001",
  app_metadata: { provider: "email" },
  user_metadata: { full_name: "WeaveOne Admin", role: "admin" },
  aud: "authenticated",
  created_at: "2026-08-01T10:00:00Z",
  email: "admin@weaveone.com",
  role: "authenticated",
  updated_at: "2026-08-01T10:00:00Z",
};

export const MOCK_STANDARD_USER: User = {
  id: "00000000-0000-0000-0000-000000000002",
  app_metadata: { provider: "email" },
  user_metadata: { full_name: "WeaveOne Standard User", role: "user" },
  aud: "authenticated",
  created_at: "2026-08-02T11:00:00Z",
  email: "user@weaveone.com",
  role: "authenticated",
  updated_at: "2026-08-02T11:00:00Z",
};

export function getActiveAuthenticatedUser(): User | null {
  if (typeof window === "undefined") return null;
  const isAuthenticated = localStorage.getItem("weaveone_authenticated") === "true";
  if (!isAuthenticated) return null;

  const activeEmail = localStorage.getItem("weaveone_active_email");
  if (activeEmail === "user@weaveone.com") return MOCK_STANDARD_USER;
  return MOCK_ADMIN_USER;
}

export function setAuthenticatedUser(email: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("weaveone_active_email", email);
    localStorage.setItem("weaveone_authenticated", "true");
    window.dispatchEvent(new Event("storage"));
  }
}

export function signOutUser() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("weaveone_authenticated");
    localStorage.removeItem("weaveone_active_email");
    localStorage.removeItem("weaveone_demo_user");
    window.dispatchEvent(new Event("storage"));
  }
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const activeUser = getActiveAuthenticatedUser();
    if (activeUser) {
      setUser(activeUser);
      setSession({
        access_token: "authenticated-session-token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "authenticated-refresh-token",
        user: activeUser,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      });
      setLoading(false);
    } else {
      setUser(null);
      setSession(null);
      setLoading(false);
    }

    const handleStorage = () => {
      const updatedUser = getActiveAuthenticatedUser();
      if (updatedUser) {
        setUser(updatedUser);
        setSession({
          access_token: "authenticated-session-token",
          token_type: "bearer",
          expires_in: 3600,
          refresh_token: "authenticated-refresh-token",
          user: updatedUser,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        });
      } else {
        setUser(null);
        setSession(null);
      }
      setLoading(false);
    };

    window.addEventListener("storage", handleStorage);

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (localStorage.getItem("weaveone_authenticated") === "true") return;
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    if (!activeUser) {
      supabase.auth
        .getSession()
        .then(({ data }) => {
          if (localStorage.getItem("weaveone_authenticated") === "true") return;
          if (data.session?.user) {
            setSession(data.session);
            setUser(data.session.user);
          } else {
            setSession(null);
            setUser(null);
          }
          setLoading(false);
        })
        .catch(() => {
          setSession(null);
          setUser(null);
          setLoading(false);
        });
    }

    return () => {
      window.removeEventListener("storage", handleStorage);
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, user, loading };
}
