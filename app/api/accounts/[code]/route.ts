import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/supabase-server";

export async function PUT(req: Request, { params }: { params: { code: string } }) {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) {
    return auth.response;
  }

  const { client, user } = auth;
  const body = await req.json();

  const { data, error } = await client
    .from("accounts")
    .update({
      bank_name: body.bank_name
    })
    .eq("code", params.code)
    .eq("user_id", user.id)
    .select("code, bank_name")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(req: Request, { params }: { params: { code: string } }) {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) {
    return auth.response;
  }

  const { client, user } = auth;
  const { data, error } = await client
    .from("accounts")
    .delete()
    .eq("code", params.code)
    .eq("user_id", user.id)
    .select("code")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  return NextResponse.json({ data });
}
