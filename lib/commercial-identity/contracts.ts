export type ConfirmedIdentitySource = { origin: string; customerId: string | null };
export type IdentityResolution =
  | { state: "RESOLVED"; customerId: string; sources: ConfirmedIdentitySource[] }
  | { state: "UNRESOLVED"; customerId: null; sources: ConfirmedIdentitySource[] }
  | { state: "CONFLICT"; customerId: null; sources: ConfirmedIdentitySource[] };

// Candidate/contact evidence deliberately has no place in this confirmed-only contract.
export function resolveConfirmedIdentity(sources: ConfirmedIdentitySource[]): IdentityResolution {
  const confirmed = new Set(sources.flatMap(source => source.customerId === null ? [] : [source.customerId]));
  if (confirmed.size > 1) return { state: "CONFLICT", customerId: null, sources };
  if (confirmed.size === 0 || sources.some(source => source.customerId === null)) {
    return { state: "UNRESOLVED", customerId: null, sources };
  }
  return { state: "RESOLVED", customerId: [...confirmed][0], sources };
}

export class IdentityConflictError extends Error {
  readonly state = "CONFLICT";
}

// Drizzle wraps Postgres errors in a query error; preserve the database outcome.
export function isIdentityConflict(error: unknown): boolean {
  const seen = new Set<unknown>();
  while (typeof error === "object" && error !== null && !seen.has(error)) {
    seen.add(error);
    if ("code" in error && error.code === "40001") return true;
    error = "cause" in error ? error.cause : undefined;
  }
  return false;
}
