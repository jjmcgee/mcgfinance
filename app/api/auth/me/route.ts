import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/db-server";
import { query } from "@/lib/db";

export async function GET(req: Request) {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) {
    return auth.response;
  }

  const { user } = auth;
  return NextResponse.json({
    data: {
      email: user.email,
      display_name: user.display_name
    }
  });
}

export async function PUT(req: Request) {
  const auth = await requireAuthenticatedUser(req);
  if ("response" in auth) {
    return auth.response;
  }

  const { user } = auth;
  const body = await req.json();
  const displayName = body.display_name === null ? null : String(body.display_name ?? "").trim() || null;

  try {
    const res = await query(
      "UPDATE app_users SET display_name = $1 WHERE id = $2 RETURNING email, display_name",
      [displayName, user.id]
    );
    const data = res.rows[0];

    if (!data) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
