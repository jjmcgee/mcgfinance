import { createHash, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function getSupabaseEnv(): { supabaseUrl: string; supabaseServiceRoleKey: string } {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      "Missing env vars. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
  }

  return { supabaseUrl, supabaseServiceRoleKey };
}

const sessionCookieName = "app_session";
const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;

export type AppUser = {
  id: string;
  email: string;
  display_name: string | null;
};

export function createServerSupabaseClient(): SupabaseClient {
  const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseEnv();
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

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

export async function createUserSession(client: SupabaseClient, userId: string) {
  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + sessionMaxAgeSeconds * 1000).toISOString();

  const { error } = await client.from("app_sessions").insert({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt
  });

  if (error) {
    throw new Error(error.message);
  }

  return token;
}

export async function requireAuthenticatedUser(req: Request): Promise<
  | {
      client: SupabaseClient;
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

  const client = createServerSupabaseClient();
  const tokenHash = hashSessionToken(token);
  const { data: session, error: sessionError } = await client
    .from("app_sessions")
    .select("user_id, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (sessionError || !session) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    };
  }

  if (new Date(session.expires_at).getTime() <= Date.now()) {
    await client.from("app_sessions").delete().eq("token_hash", tokenHash);
    return {
      response: NextResponse.json({ error: "Session expired" }, { status: 401 })
    };
  }

  const { data: user, error: userError } = await client
    .from("app_users")
    .select("id,email,display_name")
    .eq("id", session.user_id)
    .maybeSingle();

  if (userError || !user) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    };
  }

  return { client, user: user as AppUser, sessionTokenHash: tokenHash };
}
