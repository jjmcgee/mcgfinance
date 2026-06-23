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
      `UPDATE month_summaries
       SET month_label = $1, wage = $2, float_amount = $3
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [body.month_label, body.wage, body.float_amount, params.id, user.id]
    );
    const data = res.rows[0];

    if (!data) {
      return NextResponse.json({ error: "Month not found" }, { status: 404 });
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
      "DELETE FROM month_summaries WHERE id = $1 AND user_id = $2 RETURNING id",
      [params.id, user.id]
    );
    const data = res.rows[0];

    if (!data) {
      return NextResponse.json({ error: "Month not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
