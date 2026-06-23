import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/db-server";
import { query } from "@/lib/db";

export async function PUT(req: Request, { params }: { params: { code: string } }) {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) {
    return auth.response;
  }

  const { user } = auth;
  const body = await req.json();

  try {
    const res = await query(
      "UPDATE accounts SET bank_name = $1 WHERE code = $2 AND user_id = $3 RETURNING code, bank_name",
      [body.bank_name, params.code, user.id]
    );
    const data = res.rows[0];

    if (!data) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: { code: string } }) {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) {
    return auth.response;
  }

  const { user } = auth;

  try {
    const res = await query(
      "DELETE FROM accounts WHERE code = $1 AND user_id = $2 RETURNING code",
      [params.code, user.id]
    );
    const data = res.rows[0];

    if (!data) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
