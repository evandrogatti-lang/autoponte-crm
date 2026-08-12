import AuthForm from "../login/AuthForm";

export const metadata = { title: "Recuperar acesso | AutoPonte CRM" };

export default function RecuperarSenhaPage() {
  return <AuthForm mode="recovery" />;
}
