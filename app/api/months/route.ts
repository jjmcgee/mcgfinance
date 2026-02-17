import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/supabase-server";

export async function GET(req: Request) {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) {
    return auth.response;
  }

  const { client, user } = auth;
  const { data, error } = await client
    .from("month_summaries")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

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

  const { data: createdMonth, error: monthError } = await client
    .from("month_summaries")
    .insert({
      user_id: user.id,
      month_label: body.month_label,
      wage: body.wage,
      float_amount: body.float_amount
    })
    .select("*")
    .single();

  if (monthError) {
    return NextResponse.json({ error: monthError.message }, { status: 400 });
  }

  const { data: previousMonth, error: previousMonthError } = await client
    .from("month_summaries")
    .select("id")
    .eq("user_id", user.id)
    .neq("id", createdMonth.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (previousMonthError) {
    return NextResponse.json({ error: previousMonthError.message }, { status: 500 });
  }

  if (previousMonth?.id) {
    const { data: previousOutgoings, error: previousOutgoingsError } = await client
      .from("expense_items")
      .select("name,due_day,account_code,amount,is_recurring")
      .eq("month_id", previousMonth.id);

    if (previousOutgoingsError) {
      return NextResponse.json({ error: previousOutgoingsError.message }, { status: 500 });
    }

    if (previousOutgoings.length > 0) {
      const rowsToInsert = previousOutgoings.map((item) => ({
        user_id: user.id,
        month_id: createdMonth.id,
        name: item.name,
        due_day: item.due_day,
        account_code: item.account_code,
        amount: item.amount,
        is_recurring: item.is_recurring
      }));

      const { error: copyError } = await client.from("expense_items").insert(rowsToInsert);

      if (copyError) {
        return NextResponse.json({ error: copyError.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ data: createdMonth }, { status: 201 });
}
