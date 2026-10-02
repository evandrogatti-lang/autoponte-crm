import { getCurrentAppUser } from "../../../../app-auth";
import { assertHomologationEnvironment } from "../../../../../lib/tenant-vehicle/homologation-environment";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// AP-CRM-004V2B1 Phase 1 only. No business DB imports, writes, or batch execution.
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    const user = await getCurrentAppUser();
    if (!user) return Response.json({ error: "Authentication required." }, { status: 401, headers });
    assertHomologationEnvironment();
    return Response.json({
      result: "REAL_PREVIEW_ENVIRONMENT_GUARD_PASS",
      environment: "preview",
      projectId: "prj_5jiXHFrJuH7jfRp5WlANvmRpoIdU",
      branch: "fix/crm-runtime-integration",
      authProject: "prcmlynykncfgzwluoef",
      persistence: {
        host: "aws-1-eu-west-3.pooler.supabase.com",
        port: 5432,
        database: "postgres",
        project: "prcmlynykncfgzwluoef",
      },
      deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
      region: process.env.VERCEL_REGION,
      identitiesAgree: true,
      batchExecuted: false,
    }, { headers });
  } catch {
    // No raw auth/parser/connection errors or environment values reach responses/logs.
    return Response.json({ error: "Unverified homologation environment." }, { status: 403, headers });
  }
}
