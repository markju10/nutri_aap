import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Leaf } from "lucide-react";
import { trpc } from "@/lib/trpc";

type Mode = "login" | "register";

export default function Login() {
  const [, setLocation] = useLocation();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const utils = trpc.useUtils();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body: Record<string, string> = { email, password };
      if (mode === "register" && name) body.name = name;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      const data = await res.json() as { success?: boolean; error?: string };

      if (!res.ok || !data.success) {
        toast.error(data.error || "Errore durante l'accesso");
        return;
      }

      await utils.auth.me.invalidate();
      toast.success(mode === "login" ? "Accesso effettuato!" : "Account creato con successo!");
      setLocation("/");
    } catch {
      toast.error("Errore di connessione. Riprova.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
            <Leaf className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">NutriAI</h1>
          <p className="text-muted-foreground mt-1 text-sm">Il tuo assistente nutrizionale intelligente</p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">
              {mode === "login" ? "Accedi al tuo account" : "Crea un account"}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Inserisci le tue credenziali per continuare"
                : "Registrati gratuitamente per iniziare"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nome (opzionale)</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Il tuo nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nome@esempio.it"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={mode === "register" ? "Minimo 6 caratteri" : "La tua password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {mode === "login" ? "Accesso in corso..." : "Registrazione..."}
                  </>
                ) : mode === "login" ? (
                  "Accedi"
                ) : (
                  "Crea account"
                )}
              </Button>
            </form>

            <div className="mt-4 text-center text-sm text-muted-foreground">
              {mode === "login" ? (
                <>
                  Non hai un account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("register")}
                    className="text-primary font-medium hover:underline"
                  >
                    Registrati
                  </button>
                </>
              ) : (
                <>
                  Hai già un account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="text-primary font-medium hover:underline"
                  >
                    Accedi
                  </button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
