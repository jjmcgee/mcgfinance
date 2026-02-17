import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  createUserSession,
  hashPassword,
  setSessionCookie
} from "@/lib/supabase-server";

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

  const client = createServerSupabaseClient();
  const passwordHash = hashPassword(password);

  const { data, error } = await client
    .from("app_users")
    .insert({
      email,
      password_hash: passwordHash,
      display_name: displayName
    })
    .select("id,email,display_name")
    .single();

  if (error) {
    const message = error.code === "23505" ? "Email is already registered" : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const sessionToken = await createUserSession(client, data.id);
  const response = NextResponse.json({ data }, { status: 201 });
  setSessionCookie(response, req, sessionToken);
  return response;
}
