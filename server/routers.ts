import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import {
  getUserProfile,
  upsertUserProfile,
  getMealLogsByDate,
  getMealLogsByDateRange,
  addMealLog,
  updateMealLog,
  deleteMealLog,
  getSavedRecipes,
  saveRecipe,
  deleteRecipe,
} from "./db";
import { storagePut } from "./storage";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calcTDEE(
  weight: number,
  height: number,
  age: number,
  gender: "male" | "female",
  activityLevel: string
): number {
  // Mifflin-St Jeor
  const bmr =
    gender === "male"
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;

  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  return Math.round(bmr * (multipliers[activityLevel] ?? 1.55));
}

function calcMacros(
  calories: number,
  goal: "lose_weight" | "gain_muscle" | "maintain"
): { protein: number; carbs: number; fat: number; adjustedCalories: number } {
  let adjustedCalories = calories;
  if (goal === "lose_weight") adjustedCalories = Math.round(calories * 0.8);
  if (goal === "gain_muscle") adjustedCalories = Math.round(calories * 1.1);

  // Distribuzione macro per obiettivo
  const ratios = {
    lose_weight: { protein: 0.35, carbs: 0.4, fat: 0.25 },
    gain_muscle: { protein: 0.3, carbs: 0.45, fat: 0.25 },
    maintain: { protein: 0.25, carbs: 0.5, fat: 0.25 },
  };
  const r = ratios[goal];
  return {
    adjustedCalories,
    protein: Math.round((adjustedCalories * r.protein) / 4),
    carbs: Math.round((adjustedCalories * r.carbs) / 4),
    fat: Math.round((adjustedCalories * r.fat) / 9),
  };
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Profile ──────────────────────────────────────────────────────────────
  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return getUserProfile(ctx.user.id);
    }),

    save: protectedProcedure
      .input(
        z.object({
          weight: z.number().min(20).max(300).optional(),
          height: z.number().min(50).max(300).optional(),
          age: z.number().min(10).max(120).optional(),
          gender: z.enum(["male", "female"]).optional(),
          activityLevel: z
            .enum(["sedentary", "light", "moderate", "active", "very_active"])
            .optional(),
          goal: z.enum(["lose_weight", "gain_muscle", "maintain"]).optional(),
          targetCalories: z.number().optional(),
          targetProtein: z.number().optional(),
          targetCarbs: z.number().optional(),
          targetFat: z.number().optional(),
          dietaryPreferences: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await upsertUserProfile({ userId: ctx.user.id, ...input });
        return { success: true };
      }),

    calcTargets: protectedProcedure
      .input(
        z.object({
          weight: z.number(),
          height: z.number(),
          age: z.number(),
          gender: z.enum(["male", "female"]),
          activityLevel: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
          goal: z.enum(["lose_weight", "gain_muscle", "maintain"]),
        })
      )
      .query(({ input }) => {
        const tdee = calcTDEE(
          input.weight,
          input.height,
          input.age,
          input.gender,
          input.activityLevel
        );
        const macros = calcMacros(tdee, input.goal);
        return { tdee, ...macros };
      }),
  }),

  // ─── Food Recognition ─────────────────────────────────────────────────────
  food: router({
    analyzePhoto: protectedProcedure
      .input(
        z.object({
          imageBase64: z.string(),
          mimeType: z.string().default("image/jpeg"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Upload immagine su storage
        const buffer = Buffer.from(input.imageBase64, "base64");
        const key = `food-photos/${ctx.user.id}-${Date.now()}.jpg`;
        const { url } = await storagePut(key, buffer, input.mimeType);

        // Analisi AI Vision
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `Sei un esperto nutrizionista. Analizza l'immagine del cibo e rispondi SOLO con JSON valido nel formato esatto indicato. Non aggiungere testo fuori dal JSON.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: input.imageBase64.startsWith("data:") ? input.imageBase64 : `data:${input.mimeType};base64,${input.imageBase64}`, detail: "high" },
                },
                {
                  type: "text",
                  text: `Analizza questo cibo e restituisci un JSON con questa struttura esatta:
{
  "foodName": "nome del cibo in italiano",
  "estimatedPortionGrams": numero (stima grammi porzione visibile),
  "caloriesPer100g": numero,
  "proteinPer100g": numero,
  "carbsPer100g": numero,
  "fatPer100g": numero,
  "confidence": "high" | "medium" | "low",
  "notes": "eventuali note sulla stima"
}`,
                },
              ],
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "food_analysis",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  foodName: { type: "string" },
                  estimatedPortionGrams: { type: "number" },
                  caloriesPer100g: { type: "number" },
                  proteinPer100g: { type: "number" },
                  carbsPer100g: { type: "number" },
                  fatPer100g: { type: "number" },
                  confidence: { type: "string", enum: ["high", "medium", "low"] },
                  notes: { type: "string" },
                },
                required: [
                  "foodName",
                  "estimatedPortionGrams",
                  "caloriesPer100g",
                  "proteinPer100g",
                  "carbsPer100g",
                  "fatPer100g",
                  "confidence",
                  "notes",
                ],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0]?.message?.content ?? "{}";
        const data = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));

        const portion = data.estimatedPortionGrams ?? 100;
        return {
          foodName: data.foodName,
          estimatedPortionGrams: portion,
          caloriesPer100g: data.caloriesPer100g,
          proteinPer100g: data.proteinPer100g,
          carbsPer100g: data.carbsPer100g,
          fatPer100g: data.fatPer100g,
          calories: Math.round((data.caloriesPer100g * portion) / 100),
          protein: Math.round((data.proteinPer100g * portion) / 100 * 10) / 10,
          carbs: Math.round((data.carbsPer100g * portion) / 100 * 10) / 10,
          fat: Math.round((data.fatPer100g * portion) / 100 * 10) / 10,
          confidence: data.confidence,
          notes: data.notes,
          imageUrl: url,
        };
      }),

    searchFood: protectedProcedure
      .input(z.object({ query: z.string().min(2) }))
      .query(async ({ input }) => {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "Sei un database nutrizionale. Rispondi SOLO con JSON valido.",
            },
            {
              role: "user",
              content: `Fornisci i valori nutrizionali per: "${input.query}". Restituisci un array JSON di massimo 5 alimenti corrispondenti:
[{
  "foodName": "nome preciso",
  "caloriesPer100g": numero,
  "proteinPer100g": numero,
  "carbsPer100g": numero,
  "fatPer100g": numero,
  "typicalPortionGrams": numero
}]`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "food_search",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  results: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        foodName: { type: "string" },
                        caloriesPer100g: { type: "number" },
                        proteinPer100g: { type: "number" },
                        carbsPer100g: { type: "number" },
                        fatPer100g: { type: "number" },
                        typicalPortionGrams: { type: "number" },
                      },
                      required: ["foodName", "caloriesPer100g", "proteinPer100g", "carbsPer100g", "fatPer100g", "typicalPortionGrams"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["results"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0]?.message?.content ?? '{"results":[]}';
        const data = JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
        return data.results ?? [];
      }),

    lookupBarcode: protectedProcedure
      .input(z.object({ barcode: z.string() }))
      .query(async ({ input }) => {
        // Open Food Facts API - gratuita e senza chiave
        const res = await fetch(
          `https://world.openfoodfacts.org/api/v0/product/${input.barcode}.json`
        );
        if (!res.ok) return null;
        const data = await res.json() as Record<string, unknown>;
        if (data.status !== 1) return null;

        const product = data.product as Record<string, unknown>;
        const nutriments = (product?.nutriments ?? {}) as Record<string, unknown>;

        return {
          foodName: (product?.product_name_it as string) || (product?.product_name as string) || "Prodotto sconosciuto",
          brand: product?.brands as string ?? "",
          caloriesPer100g: Number(nutriments?.["energy-kcal_100g"] ?? nutriments?.["energy-kcal"] ?? 0),
          proteinPer100g: Number(nutriments?.proteins_100g ?? 0),
          carbsPer100g: Number(nutriments?.carbohydrates_100g ?? 0),
          fatPer100g: Number(nutriments?.fat_100g ?? 0),
          typicalPortionGrams: Number(product?.serving_quantity ?? 100),
          imageUrl: product?.image_front_url as string ?? null,
        };
      }),
  }),

  // ─── Meal Diary ───────────────────────────────────────────────────────────
  diary: router({
    getDay: protectedProcedure
      .input(z.object({ date: z.string() })) // YYYY-MM-DD
      .query(async ({ ctx, input }) => {
        return getMealLogsByDate(ctx.user.id, input.date);
      }),

    addEntry: protectedProcedure
      .input(
        z.object({
          logDate: z.string(),
          mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
          foodName: z.string(),
          portionGrams: z.number().positive(),
          caloriesPer100g: z.number(),
          proteinPer100g: z.number(),
          carbsPer100g: z.number(),
          fatPer100g: z.number(),
          source: z.enum(["photo_ai", "manual_search", "barcode"]).default("manual_search"),
          imageUrl: z.string().optional(),
          barcode: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const factor = input.portionGrams / 100;
        await addMealLog({
          userId: ctx.user.id,
          logDate: input.logDate as unknown as Date,
          mealType: input.mealType,
          foodName: input.foodName,
          portionGrams: input.portionGrams,
          calories: Math.round(input.caloriesPer100g * factor),
          protein: Math.round(input.proteinPer100g * factor * 10) / 10,
          carbs: Math.round(input.carbsPer100g * factor * 10) / 10,
          fat: Math.round(input.fatPer100g * factor * 10) / 10,
          caloriesPer100g: input.caloriesPer100g,
          proteinPer100g: input.proteinPer100g,
          carbsPer100g: input.carbsPer100g,
          fatPer100g: input.fatPer100g,
          source: input.source,
          imageUrl: input.imageUrl,
          barcode: input.barcode,
        });
        return { success: true };
      }),

    updateEntry: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          portionGrams: z.number().positive().optional(),
          foodName: z.string().optional(),
          mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const existing = (await getMealLogsByDate(ctx.user.id, "")).find(
          () => true
        );
        const { id, ...data } = input;
        await updateMealLog(id, ctx.user.id, data);
        return { success: true };
      }),

    deleteEntry: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteMealLog(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // ─── History ──────────────────────────────────────────────────────────────
  history: router({
    getRange: protectedProcedure
      .input(z.object({ startDate: z.string(), endDate: z.string() }))
      .query(async ({ ctx, input }) => {
        const logs = await getMealLogsByDateRange(ctx.user.id, input.startDate, input.endDate);

        // Raggruppa per data
        const byDate: Record<
          string,
          { calories: number; protein: number; carbs: number; fat: number }
        > = {};
        for (const log of logs) {
          const d = typeof log.logDate === "string" ? log.logDate : (log.logDate as Date).toISOString().split("T")[0];
          if (!byDate[d]) byDate[d] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
          byDate[d].calories += log.calories;
          byDate[d].protein += log.protein;
          byDate[d].carbs += log.carbs;
          byDate[d].fat += log.fat;
        }

        return Object.entries(byDate)
          .map(([date, totals]) => ({
            date,
            calories: Math.round(totals.calories),
            protein: Math.round(totals.protein * 10) / 10,
            carbs: Math.round(totals.carbs * 10) / 10,
            fat: Math.round(totals.fat * 10) / 10,
          }))
          .sort((a, b) => a.date.localeCompare(b.date));
      }),
  }),

  // ─── Recipes ──────────────────────────────────────────────────────────────
  recipes: router({
    generate: protectedProcedure
      .input(
        z.object({
          remainingCalories: z.number(),
          remainingProtein: z.number(),
          remainingCarbs: z.number(),
          remainingFat: z.number(),
          mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
          preferences: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content:
                "Sei uno chef nutrizionista italiano. Crei ricette bilanciate con grammature precise. Rispondi SOLO con JSON valido.",
            },
            {
              role: "user",
              content: `Crea una ricetta per ${input.mealType === "breakfast" ? "colazione" : input.mealType === "lunch" ? "pranzo" : input.mealType === "dinner" ? "cena" : "spuntino"} che rispetti questi macro rimanenti:
- Calorie: ~${input.remainingCalories} kcal
- Proteine: ~${input.remainingProtein}g
- Carboidrati: ~${input.remainingCarbs}g
- Grassi: ~${input.remainingFat}g
${input.preferences ? `Preferenze alimentari: ${input.preferences}` : ""}

Restituisci un JSON con questa struttura:
{
  "name": "nome ricetta",
  "description": "breve descrizione appetitosa",
  "ingredients": [{"name": "ingrediente", "grams": numero, "calories": numero, "protein": numero, "carbs": numero, "fat": numero}],
  "instructions": ["passo 1", "passo 2", ...],
  "totalCalories": numero,
  "totalProtein": numero,
  "totalCarbs": numero,
  "totalFat": numero,
  "prepTimeMinutes": numero,
  "servings": 1
}`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "recipe",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  description: { type: "string" },
                  ingredients: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        grams: { type: "number" },
                        calories: { type: "number" },
                        protein: { type: "number" },
                        carbs: { type: "number" },
                        fat: { type: "number" },
                      },
                      required: ["name", "grams", "calories", "protein", "carbs", "fat"],
                      additionalProperties: false,
                    },
                  },
                  instructions: { type: "array", items: { type: "string" } },
                  totalCalories: { type: "number" },
                  totalProtein: { type: "number" },
                  totalCarbs: { type: "number" },
                  totalFat: { type: "number" },
                  prepTimeMinutes: { type: "number" },
                  servings: { type: "number" },
                },
                required: [
                  "name",
                  "description",
                  "ingredients",
                  "instructions",
                  "totalCalories",
                  "totalProtein",
                  "totalCarbs",
                  "totalFat",
                  "prepTimeMinutes",
                  "servings",
                ],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0]?.message?.content ?? "{}";
        return JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
      }),

    getSaved: protectedProcedure.query(async ({ ctx }) => {
      return getSavedRecipes(ctx.user.id);
    }),

    save: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          description: z.string().optional(),
          ingredients: z.string(),
          instructions: z.string(),
          totalCalories: z.number(),
          totalProtein: z.number(),
          totalCarbs: z.number(),
          totalFat: z.number(),
          servings: z.number().default(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        await saveRecipe({ userId: ctx.user.id, ...input });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteRecipe(input.id, ctx.user.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
