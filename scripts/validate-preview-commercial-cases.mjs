import postgres from "postgres";

const rawUrl = process.env.DATABASE_URL;
if (!rawUrl) throw new Error("DATABASE_URL não configurada.");
const connectionUrl = rawUrl.replace(/^['"]|['"]$/g, "");
const db = postgres(connectionUrl, { prepare: false, max: 1 });

try {
  const cases = await db`
    select c.id, c.pilot_code, c.status, c.final_outcome,
      c.vehicle_id, c.customer_id, c.opportunity_id, c.seller_profile_id,
      v.id as linked_vehicle_id, cu.id as linked_customer_id
    from commercial_cases c
    left join vehicles v on v.id = c.vehicle_id
    left join customers cu on cu.id = c.customer_id
    order by c.updated_at desc
  `;
  const relationships = await db`
    select
      (select count(*)::int from vehicle_matches m join commercial_cases c on c.id = m.case_id) as matches,
      (select count(*)::int from proposals p join commercial_cases c on c.id = p.case_id join customers cu on cu.id = p.customer_id join vehicles v on v.id = p.vehicle_id) as proposals,
      (select count(*)::int from vehicle_lifecycle_events e join commercial_cases c on c.id = e.case_id) as timeline_events
  `;
  const statusCounts = Object.fromEntries(
    Object.entries(Object.groupBy(cases, (item) => item.final_outcome || item.status))
      .map(([status, rows]) => [status, rows.length]),
  );
  const broken = cases.filter((item) => !item.linked_vehicle_id || !item.linked_customer_id);
  const duplicateIds = cases.length - new Set(cases.map((item) => item.id)).size;
  const duplicatePilotCodes = cases.length - new Set(cases.map((item) => item.pilot_code)).size;

  console.log(JSON.stringify({
    cases: cases.length,
    statusCounts,
    brokenRequiredRelationships: broken.length,
    duplicateIds,
    duplicatePilotCodes,
    ...relationships[0],
  }, null, 2));

  if (cases.length !== 50 || broken.length || duplicateIds || duplicatePilotCodes) process.exitCode = 1;
} finally {
  await db.end();
}
