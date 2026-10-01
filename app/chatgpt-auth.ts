import { redirect } from "next/navigation";
import { getCurrentAppUser, safeReturnPath } from "./app-auth";

// Compatibility names retained for existing CRM callers; identity is Supabase-only.
export type ChatGPTUser = {
  displayName: string;
  email: string;
  fullName: string | null;
};

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const user = await getCurrentAppUser();
  if (!user) return null;
  return { displayName: user.displayName, email: user.email, fullName: user.fullName };
}

export async function requireChatGPTUser(returnTo: string): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;
  redirect(chatGPTSignInPath(returnTo));
}

export function chatGPTSignInPath(returnTo: string): string {
  return `/login?return_to=${encodeURIComponent(safeReturnPath(returnTo))}`;
}

// Unused legacy export retained; sign-out migration is outside this redirect slice.
export function chatGPTSignOutPath(returnTo = "/"): string {
  return `/signout-with-chatgpt?return_to=${encodeURIComponent(safeReturnPath(returnTo))}`;
}
