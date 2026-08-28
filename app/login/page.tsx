import AuthForm from "./AuthForm";

export const metadata = { title: "Entrar | AutoPonte CRM" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ return_to?: string }> }) {
  const { return_to: returnTo } = await searchParams;
  return <AuthForm mode="login" returnTo={returnTo} />;
}
