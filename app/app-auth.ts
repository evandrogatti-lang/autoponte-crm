import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requirePermission } from "../lib/access-control";
import { PASSWORD_FLOW_COOKIE } from "../lib/auth-flow";
import { getDb } from "../db";
import { crmRoles, crmUsers } from "../db/schema";
import { eq } from "drizzle-orm";

export type AppUser = {
  displayName: string;
  email: string;
  fullName: string | null;
  source: "supabase";
};

export async function getCurrentAppUser(): Promise<AppUser | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;

  const cookieStore = await cookies();
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values) => {
        try {
          values.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Components cannot persist refreshed cookies. getUser still
          // validates the access token with Supabase for this request.
        }
      },
    },
  });

  const { data, error } = await supabase.auth.getUser();
  const user = error ? null : data.user;
  const email = user?.email?.trim().toLowerCase();
  if (!user || !email) return null;

  const metadataName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : typeof user.user_metadata?.name === "string"
        ? user.user_metadata.name.trim()
        : "";

  return {
    displayName: metadataName || email,
    email,
    fullName: metadataName || null,
    source: "supabase",
  };
}

export async function requireCurrentAppUser(
  returnTo: string,
): Promise<AppUser> {
  const cookieStore = await cookies();
  if (cookieStore.get(PASSWORD_FLOW_COOKIE)?.value === "pending") {
    redirect("/nova-senha");
  }
  const user = await getCurrentAppUser();
  if (user) {
    try {
      const [row] = await getDb().select({ status: crmUsers.status }).from(crmUsers)
        .where(eq(crmUsers.email, user.email)).limit(1);
      if (row?.status === "active") return user;
      if (row?.status === "invited") redirect("/nova-senha?status=invalid");
      redirect("/acesso-negado");
    } catch (error) {
      if (typeof error === "object" && error && "digest" in error) throw error;
      redirect("/acesso-negado");
    }
  }

  redirect(`/login?return_to=${encodeURIComponent(safeReturnPath(returnTo))}`);
}

export async function getCurrentAccessContext() {
  const user = await getCurrentAppUser();
  if (!user) return { user: null, isAdmin: false };
  try {
    const db = getDb();
    const [row] = await db.select({ status: crmUsers.status, roleCode: crmRoles.code })
      .from(crmUsers)
      .innerJoin(crmRoles, eq(crmRoles.id, crmUsers.roleId))
      .where(eq(crmUsers.email, user.email))
      .limit(1);
    return { user, isAdmin: row?.status === "active" && row.roleCode === "admin" };
  } catch {
    return { user, isAdmin: false };
  }
}

export async function requireSellerOperations(returnTo: string) {
  const user = await requireCurrentAppUser(returnTo);
  const crmUser = await requirePermission(user, "seller_operations.manage");
  return { user, crmUser };
}

export function safeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/crm";

  try {
    const url = new URL(value, "https://app.local");
    if (url.origin !== "https://app.local" || url.pathname === "/login") {
      return "/crm";
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/crm";
  }
}
