import { sql } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { getCurrentAppUser, requireCurrentAppUser } from "../../../app-auth";
import { getDb } from "../../../../db";
import { resolveTenantContext } from "../../../../lib/tenant-runtime";
import { assertHomologationEnvironment } from "../../../../lib/tenant-vehicle/homologation-environment";
import { executeFirstSyntheticBatch } from "../../../../lib/tenant-vehicle/homologation-executor";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const path = "/internal/homologation/first-synthetic-batch";
const tenantId = "03824f9e-0924-435e-8b20-50b8ea52774b";

// Temporary staging-only trigger. The validated executor remains the only writer.
async function execute(form: FormData) {
  "use server";
  let outcome = "rejected";
  try {
    // Next's own action transport fields are not application parameters.
    if ([...form.keys()].some(key => !key.startsWith("$ACTION_"))) throw new Error();
    const result = await executeFirstSyntheticBatch({});
    outcome = result.result;
  } catch {
    // Never expose auth, SQL or environment errors through action responses/logs.
  }
  redirect(`${path}?result=${outcome}`);
}

export default async function FirstSyntheticBatchPage({ searchParams }: {
  searchParams: Promise<{ result?: string }>;
}) {
  await requireCurrentAppUser(path);
  let context: Awaited<ReturnType<typeof resolveTenantContext>>;
  try {
    assertHomologationEnvironment();
    context = await resolveTenantContext(tenantId);
    const user = await getCurrentAppUser();
    if (context.userId !== user?.id || context.tenantId !== tenantId ||
        !context.roles.some(role => role === "owner" || role === "manager")) throw new Error();
  } catch {
    notFound();
  }
  let roots: { id: string; status: string; specification: string | null }[];
  try {
    roots = Array.from(await getDb().execute(sql`select id,status,vehicle_specification_id as specification
      from public.tenant_vehicles where tenant_id=${tenantId}
      and registration_reason like ${"%first_synthetic_batch_5%"} order by id`)) as typeof roots;
  } catch {
    notFound();
  }
  const { result } = await searchParams;
  const outcome = ["EXECUTED", "ALREADY_EXECUTED", "rejected"].includes(result ?? "") ? result : undefined;
  return <main style={{ padding: 32, maxWidth: 960, margin: "auto" }}>
    <h1>Homologation only</h1>
    <p>AP-CRM-004V2B — first_synthetic_batch_5</p>
    <p>Environment guard: PASS. Preview / teste2 / fix/crm-runtime-integration.</p>
    <p>Tenant: {context.tenantId}</p>
    <p>Authenticated User: {context.userId}</p>
    <p>Active Membership: {context.membershipId}. Roles: {context.roles.join(", ")}.</p>
    <p>Exactly 5 synthetic units and 7 source mappings. Qualification; specification NULL.
      No verified physical identity, availability promotion or Negotiation creation.</p>
    <ul>
      <li>phase2-p2-01-vehicle</li>
      <li>phase2-p2-02-vehicle</li>
      <li>pilot-p1-01-vehicle</li>
      <li>phase2-p2-03-vehicle ↔ phase2-p2-03-opportunity</li>
      <li>pilot-p1-02-vehicle ↔ pilot-p1-02-opportunity</li>
    </ul>
    {outcome && <p>Executor response: {outcome}</p>}
    <p>Persisted batch roots: {roots.length}</p>
    {roots.length === 0 && outcome !== "rejected" && <form action={execute}>
      <button type="submit">Execute approved batch once</button>
    </form>}
    <ul>{roots.map(root => <li key={root.id}>{root.id} — {root.status} — specification {root.specification ?? "NULL"}</li>)}</ul>
    <p>The executor revalidates authentication, environment, Tenant, roles, manifest and prior state
      inside its existing atomic execution path. Reloading this page never executes the batch.</p>
  </main>;
}
