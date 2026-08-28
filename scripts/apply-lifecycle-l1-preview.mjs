import fs from "node:fs";
import postgres from "postgres";
import { buildTradeInDecision } from "../lib/vehicles/managerial-decision.ts";

const expected = "prcmlynykncfgzwluoef";
const env = Object.fromEntries(fs.readFileSync(".env.staging.local", "utf8").split(/\r?\n/).filter((line) => line && !line.startsWith("#") && line.includes("=")).map((line) => { const at = line.indexOf("="); return [line.slice(0, at).trim(), line.slice(at + 1).trim().replace(/^['"]|['"]$/g, "")]; }));
const databaseUrl = new URL(env.DATABASE_URL);
const authUrl = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
const databaseProject = databaseUrl.hostname === `db.${expected}.supabase.co` ? expected : databaseUrl.username.split(".")[1] || "unknown";
const authProject = authUrl.hostname.split(".")[0];
if (env.AUTOPONTE_ENV !== "staging" || databaseProject !== expected || authProject !== expected) throw new Error(`Refusing unsafe target: env=${env.AUTOPONTE_ENV}, db=${databaseProject}, auth=${authProject}`);

const db = postgres(env.DATABASE_URL, { prepare: false, max: 1, connect_timeout: 15 });
try {
  const [before] = await db`select (select count(*)::int from commercial_cases) cases, (select count(*)::int from vehicle_matches) matches`;
  if (before.cases !== 50 || before.matches !== 170) throw new Error(`Pre-migration preservation gate failed: ${before.cases} cases, ${before.matches} matches.`);
  if (!process.argv.includes("--validate-only")) {
    const migration = fs.readFileSync("drizzle/0019_vehicle_lifecycle_foundation.sql", "utf8");
    await db.begin(async (tx) => { await tx.unsafe(migration); });
  }

  const [integrity] = await db.unsafe(`
    select
      (select count(*)::int from commercial_cases) cases,
      (select count(*)::int from vehicle_matches) matches,
      (select count(*)::int from commercial_cases c left join vehicles v on v.id=c.vehicle_id left join customers u on u.id=c.customer_id where c.vehicle_id is null or v.id is null or c.customer_id is null or u.id is null) broken_case_links,
      (select count(*)::int from vehicle_matches m left join vehicles v on v.id=m.vehicle_id left join commercial_cases c on c.id=m.case_id where (m.vehicle_id is not null and v.id is null) or (m.case_id is not null and c.id is null)) broken_match_links,
      (select count(*)::int from vehicles where origin not in ('purchase','trade_in','consignment','other') or lifecycle_status not in ('PENDING_ENTRY','IN_STOCK','PREPARATION','READY','PUBLISHED','AVAILABLE','RESERVED','SOLD','DELIVERED')) invalid_lifecycle,
      (select count(*)::int from vehicles where lifecycle_status in ('SOLD','DELIVERED') and lifecycle_blockers <> '[]'::jsonb) terminal_blockers,
      (select count(*)::int from vehicles where lifecycle_status='SOLD' and status='available') sold_available,
      (select count(*)::int from vehicles where origin='trade_in') trade_in_vehicles,
      (select count(*)::int from vehicles where origin='trade_in' and source_negotiation_id is not null) trade_in_with_negotiation,
      (select count(*)::int from vehicles where origin='trade_in' and previous_owner_customer_id is not null) trade_in_with_previous_owner
  `);
  const flows = await db.unsafe(`
    select v.id vehicle_id, v.previous_owner_customer_id customer_a, v.source_negotiation_id negotiation_a,
      c.id negotiation_b, c.customer_id customer_b, m.id match_id,
      v.appraisal_value, v.credited_paid_value, v.acquisition_cost, v.asking_price,
      extract(day from now()-coalesce(v.entry_at,v.created_at))::int aging_days,
      (select count(*)::int from vehicle_matches mx where mx.vehicle_id=v.id) match_count,
      (select count(*)::int from commercial_cases cx where cx.vehicle_id=v.id and cx.status not in ('closed','lost','cancelled')) open_count
    from vehicles v join vehicle_matches m on m.vehicle_id=v.id join commercial_cases c on c.id=m.case_id and c.vehicle_id=v.id
    where v.origin='trade_in' and v.previous_owner_customer_id is not null and c.customer_id is distinct from v.previous_owner_customer_id
    order by c.opened_at desc limit 1
  `);
  const flow = flows[0] || null;
  const [decisionInput] = flow ? [flow] : await db.unsafe(`select v.appraisal_value,v.credited_paid_value,v.acquisition_cost,v.asking_price,extract(day from now()-coalesce(v.entry_at,v.created_at))::int aging_days,(select count(*)::int from vehicle_matches m where m.vehicle_id=v.id) match_count,(select count(*)::int from commercial_cases c where c.vehicle_id=v.id and c.status not in ('closed','lost','cancelled')) open_count from vehicles v where v.origin='trade_in' order by v.created_at limit 1`);
  const decision = decisionInput ? buildTradeInDecision({ appraisalValue: decisionInput.appraisal_value, creditedValue: decisionInput.credited_paid_value, projectedAcquisitionCost: decisionInput.acquisition_cost, askingPrice: decisionInput.asking_price, existingMatches: decisionInput.match_count, openOpportunities: decisionInput.open_count, inventoryAgeDays: decisionInput.aging_days, likelyNextSale: flow ? `Current interested customer ${flow.customer_b}` : null }) : null;
  const aiFields = decision ? ["recommendation","risk","financialImpact","futureOpportunity","confidence","reasons"].every((key) => key in decision && decision[key] !== "" && decision[key] != null) : false;
  console.log(JSON.stringify({ target: { environment: env.AUTOPONTE_ENV, databaseProject, authProject }, before, after: integrity, realTradeInFlow: flow ? { vehicleId: flow.vehicle_id, customerA: flow.customer_a, sourceNegotiation: flow.negotiation_a, matchId: flow.match_id, negotiationB: flow.negotiation_b, customerB: flow.customer_b, customersSeparated: flow.customer_a !== flow.customer_b } : null, managerialAiFieldsAvailable: aiFields }, null, 2));
  if (integrity.cases !== 50 || integrity.matches !== 170 || integrity.broken_case_links || integrity.broken_match_links || integrity.invalid_lifecycle || integrity.terminal_blockers || integrity.sold_available || integrity.trade_in_with_negotiation !== integrity.trade_in_vehicles || integrity.trade_in_with_previous_owner !== integrity.trade_in_vehicles || !flow || !aiFields) process.exitCode = 1;
} finally { await db.end(); }
