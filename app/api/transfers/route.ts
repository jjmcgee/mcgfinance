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
  const { searchParams } = new URL(req.url);
  const monthId = searchParams.get("month_id");

  if (!monthId) {
    return NextResponse.json({ error: "month_id query param is required" }, { status: 400 });
  }

  const { data, error } = await client
    .from("transfer_items")
    .select("*")
    .eq("user_id", user.id)
    .eq("month_id", monthId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) {
    return auth.response;
  }

  const { client, user } = auth;
  const body = await req.json();

  const { data: month, error: monthError } = await client
    .from("month_summaries")
    .select("id")
    .eq("id", body.month_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (monthError) {
    return NextResponse.json({ error: monthError.message }, { status: 400 });
  }

  if (!month) {
    return NextResponse.json({ error: "Month not found" }, { status: 404 });
  }

  const { data, error } = await client
    .from("transfer_items")
    .insert({
      user_id: user.id,
      month_id: body.month_id,
      to_account_code: body.to_account_code,
      amount: body.amount,
      note: body.note ?? null
    })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
