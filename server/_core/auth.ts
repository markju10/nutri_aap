/**
 * Autenticazione indipendente: email + password + JWT
 * Sostituisce il sistema Manus OAuth per Railway
 */

import * as jose from "jose";
import * as bcrypt from "bcryptjs";
import { ENV } from "./env";
import { COOKIE_NAME, ONE_YEAR_MS } from "../../shared/const";
import type { Request, Response } from "express";
import { getSessionCookieOptions } from "./cookies";
import * as db from "../db";

const SALT_ROUNDS = 10;

// ── JWT helpers ──────────────────────────────────────────────────────────────

function getJwtSecret(): Uint8Array {
  return new TextEncoder().encode(ENV.cookieSecret || "nutriai-secret-change-me");
}

export async function createSessionToken(userId: number, openId: string): Promise<string> {
  const secret = getJwtSecret();
  return await new jose.SignJWT({ sub: openId, userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1y")
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<{ sub: string; userId: number } | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jose.jwtVerify(token, secret);
    return { sub: payload.sub as string, userId: payload.userId as number };
  } catch {
    return null;
  }
}

// ── Password helpers ──────────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ── Request authentication ────────────────────────────────────────────────────

export async function authenticateRequest(req: Request) {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload) return null;

    const user = await db.getUserByOpenId(payload.sub);
    return user ?? null;
  } catch {
    return null;
  }
}

// ── Express route handlers ────────────────────────────────────────────────────

export function registerAuthRoutes(app: import("express").Express) {
  // Registrazione
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const { email, password, name } = req.body as { email?: string; password?: string; name?: string };

    if (!email || !password) {
      res.status(400).json({ error: "Email e password obbligatorie" });
      return;
    }
    if (password.length < 6) {
      res.status(400).json({ error: "La password deve avere almeno 6 caratteri" });
      return;
    }

    try {
      // Controlla se esiste già
      const existing = await db.getUserByEmail(email);
      if (existing) {
        res.status(409).json({ error: "Email già registrata" });
        return;
      }

      const passwordHash = await hashPassword(password);
      const openId = `email_${email.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}`;

      await db.upsertUser({
        openId,
        name: name || email.split("@")[0],
        email,
        loginMethod: "email",
        passwordHash,
        lastSignedIn: new Date(),
      });

      const user = await db.getUserByOpenId(openId);
      if (!user) {
        res.status(500).json({ error: "Errore nella creazione dell'utente" });
        return;
      }

      const token = await createSessionToken(user.id, user.openId);
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
      console.error("[Auth] Register error:", err);
      res.status(500).json({ error: "Errore interno del server" });
    }
  });

  // Login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body as { email?: string; password?: string };

    if (!email || !password) {
      res.status(400).json({ error: "Email e password obbligatorie" });
      return;
    }

    try {
      const user = await db.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        res.status(401).json({ error: "Credenziali non valide" });
        return;
      }

      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        res.status(401).json({ error: "Credenziali non valide" });
        return;
      }

      const token = await createSessionToken(user.id, user.openId);
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
    } catch (err) {
      console.error("[Auth] Login error:", err);
      res.status(500).json({ error: "Errore interno del server" });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    res.json({ success: true });
  });
}
