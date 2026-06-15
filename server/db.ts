import { eq, and, gte, lte, sql as sqlExpr, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, mealLogs, savedRecipes, userProfiles, users } from "../drizzle/schema";
import type { InsertMealLog, InsertSavedRecipe, InsertUserProfile } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ───────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};

  const textFields = ["name", "email", "loginMethod", "passwordHash"] as const;
  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0] ?? undefined;
}

// ─── User Profiles ────────────────────────────────────────────────────────────

export async function getUserProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  return result[0] ?? null;
}

export async function upsertUserProfile(profile: InsertUserProfile) {
  const db = await getDb();
  if (!db) return;
  const updateSet: Partial<InsertUserProfile> = { ...profile };
  delete (updateSet as Record<string, unknown>).userId;
  await db
    .insert(userProfiles)
    .values(profile)
    .onDuplicateKeyUpdate({ set: updateSet });
}

// ─── Meal Logs ────────────────────────────────────────────────────────────────

export async function getMealLogsByDate(userId: number, date: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(mealLogs)
    .where(and(eq(mealLogs.userId, userId), sqlExpr`DATE(${mealLogs.logDate}) = ${date}`))
    .orderBy(mealLogs.createdAt);
}

export async function getMealLogsByDateRange(userId: number, startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(mealLogs)
    .where(
      and(
        eq(mealLogs.userId, userId),
        sqlExpr`DATE(${mealLogs.logDate}) >= ${startDate}`,
        sqlExpr`DATE(${mealLogs.logDate}) <= ${endDate}`
      )
    )
    .orderBy(mealLogs.logDate, mealLogs.createdAt);
}

export async function addMealLog(log: InsertMealLog) {
  const db = await getDb();
  if (!db) return;
  await db.insert(mealLogs).values(log);
}

export async function updateMealLog(
  id: number,
  userId: number,
  data: Partial<InsertMealLog>
) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(mealLogs)
    .set(data)
    .where(and(eq(mealLogs.id, id), eq(mealLogs.userId, userId)));
}

export async function deleteMealLog(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(mealLogs)
    .where(and(eq(mealLogs.id, id), eq(mealLogs.userId, userId)));
}

// ─── Saved Recipes ────────────────────────────────────────────────────────────

export async function getSavedRecipes(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(savedRecipes)
    .where(eq(savedRecipes.userId, userId))
    .orderBy(desc(savedRecipes.createdAt));
}

export async function saveRecipe(recipe: InsertSavedRecipe) {
  const db = await getDb();
  if (!db) return;
  const result = await db.insert(savedRecipes).values(recipe);
  return result;
}

export async function deleteRecipe(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(savedRecipes)
    .where(and(eq(savedRecipes.id, id), eq(savedRecipes.userId, userId)));
}
