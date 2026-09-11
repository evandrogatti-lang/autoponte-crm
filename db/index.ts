import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.ts";
import { assertServerSupabaseEnvironment } from "../lib/supabase-environment";

let client: ReturnType<typeof postgres> | undefined;
let database: ReturnType<typeof drizzle<typeof schema>> | undefined;

export function getDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL não configurada. Adicione-a ao .env.local e às variáveis da Vercel.");
  }
  if (!client) {
    assertServerSupabaseEnvironment({ requireDatabase: true });
    client = postgres(connectionString, { prepare: false, max: 5 });
    database = drizzle(client, { schema });
  }
  return database!;
}
