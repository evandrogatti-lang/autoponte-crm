import PasswordForm from "./PasswordForm";

export const metadata = { title: "Definir nova senha | AutoPonte CRM" };

export default async function NovaSenhaPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const params = await searchParams;
  return <PasswordForm invalid={params.status === "invalid"} />;
}
