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

  try {
    const res = await query(
      "SELECT code, bank_name FROM accounts WHERE user_id = $1 ORDER BY code ASC",
      [user.id]
    );
    const data = res.rows;

    if (data.length > 0) {
      return NextResponse.json({ data });
    }

    const starterAccounts = [
      [user.id, "N", "Account N"],
      [user.id, "B", "Account B"],
      [user.id, "C", "Account C"]
    ];

    const created: any[] = [];
    for (const account of starterAccounts) {
      const insertRes = await query(
        "INSERT INTO accounts (user_id, code, bank_name) VALUES ($1, $2, $3) RETURNING code, bank_name",
        account
      );
      if (insertRes.rows[0]) {
        created.push(insertRes.rows[0]);
      }
    }
    // Sort created by code ascending
    created.sort((a, b) => a.code.localeCompare(b.code));

    return NextResponse.json({ data: created });
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
  const code = String(body.code ?? "").trim().toUpperCase();
  const bankName = String(body.bank_name ?? "").trim();

  try {
    const res = await query(
      "INSERT INTO accounts (user_id, code, bank_name) VALUES ($1, $2, $3) RETURNING code, bank_name",
      [user.id, code, bankName]
    );
    const data = res.rows[0];
    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
