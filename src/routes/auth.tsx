import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { toast } from "sonner";
import { Recycle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — WasteFlow" },
      { name: "description", content: "Sign in to the WasteFlow smart waste control room." },
      { property: "og:title", content: "Sign in — WasteFlow" },
      { property: "og:description", content: "Sign in to the WasteFlow smart waste control room." },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({ email: z.string().trim().email("Enter a valid email"), password: z.string().min(8, "At least 8 characters") });

function AuthPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = schema.safeParse({ email, password });
    if (!p.success) return toast.error(p.error.issues[0].message);
    setBusy(true);
    const { error } =
      mode === "in"
        ? await supabase.auth.signInWithPassword(p.data)
        : await supabase.auth.signUp({ ...p.data, options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (mode === "up") return toast.success("Check your email to confirm your account.");
    nav({ to: "/dashboard" });
  };

  const google = async () => {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (r?.error) toast.error(String(r.error.message ?? r.error));
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-sidebar p-10 text-sidebar-foreground md:flex">
        <div className="flex items-center gap-2"><Recycle className="h-7 w-7 text-sidebar-primary" /><span className="font-display text-xl font-semibold">WasteFlow</span></div>
        <div>
          <h1 className="font-display text-4xl font-semibold leading-tight">Every bin. Every truck.<br />One control room.</h1>
          <p className="mt-4 max-w-sm opacity-70">Live fill levels from smart dustbins and GPS from collection vehicles, for urban local bodies.</p>
        </div>
        <div className="font-mono text-xs opacity-50">Smart Waste Segregation & Collection Monitoring</div>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <h2 className="font-display text-2xl font-semibold">{mode === "in" ? "Sign in" : "Create account"}</h2>
          <div className="space-y-1.5"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="pw">Password</Label><Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <Button className="w-full" disabled={busy}>{busy ? "Please wait…" : mode === "in" ? "Sign in" : "Sign up"}</Button>
          <Button type="button" variant="outline" className="w-full" onClick={google}>Continue with Google</Button>
          <button type="button" className="w-full text-sm text-muted-foreground hover:text-foreground" onClick={() => setMode(mode === "in" ? "up" : "in")}>
            {mode === "in" ? "No account? Sign up" : "Have an account? Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
