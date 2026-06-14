import { useState, useRef, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Camera, Search, Barcode, X, Check, ChevronDown,
  Loader2, AlertCircle, Edit2, Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";
type Mode = "choose" | "camera" | "search" | "barcode" | "confirm";

interface FoodResult {
  foodName: string;
  estimatedPortionGrams?: number;
  typicalPortionGrams?: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  imageUrl?: string | null;
  brand?: string;
  confidence?: string;
  notes?: string;
}

const mealLabels: Record<MealType, string> = {
  breakfast: "Colazione",
  lunch: "Pranzo",
  dinner: "Cena",
  snack: "Spuntino",
};

function getMealTypeByHour(): MealType {
  const h = new Date().getHours();
  if (h < 10) return "breakfast";
  if (h < 14) return "lunch";
  if (h < 19) return "dinner";
  return "snack";
}

export default function Scan() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<Mode>("choose");
  const [mealType, setMealType] = useState<MealType>(getMealTypeByHour());
  const [foodResult, setFoodResult] = useState<FoodResult | null>(null);
  const [portionGrams, setPortionGrams] = useState("100");
  const [editName, setEditName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showMealPicker, setShowMealPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrRef = useRef<unknown>(null);

  const analyzeMutation = trpc.food.analyzePhoto.useMutation();
  const { data: searchResults, isFetching: isSearching } = trpc.food.searchFood.useQuery(
    { query: searchQuery },
    { enabled: searchQuery.length >= 2 }
  );
  const { data: barcodeResult, isFetching: isBarcodeLoading } = trpc.food.lookupBarcode.useQuery(
    { barcode: barcodeInput },
    { enabled: barcodeInput.length >= 8 }
  );
  const addEntryMutation = trpc.diary.addEntry.useMutation({
    onSuccess: () => {
      toast.success("Aggiunto al diario!");
      navigate("/diary");
    },
    onError: () => toast.error("Errore nell'aggiunta"),
  });

  // Calcolo macro per la porzione corrente
  const portion = parseFloat(portionGrams) || 100;
  const calories = foodResult ? Math.round((foodResult.caloriesPer100g * portion) / 100) : 0;
  const protein = foodResult ? Math.round((foodResult.proteinPer100g * portion) / 100 * 10) / 10 : 0;
  const carbs = foodResult ? Math.round((foodResult.carbsPer100g * portion) / 100 * 10) / 10 : 0;
  const fat = foodResult ? Math.round((foodResult.fatPer100g * portion) / 100 * 10) / 10 : 0;

  // Barcode scanner con html5-qrcode
  useEffect(() => {
    if (mode !== "barcode") return;
    let scanner: unknown = null;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        scanner = new Html5Qrcode("barcode-reader");
        html5QrRef.current = scanner;
        await (scanner as { start: (constraints: unknown, config: unknown, onSuccess: (code: string) => void, onError: () => void) => Promise<void> }).start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText: string) => {
            setBarcodeInput(decodedText);
            stopScanner();
          },
          () => {}
        );
      } catch (e) {
        console.error("Scanner error:", e);
      }
    };

    const stopScanner = async () => {
      if (html5QrRef.current) {
        try {
          await (html5QrRef.current as { stop: () => Promise<void>; clear: () => void }).stop();
          (html5QrRef.current as { stop: () => Promise<void>; clear: () => void }).clear();
        } catch {}
        html5QrRef.current = null;
      }
    };

    startScanner();
    return () => { stopScanner(); };
  }, [mode]);

  // Quando arriva risultato barcode
  useEffect(() => {
    if (barcodeResult && barcodeInput) {
      setFoodResult({
        foodName: barcodeResult.foodName,
        caloriesPer100g: barcodeResult.caloriesPer100g,
        proteinPer100g: barcodeResult.proteinPer100g,
        carbsPer100g: barcodeResult.carbsPer100g,
        fatPer100g: barcodeResult.fatPer100g,
        typicalPortionGrams: barcodeResult.typicalPortionGrams,
        imageUrl: barcodeResult.imageUrl,
        brand: barcodeResult.brand,
      });
      setPortionGrams(String(barcodeResult.typicalPortionGrams || 100));
      setEditName(barcodeResult.foodName);
      setMode("confirm");
    }
  }, [barcodeResult, barcodeInput]);

  const handlePhotoCapture = useCallback(async (file: File) => {
    setIsAnalyzing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(",")[1];
        const preview = e.target?.result as string;
        setCapturedImage(preview);
        setMode("confirm");

        try {
          const result = await analyzeMutation.mutateAsync({
            imageBase64: base64,
            mimeType: file.type,
          });
          setFoodResult(result);
          setPortionGrams(String(result.estimatedPortionGrams || 100));
          setEditName(result.foodName);
        } catch {
          toast.error("Impossibile analizzare l'immagine. Prova con la ricerca manuale.");
          setMode("choose");
        } finally {
          setIsAnalyzing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setIsAnalyzing(false);
      toast.error("Errore nella lettura dell'immagine");
    }
  }, [analyzeMutation]);

  const handleAddToDiary = () => {
    if (!foodResult) return;
    const today = new Date().toISOString().split("T")[0];
    addEntryMutation.mutate({
      logDate: today,
      mealType,
      foodName: editName || foodResult.foodName,
      portionGrams: portion,
      caloriesPer100g: foodResult.caloriesPer100g,
      proteinPer100g: foodResult.proteinPer100g,
      carbsPer100g: foodResult.carbsPer100g,
      fatPer100g: foodResult.fatPer100g,
      source: capturedImage ? "photo_ai" : barcodeInput ? "barcode" : "manual_search",
      imageUrl: foodResult.imageUrl ?? undefined,
      barcode: barcodeInput || undefined,
    });
  };

  const reset = () => {
    setMode("choose");
    setFoodResult(null);
    setCapturedImage(null);
    setSearchQuery("");
    setBarcodeInput("");
    setPortionGrams("100");
    setEditName("");
    setIsAnalyzing(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 pb-nav">
        <Camera size={48} className="text-primary" />
        <p className="text-center text-muted-foreground">Accedi per usare lo scanner</p>
        <Button onClick={() => (window.location.href = getLoginUrl())}>Accedi</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-nav">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-[480px] mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-serif font-bold">Aggiungi cibo</h1>
          {mode !== "choose" && (
            <button onClick={reset} className="p-2 rounded-full hover:bg-muted transition-colors">
              <X size={20} className="text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Meal type selector */}
      <div className="max-w-[480px] mx-auto px-4 py-3">
        <div className="relative">
          <button
            onClick={() => setShowMealPicker(!showMealPicker)}
            className="w-full flex items-center justify-between px-4 h-11 rounded-xl bg-secondary text-secondary-foreground text-sm font-medium press-effect"
          >
            <span>{mealLabels[mealType]}</span>
            <ChevronDown size={16} className={cn("transition-transform", showMealPicker && "rotate-180")} />
          </button>
          {showMealPicker && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
              {(Object.entries(mealLabels) as [MealType, string][]).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => { setMealType(key); setShowMealPicker(false); }}
                  className={cn(
                    "w-full px-4 py-3 text-left text-sm hover:bg-muted transition-colors",
                    mealType === key && "text-primary font-semibold"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mode: choose */}
      {mode === "choose" && (
        <div className="max-w-[480px] mx-auto px-4 space-y-3">
          {/* Camera button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center gap-4 p-5 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/25 press-effect"
          >
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <Camera size={24} />
            </div>
            <div className="text-left">
              <div className="font-semibold text-base">Scatta una foto</div>
              <div className="text-primary-foreground/70 text-sm">Riconoscimento AI automatico</div>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handlePhotoCapture(file);
            }}
          />

          {/* Search button */}
          <button
            onClick={() => setMode("search")}
            className="w-full flex items-center gap-4 p-5 rounded-2xl bg-card border border-border shadow-sm press-effect hover:border-primary/30 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
              <Search size={22} className="text-primary" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm text-foreground">Cerca manualmente</div>
              <div className="text-muted-foreground text-xs">Digita il nome del cibo</div>
            </div>
          </button>

          {/* Barcode button */}
          <button
            onClick={() => setMode("barcode")}
            className="w-full flex items-center gap-4 p-5 rounded-2xl bg-card border border-border shadow-sm press-effect hover:border-primary/30 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
              <Barcode size={22} className="text-primary" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm text-foreground">Scanner barcode</div>
              <div className="text-muted-foreground text-xs">Cibi confezionati</div>
            </div>
          </button>
        </div>
      )}

      {/* Mode: search */}
      {mode === "search" && (
        <div className="max-w-[480px] mx-auto px-4 space-y-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Es: pollo alla griglia, pasta al pomodoro..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-11 rounded-xl"
            />
          </div>
          {isSearching && (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={24} className="animate-spin text-primary" />
            </div>
          )}
          {searchResults && searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((item: FoodResult & { typicalPortionGrams: number }, i: number) => (
                <button
                  key={i}
                  onClick={() => {
                    setFoodResult(item);
                    setPortionGrams(String(item.typicalPortionGrams || 100));
                    setEditName(item.foodName);
                    setMode("confirm");
                  }}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-card border border-border hover:border-primary/40 transition-all press-effect"
                >
                  <div className="text-left">
                    <div className="text-sm font-medium">{item.foodName}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {Math.round(item.caloriesPer100g)} kcal · P: {Math.round(item.proteinPer100g)}g · C: {Math.round(item.carbsPer100g)}g · G: {Math.round(item.fatPer100g)}g
                    </div>
                  </div>
                  <Plus size={18} className="text-primary flex-shrink-0 ml-2" />
                </button>
              ))}
            </div>
          )}
          {searchQuery.length >= 2 && !isSearching && searchResults?.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Nessun risultato trovato
            </div>
          )}
        </div>
      )}

      {/* Mode: barcode */}
      {mode === "barcode" && (
        <div className="max-w-[480px] mx-auto px-4 space-y-4">
          <div className="rounded-2xl overflow-hidden bg-black aspect-video relative">
            <div id="barcode-reader" className="w-full h-full" ref={scannerRef} />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-64 h-32 border-2 border-white/60 rounded-lg" />
            </div>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Inquadra il barcode del prodotto
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Oppure inserisci il codice manualmente"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              className="h-11 rounded-xl"
            />
            {isBarcodeLoading && <Loader2 size={20} className="animate-spin text-primary self-center" />}
          </div>
          {barcodeInput && !barcodeResult && !isBarcodeLoading && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle size={16} />
              Prodotto non trovato nel database
            </div>
          )}
        </div>
      )}

      {/* Mode: confirm (photo analyzing) */}
      {mode === "confirm" && isAnalyzing && (
        <div className="max-w-[480px] mx-auto px-4 flex flex-col items-center gap-4 pt-8">
          {capturedImage && (
            <img src={capturedImage} alt="Cibo" className="w-full rounded-2xl object-cover max-h-48" />
          )}
          <div className="flex flex-col items-center gap-3">
            <Loader2 size={32} className="animate-spin text-primary" />
            <p className="text-sm font-medium text-foreground">Analisi AI in corso...</p>
            <p className="text-xs text-muted-foreground text-center">
              L'intelligenza artificiale sta riconoscendo il cibo e calcolando i valori nutrizionali
            </p>
          </div>
        </div>
      )}

      {/* Mode: confirm (result ready) */}
      {mode === "confirm" && !isAnalyzing && foodResult && (
        <div className="max-w-[480px] mx-auto px-4 space-y-4">
          {capturedImage && (
            <img src={capturedImage} alt="Cibo" className="w-full rounded-2xl object-cover max-h-40" />
          )}

          {/* Food name editable */}
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Edit2 size={14} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Nome alimento</span>
              </div>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-11 rounded-xl font-medium"
              />
              {foodResult.confidence && (
                <div className={cn(
                  "text-xs px-2 py-1 rounded-full inline-flex items-center gap-1",
                  foodResult.confidence === "high" ? "bg-green-50 text-green-700" :
                  foodResult.confidence === "medium" ? "bg-yellow-50 text-yellow-700" :
                  "bg-red-50 text-red-700"
                )}>
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    foodResult.confidence === "high" ? "bg-green-500" :
                    foodResult.confidence === "medium" ? "bg-yellow-500" : "bg-red-500"
                  )} />
                  Confidenza {foodResult.confidence === "high" ? "alta" : foodResult.confidence === "medium" ? "media" : "bassa"}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Portion */}
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Porzione</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={portionGrams}
                    onChange={(e) => setPortionGrams(e.target.value)}
                    className="w-20 h-9 text-center rounded-lg text-sm"
                  />
                  <span className="text-sm text-muted-foreground">g</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Macro summary */}
          <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-transparent">
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl font-bold text-foreground">{calories}</span>
                <span className="text-sm text-muted-foreground">kcal</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white/60 rounded-xl p-2">
                  <div className="text-sm font-bold" style={{ color: "var(--protein-color)" }}>{protein}g</div>
                  <div className="text-[10px] text-muted-foreground">Proteine</div>
                </div>
                <div className="bg-white/60 rounded-xl p-2">
                  <div className="text-sm font-bold" style={{ color: "var(--carbs-color)" }}>{carbs}g</div>
                  <div className="text-[10px] text-muted-foreground">Carboidrati</div>
                </div>
                <div className="bg-white/60 rounded-xl p-2">
                  <div className="text-sm font-bold" style={{ color: "var(--fat-color)" }}>{fat}g</div>
                  <div className="text-[10px] text-muted-foreground">Grassi</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Button
            className="w-full h-12 text-base font-semibold rounded-xl shadow-md shadow-primary/20"
            onClick={handleAddToDiary}
            disabled={addEntryMutation.isPending}
          >
            {addEntryMutation.isPending ? (
              <Loader2 size={18} className="animate-spin mr-2" />
            ) : (
              <Check size={18} className="mr-2" />
            )}
            Aggiungi al diario
          </Button>
        </div>
      )}
    </div>
  );
}
