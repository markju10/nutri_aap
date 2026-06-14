import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  float,
  date,
  json,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Profilo nutrizionale utente
export const userProfiles = mysqlTable("user_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  weight: float("weight"), // kg
  height: float("height"), // cm
  age: int("age"),
  gender: mysqlEnum("gender", ["male", "female"]),
  activityLevel: mysqlEnum("activityLevel", [
    "sedentary",
    "light",
    "moderate",
    "active",
    "very_active",
  ]),
  goal: mysqlEnum("goal", ["lose_weight", "gain_muscle", "maintain"]),
  // Macro target giornalieri (calcolati o personalizzati)
  targetCalories: int("targetCalories"),
  targetProtein: int("targetProtein"), // grammi
  targetCarbs: int("targetCarbs"), // grammi
  targetFat: int("targetFat"), // grammi
  // Preferenze alimentari per ricette
  dietaryPreferences: text("dietaryPreferences"), // JSON string: vegetariano, vegano, senza glutine, ecc.
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

// Voci del diario alimentare
export const mealLogs = mysqlTable("meal_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  logDate: date("logDate").notNull(), // YYYY-MM-DD
  mealType: mysqlEnum("mealType", ["breakfast", "lunch", "dinner", "snack"]).notNull(),
  foodName: varchar("foodName", { length: 255 }).notNull(),
  portionGrams: float("portionGrams").notNull(),
  calories: float("calories").notNull(),
  protein: float("protein").notNull(), // grammi
  carbs: float("carbs").notNull(), // grammi
  fat: float("fat").notNull(), // grammi
  // Dati per 100g (per ricalcolo)
  caloriesPer100g: float("caloriesPer100g"),
  proteinPer100g: float("proteinPer100g"),
  carbsPer100g: float("carbsPer100g"),
  fatPer100g: float("fatPer100g"),
  // Fonte: foto AI, ricerca manuale, barcode
  source: mysqlEnum("source", ["photo_ai", "manual_search", "barcode"]).default("manual_search"),
  imageUrl: text("imageUrl"), // URL immagine se scattata foto
  barcode: varchar("barcode", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MealLog = typeof mealLogs.$inferSelect;
export type InsertMealLog = typeof mealLogs.$inferInsert;

// Ricette salvate generate dall'AI
export const savedRecipes = mysqlTable("saved_recipes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  ingredients: text("ingredients").notNull(), // JSON string
  instructions: text("instructions").notNull(),
  totalCalories: float("totalCalories").notNull(),
  totalProtein: float("totalProtein").notNull(),
  totalCarbs: float("totalCarbs").notNull(),
  totalFat: float("totalFat").notNull(),
  servings: int("servings").default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SavedRecipe = typeof savedRecipes.$inferSelect;
export type InsertSavedRecipe = typeof savedRecipes.$inferInsert;
