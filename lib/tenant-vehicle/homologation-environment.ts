// AP-CRM-004V2B1: private to the first synthetic homologation executor.
// Project identity verified through Vercel; pooler basis: AP-CRM-001 checkpoint.
const projectId = "prj_5jiXHFrJuH7jfRp5WlANvmRpoIdU";
const projectRef = "prcmlynykncfgzwluoef";

export class HomologationEnvironmentError extends Error {
  constructor() {
    // Never attach URL parser errors, environment values or credentials.
    super("Synthetic homologation execution denied: unverified environment.");
    this.name = "HomologationEnvironmentError";
  }
}

export function assertHomologationEnvironment(env: Readonly<Record<string, string | undefined>> = process.env): void {
  const deny = () => { throw new HomologationEnvironmentError(); };
  if (env.VERCEL !== "1" || env.VERCEL_ENV !== "preview" ||
      env.VERCEL_PROJECT_ID !== projectId ||
      env.VERCEL_GIT_COMMIT_REF !== "fix/crm-runtime-integration" ||
      !/^dpl_[A-Za-z0-9]+$/.test(env.VERCEL_DEPLOYMENT_ID ?? "") ||
      !/^[a-z]+[0-9]+$/.test(env.VERCEL_REGION ?? "") ||
      (env.VERCEL_TARGET_ENV !== undefined && env.VERCEL_TARGET_ENV !== "preview")) deny();

  try {
    const auth = new URL(env.NEXT_PUBLIC_SUPABASE_URL ?? "");
    if (auth.protocol !== "https:" || auth.hostname !== `${projectRef}.supabase.co` ||
        auth.port || auth.username || auth.password || auth.pathname !== "/" ||
        auth.search || auth.hash) deny();

    const db = new URL(env.DATABASE_URL ?? "");
    if (!["postgres:", "postgresql:"].includes(db.protocol) ||
        db.hostname !== "aws-1-eu-west-3.pooler.supabase.com" || db.port !== "5432" ||
        decodeURIComponent(db.username) !== `postgres.${projectRef}` ||
        db.pathname !== "/postgres" || !db.password || db.hash) deny();
    // Reject connection options that could make the represented destination ambiguous.
    for (const [key, value] of db.searchParams) {
      if (key !== "sslmode" || value !== "require") deny();
    }
    if (db.searchParams.getAll("sslmode").length > 1) deny();
  } catch {
    deny();
  }
}
