import { NextResponse } from "next/server";
import { clearSessionCookie, createServerSupabaseClient, hashSessionToken } from "@/lib/supabase-server";

function readSessionCookie(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const value = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("app_session="));

  if (!value) {
    return null;
  }

  return decodeURIComponent(value.split("=").slice(1).join("="));
}

export async function POST(req: Request) {
  const token = readSessionCookie(req);
  if (token) {
    const client = createServerSupabaseClient();
    await client.from("app_sessions").delete().eq("token_hash", hashSessionToken(token));
  }

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response, req);
  return response;
}
