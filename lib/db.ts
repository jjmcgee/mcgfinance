import { Pool, types } from "pg";

// Configure pg to automatically parse numeric columns (OID 1700) to JavaScript floats
// instead of strings, to match original Supabase JS client behavior.
types.setTypeParser(1700, (val) => parseFloat(val));

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("Missing environment variable: DATABASE_URL");
    }
    pool = new Pool({
      connectionString,
    });
  }
  return pool;
}

export async function query(text: string, params?: any[]) {
  return getPool().query(text, params);
}
