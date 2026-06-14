import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { it } from "date-fns/locale";
import { getLoginUrl } from "@/const";
import { TrendingUp, TrendingDown, Minus, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

function getWeekRange() {
  const end = new Date();
  const start = subDays(end, 6);
  return {
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
  };
}

function getMonthRange() {
  const now = new Date();
  return {
    startDate: format(startOfMonth(now), "yyyy-MM-dd"),
    endDate: format(endOfMonth(now), "yyyy-MM-dd"),
  };
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl p-3 shadow-lg text-xs">
      <p className="font-semibold text-foreground mb-1.5">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium text-foreground">{Math.round(p.value)}{p.name === "Calorie" ? " kcal" : "g"}</span>
        </div>
      ))}
    </div>
  );
};

export default function History() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [period, setPeriod] = useState<"week" | "month">("week");

  const weekRange = useMemo(() => getWeekRange(), []);
  const monthRange = useMemo(() => getMonthRange(), []);
  const range = period === "week" ? weekRange : monthRange;

  const { data: profile } = trpc.profile.get.useQuery(undefined, { enabled: isAuthenticated });
  const { data: historyData = [] } = trpc.history.getRange.useQuery(range, { enabled: isAuthenticated });

  const targetCalories = profile?.targetCalories ?? 2000;
  const targetProtein = profile?.targetProtein ?? 150;
  const targetCarbs = profile?.targetCarbs ?? 250;
  const targetFat = profile?.targetFat ?? 65;

  // Prepara dati per grafici
  const chartData = historyData.map((d) => ({
    date: format(new Date(d.date + "T00:00:00"), period === "week" ? "EEE" : "d MMM", { locale: it }),
    Calorie: d.calories,
    Proteine: d.protein,
    Carboidrati: d.carbs,
    Grassi: d.fat,
  }));

  // Statistiche medie
  const avg = historyData.length > 0
    ? {
        calories: Math.round(historyData.reduce((a, d) => a + d.calories, 0) / historyData.length),
        protein: Math.round(historyData.reduce((a, d) => a + d.protein, 0) / historyData.length * 10) / 10,
        carbs: Math.round(historyData.reduce((a, d) => a + d.carbs, 0) / historyData.length * 10) / 10,
        fat: Math.round(historyData.reduce((a, d) => a + d.fat, 0) / historyData.length * 10) / 10,
      }
    : null;

  const calorieTrend = avg
    ? avg.calories > targetCalories * 1.05
      ? "over"
      : avg.calories < targetCalories * 0.85
      ? "under"
      : "on-track"
    : null;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 pb-nav">
        <p className="text-center text-muted-foreground">Accedi per vedere lo storico</p>
        <Button onClick={() => (window.location.href = getLoginUrl())}>Accedi</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-nav">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-[480px] mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => navigate("/diary")}
            className="p-2 rounded-full hover:bg-muted transition-colors press-effect"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-serif font-bold">Storico</h1>
        </div>
      </div>

      <div className="max-w-[480px] mx-auto px-4 py-4 space-y-4">
        {/* Period selector */}
        <div className="flex gap-2">
          {(["week", "month"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`flex-1 h-9 rounded-xl text-sm font-medium transition-all press-effect ${
                period === p
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card border border-border text-muted-foreground"
              }`}
            >
              {p === "week" ? "Settimana" : "Mese"}
            </button>
          ))}
        </div>

        {/* Statistiche medie */}
        {avg && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                {calorieTrend === "on-track" ? (
                  <Minus size={16} className="text-primary" />
                ) : calorieTrend === "over" ? (
                  <TrendingUp size={16} className="text-destructive" />
                ) : (
                  <TrendingDown size={16} className="text-yellow-500" />
                )}
                Media {period === "week" ? "settimanale" : "mensile"}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-4 gap-2 pb-4">
              <div className="text-center bg-primary/5 rounded-xl p-2.5">
                <div className="text-base font-bold text-primary">{avg.calories}</div>
                <div className="text-[9px] text-muted-foreground">kcal</div>
              </div>
              <div className="text-center bg-muted rounded-xl p-2.5">
                <div className="text-base font-bold" style={{ color: "var(--protein-color)" }}>{avg.protein}g</div>
                <div className="text-[9px] text-muted-foreground">Prot.</div>
              </div>
              <div className="text-center bg-muted rounded-xl p-2.5">
                <div className="text-base font-bold" style={{ color: "var(--carbs-color)" }}>{avg.carbs}g</div>
                <div className="text-[9px] text-muted-foreground">Carb.</div>
              </div>
              <div className="text-center bg-muted rounded-xl p-2.5">
                <div className="text-base font-bold" style={{ color: "var(--fat-color)" }}>{avg.fat}g</div>
                <div className="text-[9px] text-muted-foreground">Grassi</div>
              </div>
            </CardContent>
          </Card>
        )}

        {historyData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-3xl">📊</div>
            <p className="text-sm font-medium text-foreground">Nessun dato disponibile</p>
            <p className="text-xs text-muted-foreground text-center">
              Inizia a registrare i tuoi pasti per vedere lo storico
            </p>
          </div>
        ) : (
          <Tabs defaultValue="calories">
            <TabsList className="w-full grid grid-cols-2 bg-card shadow-sm rounded-xl mb-3">
              <TabsTrigger value="calories" className="rounded-lg text-xs">Calorie</TabsTrigger>
              <TabsTrigger value="macros" className="rounded-lg text-xs">Macronutrienti</TabsTrigger>
            </TabsList>

            <TabsContent value="calories">
              <Card className="border-0 shadow-sm">
                <CardContent className="pt-4 pb-2">
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="calorieGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      {/* Linea obiettivo */}
                      <Area
                        type="monotone"
                        dataKey="Calorie"
                        stroke="var(--primary)"
                        strokeWidth={2.5}
                        fill="url(#calorieGrad)"
                        dot={{ fill: "var(--primary)", r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 5, strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                    <div className="w-3 h-0.5 bg-primary rounded" />
                    <span>Calorie · Obiettivo: {targetCalories} kcal/giorno</span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="macros">
              <Card className="border-0 shadow-sm">
                <CardContent className="pt-4 pb-2">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="Proteine" fill="var(--protein-color)" radius={[3, 3, 0, 0]} maxBarSize={12} />
                      <Bar dataKey="Carboidrati" fill="var(--carbs-color)" radius={[3, 3, 0, 0]} maxBarSize={12} />
                      <Bar dataKey="Grassi" fill="var(--fat-color)" radius={[3, 3, 0, 0]} maxBarSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ background: "var(--protein-color)" }} />
                      <span>Proteine</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ background: "var(--carbs-color)" }} />
                      <span>Carboidrati</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ background: "var(--fat-color)" }} />
                      <span>Grassi</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
