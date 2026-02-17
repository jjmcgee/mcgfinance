import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/supabase-server";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) {
    return auth.response;
  }

  const { client, user } = auth;
  const body = await req.json();

  const { data, error } = await client
    .from("expense_items")
    .update({
      name: body.name,
      due_day: body.due_day,
      account_code: body.account_code,
      amount: body.amount,
      is_recurring: body.is_recurring
    })
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) {
    return auth.response;
  }

  const { client, user } = auth;
  const { data, error } = await client
    .from("expense_items")
    .delete()
    .eq("id", params.id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (!data) {
    return NextResponse.json({ error: "Monthly outgoing not found" }, { status: 404 });
  }

  return NextResponse.json({ data });
}
