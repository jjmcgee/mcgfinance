import { NextResponse } from "next/server";
import {
  createUserSession,
  setSessionCookie,
  verifyPassword
} from "@/lib/db-server";
import { query } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  try {
    const res = await query(
      "SELECT id, email, password_hash, display_name FROM app_users WHERE lower(email) = lower($1) LIMIT 1",
      [email]
    );
    const data = res.rows[0];

    if (!data || !verifyPassword(password, data.password_hash)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const sessionToken = await createUserSession(data.id);
    const response = NextResponse.json({
      data: {
        id: data.id,
        email: data.email,
        display_name: data.display_name
      }
    });
    setSessionCookie(response, req, sessionToken);
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
