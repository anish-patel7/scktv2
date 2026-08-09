import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const MOCK_DEMO_USER: User = {
  id: "00000000-0000-0000-0000-000000000001",
  app_metadata: { provider: "email" },
  user_metadata: { full_name: "Demo Admin" },
  aud: "authenticated",
  created_at: new Date().toISOString(),
  email: "admin@weaveone.com",
  role: "authenticated",
  updated_at: new Date().toISOString(),
};

export const MOCK_DEMO_SESSION: Session = {
  access_token: "demo-access-token",
  token_type: "bearer",
  expires_in: 3600,
  refresh_token: "demo-refresh-token",
  user: MOCK_DEMO_USER,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
};

export function setDemoUserMode(enabled: boolean) {
  if (typeof window !== "undefined") {
    if (enabled) {
      localStorage.setItem("weaveone_demo_user", "true");
    } else {
      localStorage.removeItem("weaveone_demo_user");
    }
    window.dispatchEvent(new Event("storage"));
  }
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isDemo = typeof window !== "undefined" && localStorage.getItem("weaveone_demo_user") === "true";
    if (isDemo) {
      setUser(MOCK_DEMO_USER);
      setSession(MOCK_DEMO_SESSION);
      setLoading(false);
    }

    const handleStorage = () => {
      const demoActive = localStorage.getItem("weaveone_demo_user") === "true";
      if (demoActive) {
        setUser(MOCK_DEMO_USER);
        setSession(MOCK_DEMO_SESSION);
        setLoading(false);
      } else if (isDemo) {
        setUser(null);
        setSession(null);
        setLoading(false);
      }
    };
    window.addEventListener("storage", handleStorage);

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (localStorage.getItem("weaveone_demo_user") === "true") return;
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    if (!isDemo) {
      supabase.auth
        .getSession()
        .then(({ data }) => {
          if (localStorage.getItem("weaveone_demo_user") === "true") return;
          if (data.session?.user) {
            setSession(data.session);
            setUser(data.session.user);
          } else {
            // Default to demo user for seamless access without blocking
            setDemoUserMode(true);
            setSession(MOCK_DEMO_SESSION);
            setUser(MOCK_DEMO_USER);
          }
          setLoading(false);
        })
        .catch(() => {
          setDemoUserMode(true);
          setSession(MOCK_DEMO_SESSION);
          setUser(MOCK_DEMO_USER);
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

