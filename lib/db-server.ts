import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { query } from "./db";

const sessionCookieName = "app_session";
const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;

export type AppUser = {
  id: string;
  email: string;
  display_name: string | null;
};

function readCookie(req: Request, name: string): string | null {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const value = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  if (!value) {
    return null;
  }

  return decodeURIComponent(value.split("=").slice(1).join("="));
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) {
    return false;
  }

  const candidate = scryptSync(password, salt, 64);
  const original = Buffer.from(hash, "hex");
  if (candidate.length !== original.length) {
    return false;
  }

  return timingSafeEqual(candidate, original);
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function shouldUseSecureCookies(req: Request): boolean {
  if (process.env.NODE_ENV !== "production") {
    return false;
  }

  const host = (req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "").toLowerCase();
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) {
    return false;
  }

  return true;
}

export function setSessionCookie(response: NextResponse, req: Request, token: string) {
  response.cookies.set({
    name: sessionCookieName,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: shouldUseSecureCookies(req),
    maxAge: sessionMaxAgeSeconds
  });
}

export function clearSessionCookie(response: NextResponse, req: Request) {
  response.cookies.set({
    name: sessionCookieName,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: shouldUseSecureCookies(req),
    maxAge: 0
  });
}

export async function createUserSession(userId: string) {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + sessionMaxAgeSeconds * 1000).toISOString();

  await query(
    "INSERT INTO app_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)",
    [userId, tokenHash, expiresAt]
  );

  return token;
}

export async function requireAuthenticatedUser(req: Request): Promise<
  | {
      user: AppUser;
      sessionTokenHash: string;
    }
  | {
      response: NextResponse;
    }
> {
  const token = readCookie(req, sessionCookieName);

  if (!token) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    };
  }

  const tokenHash = hashSessionToken(token);
  const userSessionRes = await query(
    `SELECT u.id, u.email, u.display_name, s.expires_at 
     FROM app_sessions s 
     JOIN app_users u ON s.user_id = u.id 
     WHERE s.token_hash = $1 LIMIT 1`,
    [tokenHash]
  );
  const userSession = userSessionRes.rows[0];

  if (!userSession) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    };
  }

  if (new Date(userSession.expires_at).getTime() <= Date.now()) {
    await query("DELETE FROM app_sessions WHERE token_hash = $1", [tokenHash]);
    return {
      response: NextResponse.json({ error: "Session expired" }, { status: 401 })
    };
  }

  const user: AppUser = {
    id: userSession.id,
    email: userSession.email,
    display_name: userSession.display_name
  };

  return { user, sessionTokenHash: tokenHash };
}
