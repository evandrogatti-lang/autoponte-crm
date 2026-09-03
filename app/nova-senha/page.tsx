import PasswordForm from "./PasswordForm";
import { cookies } from "next/headers";
import { PASSWORD_FLOW_COOKIE } from "../../lib/auth-flow";

export const metadata = { title: "Definir nova senha | AutoPonte CRM" };

export default async function NovaSenhaPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const params = await searchParams;
  const store = await cookies();
  const pending = store.get(PASSWORD_FLOW_COOKIE)?.value === "pending";
  return <PasswordForm invalid={params.status === "invalid" || !pending} />;
}
