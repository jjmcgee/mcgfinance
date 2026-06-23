import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/db-server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: Request) {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) {
    return auth.response;
  }

  const { user } = auth;
  const { searchParams } = new URL(req.url);
  const monthId = searchParams.get("month_id");

  if (!monthId) {
    return NextResponse.json({ error: "month_id query param is required" }, { status: 400 });
  }

  try {
    const res = await query(
      "SELECT * FROM transfer_items WHERE user_id = $1 AND month_id = $2 ORDER BY created_at ASC",
      [user.id, monthId]
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

  try {
    const monthRes = await query(
      "SELECT id FROM month_summaries WHERE id = $1 AND user_id = $2 LIMIT 1",
      [body.month_id, user.id]
    );
    const month = monthRes.rows[0];

    if (!month) {
      return NextResponse.json({ error: "Month not found" }, { status: 404 });
    }

    const res = await query(
      `INSERT INTO transfer_items (user_id, month_id, to_account_code, amount, note)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [user.id, body.month_id, body.to_account_code, body.amount, body.note ?? null]
    );
    const data = res.rows[0];
    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
