import { useState, useMemo } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Camera, Search, Barcode, ChefHat, ArrowRight, Sparkles } from "lucide-react";
import MacroRing, { MacroBar } from "@/components/MacroRing";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export default function Home() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  const { data: profile } = trpc.profile.get.useQuery(undefined, { enabled: isAuthenticated });
  const { data: logs = [] } = trpc.diary.getDay.useQuery({ date: today }, { enabled: isAuthenticated });

  const totals = logs.reduce(
    (acc, log) => ({
      calories: acc.calories + log.calories,
      protein: acc.protein + log.protein,
      carbs: acc.carbs + log.carbs,
      fat: acc.fat + log.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const targets = {
    calories: profile?.targetCalories ?? 2000,
    protein: profile?.targetProtein ?? 150,
    carbs: profile?.targetCarbs ?? 250,
    fat: profile?.targetFat ?? 65,
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buongiorno" : hour < 18 ? "Buon pomeriggio" : "Buonasera";
  const dateLabel = format(new Date(), "EEEE d MMMM", { locale: it });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Hero */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-6 pt-12 pb-8">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-xl shadow-primary/30">
            <span className="text-4xl">🥗</span>
          </div>
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground leading-tight">
              NutriAI
            </h1>
            <p className="text-muted-foreground mt-2 text-sm leading-relaxed max-w-xs mx-auto">
              Il tuo assistente nutrizionale intelligente. Scatta una foto e scopri calorie e macronutrienti in secondi.
            </p>
          </div>

          <div className="w-full max-w-xs space-y-3">
            <div className="flex items-center gap-3 text-left p-3 rounded-xl bg-secondary">
              <span className="text-xl">📸</span>
              <div>
                <div className="text-sm font-medium">Riconoscimento AI</div>
                <div className="text-xs text-muted-foreground">Scatta una foto al cibo</div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-left p-3 rounded-xl bg-secondary">
              <span className="text-xl">📊</span>
              <div>
                <div className="text-sm font-medium">Traccia i macro</div>
                <div className="text-xs text-muted-foreground">Calorie, proteine, carboidrati, grassi</div>
              </div>
            </div>
            <div className="flex items-center gap-3 text-left p-3 rounded-xl bg-secondary">
              <span className="text-xl">🍽️</span>
              <div>
                <div className="text-sm font-medium">Ricette personalizzate</div>
                <div className="text-xs text-muted-foreground">Generate dall'AI sui tuoi obiettivi</div>
              </div>
            </div>
          </div>

          <Button
            className="w-full max-w-xs h-12 text-base font-semibold rounded-xl shadow-lg shadow-primary/25"
            onClick={() => navigate("/login")}
          >
            Inizia gratis
            <ArrowRight size={18} className="ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-nav">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary/75 text-primary-foreground pt-12 pb-6 px-4">
        <div className="max-w-[480px] mx-auto">
          <p className="text-primary-foreground/70 text-sm capitalize">{dateLabel}</p>
          <h1 className="text-xl font-serif font-bold mt-0.5">
            {greeting}{user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
        </div>
      </div>

      <div className="max-w-[480px] mx-auto px-4 -mt-4 space-y-4 pb-4">
        {/* Riepilogo calorie */}
        <Card className="border-0 shadow-md">
          <CardContent className="pt-5 pb-4">
            {!profile?.targetCalories ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">
                  Imposta il tuo profilo per vedere gli obiettivi
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => navigate("/profile")}
                >
                  Configura profilo
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-6">
                  <MacroRing
                    calories={totals.calories}
                    targetCalories={targets.calories}
                    protein={totals.protein}
                    targetProtein={targets.protein}
                    carbs={totals.carbs}
                    targetCarbs={targets.carbs}
                    fat={totals.fat}
                    targetFat={targets.fat}
                    size={120}
                  />
                  <div className="flex-1 space-y-2.5">
                    <MacroBar label="Proteine" value={totals.protein} target={targets.protein} color="var(--protein-color)" />
                    <MacroBar label="Carboidrati" value={totals.carbs} target={targets.carbs} color="var(--carbs-color)" />
                    <MacroBar label="Grassi" value={totals.fat} target={targets.fat} color="var(--fat-color)" />
                  </div>
                </div>
                <button
                  onClick={() => navigate("/diary")}
                  className="mt-3 pt-3 border-t border-border w-full flex items-center justify-between text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <span>Vedi diario completo</span>
                  <ArrowRight size={14} />
                </button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Azioni rapide */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-2">Aggiungi un pasto</h2>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => navigate("/scan")}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-md shadow-primary/20 press-effect"
            >
              <Camera size={22} />
              <span className="text-xs font-medium">Foto</span>
            </button>
            <button
              onClick={() => navigate("/scan")}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border shadow-sm press-effect hover:border-primary/30 transition-colors"
            >
              <Search size={22} className="text-primary" />
              <span className="text-xs font-medium text-foreground">Cerca</span>
            </button>
            <button
              onClick={() => navigate("/scan")}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border shadow-sm press-effect hover:border-primary/30 transition-colors"
            >
              <Barcode size={22} className="text-primary" />
              <span className="text-xs font-medium text-foreground">Barcode</span>
            </button>
          </div>
        </div>

        {/* Ricette AI */}
        <button
          onClick={() => navigate("/recipes")}
          className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-accent/60 to-accent/20 border border-accent/30 press-effect hover:border-accent/60 transition-colors"
        >
          <div className="w-11 h-11 rounded-xl bg-accent/50 flex items-center justify-center">
            <ChefHat size={22} className="text-accent-foreground" />
          </div>
          <div className="text-left flex-1">
            <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              Genera ricetta AI
              <Sparkles size={13} className="text-accent-foreground" />
            </div>
            <div className="text-xs text-muted-foreground">
              Basata sui tuoi macro rimanenti
            </div>
          </div>
          <ArrowRight size={16} className="text-muted-foreground" />
        </button>

        {/* Ultimi pasti */}
        {logs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-foreground">Pasti di oggi</h2>
              <button
                onClick={() => navigate("/diary")}
                className="text-xs text-primary font-medium"
              >
                Vedi tutti
              </button>
            </div>
            <div className="space-y-1.5">
              {logs.slice(0, 3).map((log) => (
                <div key={log.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                  {log.imageUrl && (
                    <img src={log.imageUrl} alt={log.foodName} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{log.foodName}</div>
                    <div className="text-xs text-muted-foreground">{log.portionGrams}g</div>
                  </div>
                  <div className="text-sm font-semibold text-primary">{Math.round(log.calories)} kcal</div>
                </div>
              ))}
              {logs.length > 3 && (
                <button
                  onClick={() => navigate("/diary")}
                  className="w-full text-center text-xs text-muted-foreground py-2 hover:text-primary transition-colors"
                >
                  +{logs.length - 3} altri pasti
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
