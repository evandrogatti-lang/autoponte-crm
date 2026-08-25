import { createServerClient } from "@supabase/ssr";
import { and, eq, or } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "../db";
import { crmUsers } from "../db/schema";

export type ChatGPTUser = { displayName: string; email: string; fullName: string | null };

const USER_EMAIL_HEADER = "oai-authenticated-user-email";
const USER_FULL_NAME_HEADER = "oai-authenticated-user-full-name";
const USER_FULL_NAME_ENCODING_HEADER = "oai-authenticated-user-full-name-encoding";
const PERCENT_ENCODED_UTF8 = "percent-encoded-utf-8";
const SIGN_IN_PATH = "/signin-with-chatgpt";
const SIGN_OUT_PATH = "/signout-with-chatgpt";
const CALLBACK_PATH = "/callback";

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const supabaseUser = await getSupabaseUser();
  if (supabaseUser?.email) {
    return authorizedCrmUser(supabaseUser.id, supabaseUser.email, supabaseUser.user_metadata?.name ?? null);
  }
  // Hosted identity headers are accepted only behind an explicitly trusted proxy.
  if (process.env.AUTOPONTE_TRUST_CHATGPT_HEADERS !== "true") return null;
  const requestHeaders = await headers();
  const email = requestHeaders.get(USER_EMAIL_HEADER);
  if (!email) return null;
  const encodedFullName = requestHeaders.get(USER_FULL_NAME_HEADER);
  const fullName = encodedFullName && requestHeaders.get(USER_FULL_NAME_ENCODING_HEADER) === PERCENT_ENCODED_UTF8
    ? safeDecodeURIComponent(encodedFullName)
    : null;
  return authorizedCrmUser("", email, fullName);
}

export async function requireChatGPTUser(returnTo: string): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;
  redirect(`/login?return_to=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`);
}

async function getSupabaseUser() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  const cookieStore = await cookies();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (values) => {
        try { values.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
        catch { /* Server Components cannot always refresh cookies; getUser still validates the request. */ }
      },
    },
  });
  const { data, error } = await supabase.auth.getUser();
  return error ? null : data.user;
}

async function authorizedCrmUser(authUserId: string, rawEmail: string, fullName: string | null): Promise<ChatGPTUser | null> {
  const email = rawEmail.trim().toLowerCase();
  const identity = authUserId
    ? or(eq(crmUsers.authUserId, authUserId), eq(crmUsers.email, email))
    : eq(crmUsers.email, email);
  const [crmUser] = await getDb().select({ authUserId: crmUsers.authUserId, name: crmUsers.name, email: crmUsers.email })
    .from(crmUsers).where(and(eq(crmUsers.status, "active"), identity)).limit(1);
  if (!crmUser) return null;
  if (crmUser.authUserId && authUserId && crmUser.authUserId !== authUserId) return null;
  return { displayName: crmUser.name || fullName || email, email: crmUser.email, fullName: fullName || crmUser.name || null };
}

export function chatGPTSignInPath(returnTo: string): string {
  return `${SIGN_IN_PATH}?return_to=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`;
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  return `${SIGN_OUT_PATH}?return_to=${encodeURIComponent(safeRelativeReturnPath(returnTo))}`;
}

function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";
  let url: URL;
  try { url = new URL(value, "https://app.local"); } catch { return "/"; }
  if (url.origin !== "https://app.local" || isReservedAuthPath(url.pathname)) return "/";
  return `${url.pathname}${url.search}${url.hash}`;
}

function isReservedAuthPath(pathname: string): boolean {
  return pathname === SIGN_IN_PATH || pathname === SIGN_OUT_PATH || pathname === CALLBACK_PATH;
}

function safeDecodeURIComponent(value: string): string | null {
  try { return decodeURIComponent(value); } catch { return null; }
}
