import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  createUserSession,
  setSessionCookie,
  verifyPassword
} from "@/lib/supabase-server";

export async function POST(req: Request) {
  const body = await req.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  const client = createServerSupabaseClient();
  const { data, error } = await client
    .from("app_users")
    .select("id,email,password_hash,display_name")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || !verifyPassword(password, data.password_hash)) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const sessionToken = await createUserSession(client, data.id);
  const response = NextResponse.json({
    data: {
      id: data.id,
      email: data.email,
      display_name: data.display_name
    }
  });
  setSessionCookie(response, req, sessionToken);
  return response;
}
