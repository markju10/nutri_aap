import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { User, Target, Activity, ChevronRight, LogOut, Flame, Beef, Wheat, Droplets } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLoginUrl } from "@/const";

const activityOptions = [
  { value: "sedentary", label: "Sedentario", desc: "Poco o nessun esercizio" },
  { value: "light", label: "Leggero", desc: "1–3 giorni/settimana" },
  { value: "moderate", label: "Moderato", desc: "3–5 giorni/settimana" },
  { value: "active", label: "Attivo", desc: "6–7 giorni/settimana" },
  { value: "very_active", label: "Molto attivo", desc: "Allenamento intenso quotidiano" },
];

const goalOptions = [
  { value: "lose_weight", label: "Dimagrimento", emoji: "🔥", desc: "-20% calorie" },
  { value: "maintain", label: "Mantenimento", emoji: "⚖️", desc: "Calorie di mantenimento" },
  { value: "gain_muscle", label: "Massa muscolare", emoji: "💪", desc: "+10% calorie" },
];

export default function Profile() {
  const { user, isAuthenticated, logout } = useAuth();
  const { data: profile, refetch } = trpc.profile.get.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [activityLevel, setActivityLevel] = useState("moderate");
  const [goal, setGoal] = useState("maintain");
  const [dietaryPreferences, setDietaryPreferences] = useState("");
  const [overrideCalories, setOverrideCalories] = useState("");
  const [overrideProtein, setOverrideProtein] = useState("");
  const [overrideCarbs, setOverrideCarbs] = useState("");
  const [overrideFat, setOverrideFat] = useState("");

  const [calcInput, setCalcInput] = useState<{
    weight: number; height: number; age: number;
    gender: "male" | "female"; activityLevel: string; goal: "lose_weight" | "gain_muscle" | "maintain";
  } | null>(null);

  const { data: targets } = trpc.profile.calcTargets.useQuery(
    calcInput as Parameters<typeof trpc.profile.calcTargets.useQuery>[0],
    { enabled: !!calcInput }
  );

  const saveMutation = trpc.profile.save.useMutation({
    onSuccess: () => {
      toast.success("Profilo salvato con successo");
      refetch();
    },
    onError: () => toast.error("Errore nel salvataggio"),
  });

  useEffect(() => {
    if (profile) {
      setWeight(profile.weight?.toString() ?? "");
      setHeight(profile.height?.toString() ?? "");
      setAge(profile.age?.toString() ?? "");
      setGender((profile.gender as "male" | "female") ?? "male");
      setActivityLevel(profile.activityLevel ?? "moderate");
      setGoal(profile.goal ?? "maintain");
      setDietaryPreferences(profile.dietaryPreferences ?? "");
      // Carica override se presenti
      if (profile.targetCalories) setOverrideCalories(profile.targetCalories.toString());
      if (profile.targetProtein) setOverrideProtein(profile.targetProtein.toString());
      if (profile.targetCarbs) setOverrideCarbs(profile.targetCarbs.toString());
      if (profile.targetFat) setOverrideFat(profile.targetFat.toString());
    }
  }, [profile]);

  useEffect(() => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age);
    if (w > 0 && h > 0 && a > 0) {
      setCalcInput({ weight: w, height: h, age: a, gender, activityLevel, goal: goal as "lose_weight" | "gain_muscle" | "maintain" });
    }
  }, [weight, height, age, gender, activityLevel, goal]);

  const handleSave = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height);
    const a = parseInt(age);
    if (!w || !h || !a) {
      toast.error("Inserisci peso, altezza ed età");
      return;
    }
    saveMutation.mutate({
      weight: w, height: h, age: a, gender,
      activityLevel: activityLevel as "sedentary" | "light" | "moderate" | "active" | "very_active",
      goal: goal as "lose_weight" | "gain_muscle" | "maintain",
      targetCalories: overrideCalories ? parseInt(overrideCalories) : targets?.adjustedCalories,
      targetProtein: overrideProtein ? parseFloat(overrideProtein) : targets?.protein,
      targetCarbs: overrideCarbs ? parseFloat(overrideCarbs) : targets?.carbs,
      targetFat: overrideFat ? parseFloat(overrideFat) : targets?.fat,
      dietaryPreferences,
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 px-6 pb-nav">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <User size={36} className="text-primary" />
          </div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Accedi a NutriAI</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Accedi per salvare il tuo profilo e monitorare la tua alimentazione
          </p>
        </div>
        <Button
          className="w-full max-w-xs h-12 text-base font-semibold rounded-xl shadow-md shadow-primary/20"
          onClick={() => (window.location.href = getLoginUrl())}
        >
          Accedi con Manus
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-nav">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground pt-12 pb-8 px-4">
        <div className="max-w-[480px] mx-auto flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
            {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold">{user?.name ?? "Utente"}</h1>
            <p className="text-primary-foreground/70 text-sm">{user?.email ?? ""}</p>
          </div>
        </div>
      </div>

      <div className="max-w-[480px] mx-auto px-4 -mt-4">
        <Tabs defaultValue="body">
          <TabsList className="w-full grid grid-cols-3 bg-card shadow-sm rounded-xl mb-4">
            <TabsTrigger value="body" className="rounded-lg text-xs">Corpo</TabsTrigger>
            <TabsTrigger value="goal" className="rounded-lg text-xs">Obiettivo</TabsTrigger>
            <TabsTrigger value="diet" className="rounded-lg text-xs">Dieta</TabsTrigger>
          </TabsList>

          {/* Tab Corpo */}
          <TabsContent value="body" className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Peso (kg)</Label>
                    <Input
                      type="number"
                      placeholder="70"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="h-11 rounded-xl border-input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-muted-foreground">Altezza (cm)</Label>
                    <Input
                      type="number"
                      placeholder="175"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      className="h-11 rounded-xl border-input"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Età</Label>
                  <Input
                    type="number"
                    placeholder="30"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="h-11 rounded-xl border-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Sesso</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["male", "female"] as const).map((g) => (
                      <button
                        key={g}
                        onClick={() => setGender(g)}
                        className={cn(
                          "h-11 rounded-xl border text-sm font-medium transition-all duration-200 press-effect",
                          gender === g
                            ? "bg-primary text-primary-foreground border-primary shadow-sm"
                            : "bg-card text-foreground border-border hover:border-primary/50"
                        )}
                      >
                        {g === "male" ? "👨 Uomo" : "👩 Donna"}
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2 pt-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity size={16} className="text-primary" />
                  Livello di attività
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {activityOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setActivityLevel(opt.value)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-200 press-effect",
                      activityLevel === opt.value
                        ? "bg-primary/5 border-primary text-foreground"
                        : "bg-card border-border hover:border-primary/30"
                    )}
                  >
                    <div>
                      <div className="text-sm font-medium">{opt.label}</div>
                      <div className="text-xs text-muted-foreground">{opt.desc}</div>
                    </div>
                    {activityLevel === opt.value && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                      </div>
                    )}
                  </button>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Obiettivo */}
          <TabsContent value="goal" className="space-y-4">
            <div className="space-y-2">
              {goalOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setGoal(opt.value)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all duration-200 press-effect",
                    goal === opt.value
                      ? "bg-primary/5 border-primary shadow-sm"
                      : "bg-card border-border hover:border-primary/30"
                  )}
                >
                  <span className="text-2xl">{opt.emoji}</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{opt.label}</div>
                    <div className="text-xs text-muted-foreground">{opt.desc}</div>
                  </div>
                  {goal === opt.value && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {targets && (
              <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-primary/10">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Target size={16} className="text-primary" />
                    Obiettivi giornalieri
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pb-4">
                  <p className="text-xs text-muted-foreground">Calcolati automaticamente. Puoi personalizzarli manualmente.</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1">
                        <Flame size={10} className="text-primary" /> Calorie (kcal)
                      </Label>
                      <Input
                        type="number"
                        placeholder={String(targets.adjustedCalories)}
                        value={overrideCalories}
                        onChange={(e) => setOverrideCalories(e.target.value)}
                        className="h-9 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1">
                        <Beef size={10} style={{ color: "var(--protein-color)" }} /> Proteine (g)
                      </Label>
                      <Input
                        type="number"
                        placeholder={String(targets.protein)}
                        value={overrideProtein}
                        onChange={(e) => setOverrideProtein(e.target.value)}
                        className="h-9 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1">
                        <Wheat size={10} style={{ color: "var(--carbs-color)" }} /> Carboidrati (g)
                      </Label>
                      <Input
                        type="number"
                        placeholder={String(targets.carbs)}
                        value={overrideCarbs}
                        onChange={(e) => setOverrideCarbs(e.target.value)}
                        className="h-9 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground flex items-center gap-1 mb-1">
                        <Droplets size={10} style={{ color: "var(--fat-color)" }} /> Grassi (g)
                      </Label>
                      <Input
                        type="number"
                        placeholder={String(targets.fat)}
                        value={overrideFat}
                        onChange={(e) => setOverrideFat(e.target.value)}
                        className="h-9 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => { setOverrideCalories(""); setOverrideProtein(""); setOverrideCarbs(""); setOverrideFat(""); }}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    Ripristina valori calcolati
                  </button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab Dieta */}
          <TabsContent value="diet" className="space-y-4">
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-4 space-y-3">
                <Label className="text-xs font-medium text-muted-foreground">
                  Preferenze alimentari (per ricette AI)
                </Label>
                <textarea
                  className="w-full h-28 rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Es: vegetariano, senza glutine, no latticini, cucina mediterranea..."
                  value={dietaryPreferences}
                  onChange={(e) => setDietaryPreferences(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Queste preferenze verranno usate dall'AI per generare ricette personalizzate.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-4 space-y-3 pb-4">
          <Button
            className="w-full h-12 text-base font-semibold rounded-xl shadow-md shadow-primary/20"
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? "Salvataggio..." : "Salva profilo"}
          </Button>
          <Button
            variant="ghost"
            className="w-full h-11 text-muted-foreground rounded-xl"
            onClick={() => logout()}
          >
            <LogOut size={16} className="mr-2" />
            Esci dall'account
          </Button>
        </div>
      </div>
    </div>
  );
}
