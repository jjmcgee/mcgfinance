import { NextResponse } from "next/server";
import {
  createUserSession,
  hashPassword,
  setSessionCookie
} from "@/lib/db-server";
import { query } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const displayName = String(body.display_name ?? "").trim() || null;

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const passwordHash = hashPassword(password);

  try {
    const res = await query(
      "INSERT INTO app_users (email, password_hash, display_name) VALUES ($1, $2, $3) RETURNING id, email, display_name",
      [email, passwordHash, displayName]
    );
    const data = res.rows[0];

    const sessionToken = await createUserSession(data.id);
    const response = NextResponse.json({ data }, { status: 201 });
    setSessionCookie(response, req, sessionToken);
    return response;
  } catch (error: any) {
    const message = error.code === "23505" ? "Email is already registered" : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
