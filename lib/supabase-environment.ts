type SupabaseEnvironment = {
  authUrl: string;
  databaseUrl?: string;
  expectedProjectRef: string;
  publishableKey?: string;
  serviceRoleKey?: string;
};

const PROJECT_REF_PATTERN = /^[a-z0-9]{20}$/;

function cleanEnvValue(value: string) {
  const trimmed = value.trim();
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function getAuthProjectRef(authUrl: string) {
  const hostname = new URL(cleanEnvValue(authUrl)).hostname.toLowerCase();
  const match = hostname.match(/^([a-z0-9]{20})\.supabase\.co$/);
  if (!match) throw new Error("NEXT_PUBLIC_SUPABASE_URL não identifica um projeto Supabase válido.");
  return match[1];
}

export function getDatabaseProjectRef(databaseUrl: string) {
  const parsed = new URL(cleanEnvValue(databaseUrl));
  const hostname = parsed.hostname.toLowerCase();
  const direct = hostname.match(/^db\.([a-z0-9]{20})\.supabase\.co$/);
  if (direct) return direct[1];

  if (hostname.endsWith(".pooler.supabase.com")) {
    const username = decodeURIComponent(parsed.username);
    const pooled = username.match(/^postgres\.([a-z0-9]{20})$/);
    if (pooled) return pooled[1];
  }

  throw new Error("DATABASE_URL não identifica um banco Supabase válido.");
}

function getJwtProjectRef(key?: string) {
  if (!key) return null;
  const parts = cleanEnvValue(key).split(".");
  if (parts.length !== 3) return null;
  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as { ref?: unknown };
    return typeof payload.ref === "string" ? payload.ref : null;
  } catch {
    return null;
  }
}

export function assertSupabaseEnvironmentAlignment(config: SupabaseEnvironment) {
  const expected = cleanEnvValue(config.expectedProjectRef).toLowerCase();
  if (!PROJECT_REF_PATTERN.test(expected)) {
    throw new Error("Referência esperada do projeto Supabase ausente ou inválida.");
  }

  const refs = [getAuthProjectRef(config.authUrl)];
  if (config.databaseUrl) refs.push(getDatabaseProjectRef(config.databaseUrl));
  const publishableRef = getJwtProjectRef(config.publishableKey);
  const serviceRef = getJwtProjectRef(config.serviceRoleKey);
  if (publishableRef) refs.push(publishableRef);
  if (serviceRef) refs.push(serviceRef);

  if (refs.some((ref) => ref !== expected)) {
    throw new Error("Configuração Supabase bloqueada: Auth, chaves e banco devem usar o mesmo projeto.");
  }
  return expected;
}

export function assertServerSupabaseEnvironment(options: { requireDatabase?: boolean } = {}) {
  const authUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const expectedProjectRef = process.env.AUTOPONTE_SUPABASE_PROJECT_REF;
  const databaseUrl = process.env.DATABASE_URL;
  if (!authUrl || !expectedProjectRef || (options.requireDatabase && !databaseUrl)) {
    throw new Error("Configuração Supabase incompleta para este ambiente.");
  }
  return assertSupabaseEnvironmentAlignment({
    authUrl,
    databaseUrl: options.requireDatabase ? databaseUrl : undefined,
    expectedProjectRef,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
