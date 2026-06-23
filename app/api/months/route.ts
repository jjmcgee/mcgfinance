import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/db-server";
import { query } from "@/lib/db";

export async function GET(req: Request) {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) {
    return auth.response;
  }

  const { user } = auth;

  try {
    const res = await query(
      "SELECT * FROM month_summaries WHERE user_id = $1 ORDER BY created_at DESC",
      [user.id]
    );
    const data = res.rows;
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) {
    return auth.response;
  }

  const { user } = auth;
  const body = await req.json();

  let createdMonth;
  try {
    const res = await query(
      `INSERT INTO month_summaries (user_id, month_label, wage, float_amount)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [user.id, body.month_label, body.wage, body.float_amount]
    );
    createdMonth = res.rows[0];
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  try {
    const previousMonthRes = await query(
      `SELECT id FROM month_summaries
       WHERE user_id = $1 AND id <> $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [user.id, createdMonth.id]
    );
    const previousMonth = previousMonthRes.rows[0];

    if (previousMonth?.id) {
      const outgoingsRes = await query(
        "SELECT name, due_day, account_code, amount, is_recurring FROM expense_items WHERE month_id = $1",
        [previousMonth.id]
      );
      const previousOutgoings = outgoingsRes.rows;

      if (previousOutgoings.length > 0) {
        for (const item of previousOutgoings) {
          await query(
            `INSERT INTO expense_items (user_id, month_id, name, due_day, account_code, amount, is_recurring)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              user.id,
              createdMonth.id,
              item.name,
              item.due_day,
              item.account_code,
              item.amount,
              item.is_recurring
            ]
          );
        }
      }
    }

    return NextResponse.json({ data: createdMonth }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
