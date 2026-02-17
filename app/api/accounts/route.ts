import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) {
    return auth.response;
  }

  const { client, user } = auth;
  const { data, error } = await client
    .from("accounts")
    .select("code, bank_name")
    .eq("user_id", user.id)
    .order("code", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (data.length > 0) {
    return NextResponse.json({ data });
  }

  const starterAccounts = [
    { user_id: user.id, code: "N", bank_name: "Account N" },
    { user_id: user.id, code: "B", bank_name: "Account B" },
    { user_id: user.id, code: "C", bank_name: "Account C" }
  ];

  const { data: created, error: createError } = await client
    .from("accounts")
    .insert(starterAccounts)
    .select("code, bank_name")
    .order("code", { ascending: true });

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  return NextResponse.json({ data: created });
}

export async function POST(req: Request) {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) {
    return auth.response;
  }

  const { client, user } = auth;
  const body = await req.json();

  const { data, error } = await client
    .from("accounts")
    .insert({
      user_id: user.id,
      code: String(body.code ?? "").trim().toUpperCase(),
      bank_name: String(body.bank_name ?? "").trim()
    })
    .select("code, bank_name")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
