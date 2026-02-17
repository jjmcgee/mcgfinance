import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/supabase-server";

export async function GET(req: Request) {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) {
    return auth.response;
  }

  const { user } = auth;
  return NextResponse.json({
    data: {
      email: user.email,
      display_name: user.display_name
    }
  });
}

export async function PUT(req: Request) {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) {
    return auth.response;
  }

  const { client, user } = auth;
  const body = await req.json();
  const displayName = body.display_name === null ? null : String(body.display_name ?? "").trim() || null;

  const { data, error } = await client
    .from("app_users")
    .update({
      display_name: displayName
    })
    .eq("id", user.id)
    .select("email, display_name")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}
