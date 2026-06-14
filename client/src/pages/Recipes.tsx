import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ChefHat, Sparkles, Bookmark, Trash2, Clock,
  ChevronDown, ChevronUp, Loader2, Flame
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getLoginUrl } from "@/const";
import { format } from "date-fns";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

const mealLabels: Record<MealType, string> = {
  breakfast: "Colazione",
  lunch: "Pranzo",
  dinner: "Cena",
  snack: "Spuntino",
};

interface Ingredient {
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface Recipe {
  name: string;
  description: string;
  ingredients: Ingredient[];
  instructions: string[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  prepTimeMinutes: number;
  servings: number;
}

function RecipeCard({ recipe, onSave, onDelete, isSaved = false }: {
  recipe: Recipe;
  onSave?: () => void;
  onDelete?: () => void;
  isSaved?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardContent className="pt-4 pb-0">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1">
            <h3 className="font-serif font-semibold text-base text-foreground leading-tight">{recipe.name}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{recipe.description}</p>
          </div>
          {onSave && (
            <button
              onClick={onSave}
              className="p-2 rounded-xl hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors press-effect flex-shrink-0"
            >
              <Bookmark size={18} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-2 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors press-effect flex-shrink-0"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>

        {/* Macro summary */}
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          <div className="text-center bg-primary/5 rounded-xl py-2">
            <div className="text-sm font-bold text-primary">{Math.round(recipe.totalCalories)}</div>
            <div className="text-[9px] text-muted-foreground">kcal</div>
          </div>
          <div className="text-center bg-muted rounded-xl py-2">
            <div className="text-sm font-bold" style={{ color: "var(--protein-color)" }}>{Math.round(recipe.totalProtein)}g</div>
            <div className="text-[9px] text-muted-foreground">Prot.</div>
          </div>
          <div className="text-center bg-muted rounded-xl py-2">
            <div className="text-sm font-bold" style={{ color: "var(--carbs-color)" }}>{Math.round(recipe.totalCarbs)}g</div>
            <div className="text-[9px] text-muted-foreground">Carb.</div>
          </div>
          <div className="text-center bg-muted rounded-xl py-2">
            <div className="text-sm font-bold" style={{ color: "var(--fat-color)" }}>{Math.round(recipe.totalFat)}g</div>
            <div className="text-[9px] text-muted-foreground">Grassi</div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {recipe.prepTimeMinutes} min
          </span>
          <span>·</span>
          <span>{recipe.servings} porzione{recipe.servings > 1 ? "i" : ""}</span>
        </div>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 py-2.5 border-t border-border text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? "Nascondi dettagli" : "Mostra ingredienti e preparazione"}
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </CardContent>

      {expanded && (
        <CardContent className="pt-0 pb-4 space-y-4">
          {/* Ingredienti */}
          <div>
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">Ingredienti</h4>
            <div className="space-y-1.5">
              {recipe.ingredients.map((ing, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <span className="text-sm text-foreground">{ing.name}</span>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{ing.grams}g</span>
                    <span>{Math.round(ing.calories)} kcal</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preparazione */}
          <div>
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">Preparazione</h4>
            <ol className="space-y-2">
              {recipe.instructions.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm text-foreground leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function Recipes() {
  const { isAuthenticated } = useAuth();
  const [mealType, setMealType] = useState<MealType>("lunch");
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const today = format(new Date(), "yyyy-MM-dd");
  const { data: profile } = trpc.profile.get.useQuery(undefined, { enabled: isAuthenticated });
  const { data: todayLogs = [] } = trpc.diary.getDay.useQuery({ date: today }, { enabled: isAuthenticated });
  const { data: savedRecipes = [], refetch: refetchSaved } = trpc.recipes.getSaved.useQuery(undefined, { enabled: isAuthenticated });

  const generateMutation = trpc.recipes.generate.useMutation();
  const saveMutation = trpc.recipes.save.useMutation({
    onSuccess: () => { toast.success("Ricetta salvata!"); refetchSaved(); },
    onError: () => toast.error("Errore nel salvataggio"),
  });
  const deleteMutation = trpc.recipes.delete.useMutation({
    onSuccess: () => { toast.success("Ricetta eliminata"); refetchSaved(); },
    onError: () => toast.error("Errore nell'eliminazione"),
  });

  // Calcola macro rimanenti
  const totals = todayLogs.reduce(
    (acc, log) => ({ calories: acc.calories + log.calories, protein: acc.protein + log.protein, carbs: acc.carbs + log.carbs, fat: acc.fat + log.fat }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
  const remaining = {
    calories: Math.max((profile?.targetCalories ?? 2000) - totals.calories, 200),
    protein: Math.max((profile?.targetProtein ?? 150) - totals.protein, 10),
    carbs: Math.max((profile?.targetCarbs ?? 250) - totals.carbs, 20),
    fat: Math.max((profile?.targetFat ?? 65) - totals.fat, 5),
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedRecipe(null);
    try {
      const recipe = await generateMutation.mutateAsync({
        remainingCalories: remaining.calories,
        remainingProtein: remaining.protein,
        remainingCarbs: remaining.carbs,
        remainingFat: remaining.fat,
        mealType,
        preferences: profile?.dietaryPreferences ?? undefined,
      });
      setGeneratedRecipe(recipe as Recipe);
    } catch {
      toast.error("Errore nella generazione della ricetta");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = (recipe: Recipe) => {
    saveMutation.mutate({
      name: recipe.name,
      description: recipe.description,
      ingredients: JSON.stringify(recipe.ingredients),
      instructions: recipe.instructions.join("\n"),
      totalCalories: recipe.totalCalories,
      totalProtein: recipe.totalProtein,
      totalCarbs: recipe.totalCarbs,
      totalFat: recipe.totalFat,
      servings: recipe.servings,
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 pb-nav">
        <ChefHat size={48} className="text-primary" />
        <p className="text-center text-muted-foreground">Accedi per generare ricette personalizzate</p>
        <Button onClick={() => (window.location.href = getLoginUrl())}>Accedi</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-nav">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-[480px] mx-auto px-4 h-14 flex items-center">
          <h1 className="text-lg font-serif font-bold">Ricette AI</h1>
        </div>
      </div>

      <div className="max-w-[480px] mx-auto px-4 py-4">
        <Tabs defaultValue="generate">
          <TabsList className="w-full grid grid-cols-2 bg-card shadow-sm rounded-xl mb-4">
            <TabsTrigger value="generate" className="rounded-lg text-xs">Genera ricetta</TabsTrigger>
            <TabsTrigger value="saved" className="rounded-lg text-xs">
              Salvate {savedRecipes.length > 0 && `(${savedRecipes.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-4">
            {/* Macro rimanenti */}
            <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Flame size={14} className="text-primary" />
                  <span className="text-xs font-semibold text-foreground">Macro rimanenti oggi</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <div className="text-base font-bold text-primary">{Math.round(remaining.calories)}</div>
                    <div className="text-[9px] text-muted-foreground">kcal</div>
                  </div>
                  <div>
                    <div className="text-base font-bold" style={{ color: "var(--protein-color)" }}>{Math.round(remaining.protein)}g</div>
                    <div className="text-[9px] text-muted-foreground">Prot.</div>
                  </div>
                  <div>
                    <div className="text-base font-bold" style={{ color: "var(--carbs-color)" }}>{Math.round(remaining.carbs)}g</div>
                    <div className="text-[9px] text-muted-foreground">Carb.</div>
                  </div>
                  <div>
                    <div className="text-base font-bold" style={{ color: "var(--fat-color)" }}>{Math.round(remaining.fat)}g</div>
                    <div className="text-[9px] text-muted-foreground">Grassi</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tipo pasto */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Per quale pasto?</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(mealLabels) as [MealType, string][]).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setMealType(key)}
                    className={cn(
                      "h-10 rounded-xl border text-sm font-medium transition-all press-effect",
                      mealType === key
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-card border-border text-foreground hover:border-primary/40"
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <Button
              className="w-full h-12 text-base font-semibold rounded-xl shadow-md shadow-primary/20"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={18} className="animate-spin mr-2" />
                  Generazione in corso...
                </>
              ) : (
                <>
                  <Sparkles size={18} className="mr-2" />
                  Genera ricetta AI
                </>
              )}
            </Button>

            {isGenerating && (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground">
                  L'AI sta creando una ricetta personalizzata con le grammature esatte per i tuoi macro...
                </p>
              </div>
            )}

            {generatedRecipe && (
              <RecipeCard
                recipe={generatedRecipe}
                onSave={() => handleSave(generatedRecipe)}
              />
            )}
          </TabsContent>

          <TabsContent value="saved" className="space-y-3">
            {savedRecipes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <Bookmark size={28} className="text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">Nessuna ricetta salvata</p>
                <p className="text-xs text-muted-foreground text-center">
                  Genera una ricetta e salvala per ritrovarla qui
                </p>
              </div>
            ) : (
              savedRecipes.map((recipe) => {
                const parsed: Recipe = {
                  name: recipe.name,
                  description: recipe.description ?? "",
                  ingredients: (() => {
                    try { return JSON.parse(recipe.ingredients); } catch { return []; }
                  })(),
                  instructions: recipe.instructions.split("\n").filter(Boolean),
                  totalCalories: recipe.totalCalories,
                  totalProtein: recipe.totalProtein,
                  totalCarbs: recipe.totalCarbs,
                  totalFat: recipe.totalFat,
                  prepTimeMinutes: 0,
                  servings: recipe.servings ?? 1,
                };
                return (
                  <RecipeCard
                    key={recipe.id}
                    recipe={parsed}
                    isSaved
                    onDelete={() => deleteMutation.mutate({ id: recipe.id })}
                  />
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
