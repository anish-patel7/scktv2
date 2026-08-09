import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { setDemoUserMode } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — WeaveOne Textile ERP" },
      {
        name: "description",
        content:
          "Sign in to WeaveOne to prepare fabric cost sheets, manage yarn masters and approve textile costings.",
      },
      { property: "og:title", content: "Sign in — WeaveOne Textile ERP" },
      {
        property: "og:description",
        content: "Secure access to the WeaveOne fabric costing and manufacturing platform.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  const enterDemoMode = () => {
    setDemoUserMode(true);
    toast.success("Entered Demo Mode (Login bypassed)");
    navigate({ to: "/" });
  };

  const signIn = async () => {
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      setBusy(false);
      if (error) {
        toast.error(`Sign in failed: ${error.message}`);
        return;
      }
      if (data?.session) {
        toast.success("Signed in successfully!");
        navigate({ to: "/" });
      }
    } catch (err: any) {
      setBusy(false);
      toast.error(`Auth error: ${err?.message || "Unknown error"}. Use Demo Mode below to preview.`);
    }
  };

  const signUp = async () => {
    if (!email || !password) {
      toast.error("Please fill in email and password");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: fullName || "User" },
        },
      });
      setBusy(false);
      if (error) {
        toast.error(`Sign up error: ${error.message}`);
        return;
      }
      if (data?.session) {
        toast.success("Account created and signed in!");
        navigate({ to: "/" });
      } else {
        toast.success("Account created! Logging in as Demo user for instant access.");
        enterDemoMode();
      }
    } catch (err: any) {
      setBusy(false);
      toast.error(`Sign up failed: ${err?.message || "Remote service unreachable"}`);
    }
  };

  const google = async () => {
    try {
      const { lovable } = await import("@/integrations/lovable/index");
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) { toast.error("Google sign-in failed"); return; }
      if (result.redirected) return;
      navigate({ to: "/" });
    } catch {
      toast.error("OAuth not configured. Use Demo Login to preview.");
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-10 lg:flex">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-sm bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
            W1
          </span>
          <span className="font-semibold text-sidebar-accent-foreground">WeaveOne</span>
        </div>
        <div className="max-w-md">
          <h2 className="text-2xl font-semibold text-sidebar-accent-foreground">
            Textile fabric costing & manufacturing ERP
          </h2>
          <p className="mt-3 text-sm text-sidebar-foreground/75">
            One system of record for yarn rates, warp and weft costing, feeder colourways, job cards
            and approvals — with the arithmetic frozen exactly as the workbook computes it.
          </p>
        </div>
        <p className="text-[0.6875rem] text-sidebar-foreground/50">
          Internal — Confidential · PRD v2.0
        </p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-4 rounded-md border border-primary/20 bg-primary/5 p-3 text-center">
            <p className="text-xs font-medium text-primary">Testing local design?</p>
            <p className="mt-0.5 text-[0.75rem] text-muted-foreground">Skip account setup and inspect all pages instantly:</p>
            <Button size="sm" className="mt-2 w-full font-semibold" onClick={enterDemoMode}>
              ⚡ Instant Demo Access (Bypass Login)
            </Button>
          </div>

          <h1 className="text-lg font-semibold">Sign in to WeaveOne</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every cost sheet is attributed to the person who created it.
          </p>

          <Tabs defaultValue="signin" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="admin@weaveone.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button className="w-full" disabled={busy} onClick={signIn}>
                {busy ? "Signing in..." : "Sign in"}
              </Button>
            </TabsContent>

            <TabsContent value="signup" className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email2">Email</Label>
                <Input id="email2" type="email" placeholder="john@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password2">Password</Label>
                <Input
                  id="password2"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button className="w-full" disabled={busy} onClick={signUp}>
                {busy ? "Creating account..." : "Create account"}
              </Button>
            </TabsContent>
          </Tabs>

          <div className="my-4 flex items-center gap-2 text-[0.6875rem] text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> OR <span className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" className="w-full" onClick={google}>
            Continue with Google
          </Button>
        </div>
      </div>
    </div>
  );
}

