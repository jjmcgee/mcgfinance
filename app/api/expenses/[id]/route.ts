import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/db-server";
import { query } from "@/lib/db";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) {
    return auth.response;
  }

  const { user } = auth;
  const body = await req.json();

  try {
    const res = await query(
      `UPDATE expense_items
       SET name = $1, due_day = $2, account_code = $3, amount = $4, is_recurring = $5
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [
        body.name,
        body.due_day,
        body.account_code,
        body.amount,
        body.is_recurring,
        params.id,
        user.id
      ]
    );
    const data = res.rows[0];

    if (!data) {
      return NextResponse.json({ error: "Monthly outgoing not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) {
    return auth.response;
  }

  const { user } = auth;

  try {
    const res = await query(
      "DELETE FROM expense_items WHERE id = $1 AND user_id = $2 RETURNING id",
      [params.id, user.id]
    );
    const data = res.rows[0];

    if (!data) {
      return NextResponse.json({ error: "Monthly outgoing not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
