import { NextResponse } from "next/server";
import { clearSessionCookie, hashSessionToken } from "@/lib/db-server";
import { query } from "@/lib/db";

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
    try {
      await query("DELETE FROM app_sessions WHERE token_hash = $1", [hashSessionToken(token)]);
    } catch (error) {
      // Ignore or log error
    }
  }

  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response, req);
  return response;
}
