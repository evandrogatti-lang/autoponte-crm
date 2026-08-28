import fs from "node:fs";
import postgres from "postgres";

const expected = "prcmlynykncfgzwluoef";
const env = Object.fromEntries(
  fs.readFileSync(".env.staging.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator).trim(), line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "")];
    }),
);

const databaseUrl = new URL(env.DATABASE_URL);
const authUrl = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
const directTarget = databaseUrl.hostname === `db.${expected}.supabase.co`;
const poolerTarget = databaseUrl.hostname.endsWith(".pooler.supabase.com") && databaseUrl.username === `postgres.${expected}`;
if (env.AUTOPONTE_ENV !== "staging" || (!directTarget && !poolerTarget) || authUrl.hostname.split(".")[0] !== expected) {
  throw new Error("Unsafe target");
}

const db = postgres(env.DATABASE_URL, { prepare: false, max: 1 });
try {
  const lifecycleColumns = await db`
    select column_name, data_type, is_nullable, column_default
    from information_schema.columns
    where table_schema = 'public' and table_name = 'vehicles'
      and column_name in (
        'origin', 'previous_owner_customer_id', 'source_case_id', 'source_negotiation_id',
        'entry_at', 'appraisal_value', 'credited_paid_value', 'lifecycle_status',
        'lifecycle_blockers', 'vqi_required'
      )
    order by ordinal_position
  `;
  const constraints = await db`
    select conname, contype, pg_get_constraintdef(oid) definition
    from pg_constraint
    where connamespace = 'public'::regnamespace
      and conname in (
        'vehicles_origin_check', 'vehicles_lifecycle_status_check',
        'vehicles_lifecycle_blockers_check', 'vehicles_terminal_blockers_check',
        'commercial_cases_acquisition_mode_check', 'vehicle_lifecycle_events_case_id_fkey'
      )
    order by conname
  `;
  const triggers = await db`
    select event_object_table table_name, trigger_name, action_timing, event_manipulation
    from information_schema.triggers
    where trigger_schema = 'public'
      and trigger_name in (
        'proposals_customer_context', 'deliveries_customer_context',
        'vehicles_inventory_readiness_guard'
      )
    order by trigger_name, event_manipulation
  `;
  const migrationTables = await db`
    select table_schema, table_name
    from information_schema.tables
    where table_name ilike '%migration%'
    order by table_schema, table_name
  `;
  const integrity = await db`
    select
      count(*) filter (where origin is null or lifecycle_status is null)::int null_lifecycle,
      count(*) filter (where lifecycle_status in ('SOLD','DELIVERED') and lifecycle_blockers <> '[]'::jsonb)::int terminal_with_blockers,
      count(*) filter (where source_case_id is not null and not exists(select 1 from commercial_cases c where c.id=vehicles.source_case_id))::int orphan_source_cases,
      count(*) filter (where previous_owner_customer_id is not null and not exists(select 1 from customers c where c.id=vehicles.previous_owner_customer_id))::int orphan_previous_owners,
      count(*) filter (where lifecycle_status = 'AVAILABLE' and (
        document_status not in ('regular','approved') or asking_price <= 0
        or (select count(*) from vehicle_media m where m.vehicle_id=vehicles.id and m.media_type='photo' and m.status='approved') < 4
        or not exists(select 1 from vehicle_publications p where p.vehicle_id=vehicles.id and p.status='published' and p.published_at is not null and p.ended_at is null)
      ))::int legacy_available_not_ready
    from vehicles
  `;
  console.log(JSON.stringify({ lifecycleColumns, constraints, triggers, migrationTables, integrity: integrity[0] }, null, 2));
} finally {
  await db.end();
}
