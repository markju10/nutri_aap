import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock context ─────────────────────────────────────────────────────────────

function createAuthContext(userId = 1): TrpcContext {
  return {
    user: {
      id: userId,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

// ─── Auth tests ───────────────────────────────────────────────────────────────

describe("auth.logout", () => {
  it("returns success and clears cookie", async () => {
    const cleared: string[] = [];
    const ctx: TrpcContext = {
      ...createAuthContext(),
      res: {
        clearCookie: (name: string) => { cleared.push(name); },
      } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result.success).toBe(true);
    expect(cleared.length).toBe(1);
  });
});

// ─── Profile calcTargets tests ────────────────────────────────────────────────

describe("profile.calcTargets", () => {
  const caller = appRouter.createCaller(createAuthContext());

  it("calculates TDEE correctly for male moderate activity", async () => {
    const result = await caller.profile.calcTargets({
      weight: 80,
      height: 180,
      age: 30,
      gender: "male",
      activityLevel: "moderate",
      goal: "maintain",
    });
    // BMR = 10*80 + 6.25*180 - 5*30 + 5 = 800+1125-150+5 = 1780
    // TDEE = 1780 * 1.55 = 2759
    expect(result.tdee).toBeGreaterThan(2500);
    expect(result.tdee).toBeLessThan(3000);
    expect(result.adjustedCalories).toBe(result.tdee); // maintain = no adjustment
  });

  it("reduces calories for weight loss goal", async () => {
    const maintain = await caller.profile.calcTargets({
      weight: 70, height: 170, age: 25, gender: "female",
      activityLevel: "light", goal: "maintain",
    });
    const lose = await caller.profile.calcTargets({
      weight: 70, height: 170, age: 25, gender: "female",
      activityLevel: "light", goal: "lose_weight",
    });
    expect(lose.adjustedCalories).toBeLessThan(maintain.adjustedCalories);
    expect(lose.adjustedCalories).toBeCloseTo(maintain.tdee * 0.8, -1);
  });

  it("increases calories for muscle gain goal", async () => {
    const maintain = await caller.profile.calcTargets({
      weight: 75, height: 175, age: 28, gender: "male",
      activityLevel: "active", goal: "maintain",
    });
    const gain = await caller.profile.calcTargets({
      weight: 75, height: 175, age: 28, gender: "male",
      activityLevel: "active", goal: "gain_muscle",
    });
    expect(gain.adjustedCalories).toBeGreaterThan(maintain.adjustedCalories);
  });

  it("returns positive macro values", async () => {
    const result = await caller.profile.calcTargets({
      weight: 65, height: 165, age: 35, gender: "female",
      activityLevel: "moderate", goal: "lose_weight",
    });
    expect(result.protein).toBeGreaterThan(0);
    expect(result.carbs).toBeGreaterThan(0);
    expect(result.fat).toBeGreaterThan(0);
  });

  it("macro calories sum approximates total calories", async () => {
    const result = await caller.profile.calcTargets({
      weight: 80, height: 180, age: 30, gender: "male",
      activityLevel: "moderate", goal: "maintain",
    });
    // protein*4 + carbs*4 + fat*9 ≈ adjustedCalories (±10%)
    const macroCalories = result.protein * 4 + result.carbs * 4 + result.fat * 9;
    const tolerance = result.adjustedCalories * 0.12;
    expect(Math.abs(macroCalories - result.adjustedCalories)).toBeLessThan(tolerance);
  });
});

// ─── Auth.me tests ────────────────────────────────────────────────────────────

describe("auth.me", () => {
  it("returns authenticated user", async () => {
    const caller = appRouter.createCaller(createAuthContext(42));
    const user = await caller.auth.me();
    expect(user?.id).toBe(42);
    expect(user?.email).toBe("test@example.com");
  });

  it("returns null for unauthenticated context", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: () => {} } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).toBeNull();
  });
});
