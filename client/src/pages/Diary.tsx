import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Plus, Trash2,
  Camera, Search, Barcode, Flame, ChartLine
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import MacroRing, { MacroBar } from "@/components/MacroRing";
import { format, addDays, subDays, isToday } from "date-fns";
import { it } from "date-fns/locale";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

const mealConfig: Record<MealType, { label: string; emoji: string; color: string }> = {
  breakfast: { label: "Colazione", emoji: "☀️", color: "oklch(0.72 0.15 80)" },
  lunch: { label: "Pranzo", emoji: "🌿", color: "oklch(0.52 0.15 162)" },
  dinner: { label: "Cena", emoji: "🌙", color: "oklch(0.55 0.18 200)" },
  snack: { label: "Spuntino", emoji: "🍎", color: "oklch(0.60 0.18 40)" },
};

const mealOrder: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

export default function Diary() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [currentDate, setCurrentDate] = useState(new Date());

  const dateStr = format(currentDate, "yyyy-MM-dd");
  const { data: profile } = trpc.profile.get.useQuery(undefined, { enabled: isAuthenticated });
  const { data: logs = [], refetch } = trpc.diary.getDay.useQuery(
    { date: dateStr },
    { enabled: isAuthenticated }
  );

  const deleteMutation = trpc.diary.deleteEntry.useMutation({
    onSuccess: () => { toast.success("Rimosso dal diario"); refetch(); },
    onError: () => toast.error("Errore nella rimozione"),
  });

  // Totali giornalieri
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

  const logsByMeal = mealOrder.reduce((acc, meal) => {
    acc[meal] = logs.filter((l) => l.mealType === meal);
    return acc;
  }, {} as Record<MealType, typeof logs>);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 pb-nav">
        <p className="text-center text-muted-foreground">Accedi per vedere il tuo diario</p>
        <Button onClick={() => (window.location.href = getLoginUrl())}>Accedi</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-nav">
      {/* Header con navigazione data */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-[480px] mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => setCurrentDate(subDays(currentDate, 1))}
            className="p-2 rounded-full hover:bg-muted transition-colors press-effect"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="text-center">
            <div className="text-sm font-semibold text-foreground capitalize">
              {isToday(currentDate)
                ? "Oggi"
                : format(currentDate, "EEEE", { locale: it })}
            </div>
            <div className="text-xs text-muted-foreground">
              {format(currentDate, "d MMMM yyyy", { locale: it })}
            </div>
          </div>
          <button
            onClick={() => setCurrentDate(addDays(currentDate, 1))}
            className="p-2 rounded-full hover:bg-muted transition-colors press-effect"
            disabled={isToday(currentDate)}
          >
            <ChevronRight size={20} className={cn(isToday(currentDate) && "text-muted")} />
          </button>
          <button
            onClick={() => navigate("/history")}
            className="p-2 rounded-full hover:bg-muted transition-colors press-effect"
            title="Storico"
          >
            <ChartLine size={18} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="max-w-[480px] mx-auto px-4 py-4 space-y-4">
        {/* Riepilogo calorie con anello */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardContent className="pt-5 pb-4">
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
                <MacroBar
                  label="Proteine"
                  value={totals.protein}
                  target={targets.protein}
                  color="var(--protein-color)"
                />
                <MacroBar
                  label="Carboidrati"
                  value={totals.carbs}
                  target={targets.carbs}
                  color="var(--carbs-color)"
                />
                <MacroBar
                  label="Grassi"
                  value={totals.fat}
                  target={targets.fat}
                  color="var(--fat-color)"
                />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Flame size={12} className="text-primary" />
                {Math.round(totals.calories)} kcal consumate
              </span>
              <span>{Math.max(targets.calories - Math.round(totals.calories), 0)} kcal rimaste</span>
            </div>
          </CardContent>
        </Card>

        {/* Sezioni pasti */}
        {mealOrder.map((meal) => {
          const config = mealConfig[meal];
          const mealLogs = logsByMeal[meal];
          const mealTotal = mealLogs.reduce((acc, l) => acc + l.calories, 0);

          return (
            <div key={meal}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">{config.emoji}</span>
                  <span className="text-sm font-semibold text-foreground">{config.label}</span>
                  {mealTotal > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {Math.round(mealTotal)} kcal
                    </span>
                  )}
                </div>
                <button
                  onClick={() => navigate("/scan")}
                  className="flex items-center gap-1 text-xs text-primary font-medium px-2 py-1 rounded-lg hover:bg-primary/5 transition-colors press-effect"
                >
                  <Plus size={14} />
                  Aggiungi
                </button>
              </div>

              {mealLogs.length === 0 ? (
                <button
                  onClick={() => navigate("/scan")}
                  className="w-full flex items-center gap-3 p-3.5 rounded-xl border border-dashed border-border hover:border-primary/40 hover:bg-primary/2 transition-all press-effect"
                >
                  <div className="flex gap-2 text-muted-foreground">
                    <Camera size={15} />
                    <Search size={15} />
                    <Barcode size={15} />
                  </div>
                  <span className="text-xs text-muted-foreground">Aggiungi un alimento</span>
                </button>
              ) : (
                <div className="space-y-1.5">
                  {mealLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
                    >
                      {log.imageUrl && (
                        <img
                          src={log.imageUrl}
                          alt={log.foodName}
                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">
                          {log.foodName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {log.portionGrams}g · {Math.round(log.calories)} kcal
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          P: {Math.round(log.protein)}g · C: {Math.round(log.carbs)}g · G: {Math.round(log.fat)}g
                        </div>
                      </div>
                      <button
                        onClick={() => deleteMutation.mutate({ id: log.id })}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors press-effect flex-shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
