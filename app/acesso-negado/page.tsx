import Link from "next/link";

export default function AccessDeniedPage() {
  return <main style={{ maxWidth: 620, margin: "12vh auto", padding: 32 }}><p>AUTOPONTE CRM</p><h1>Acesso negado</h1><p>Seu perfil não possui permissão para acessar esta área. Se isso não era esperado, procure o administrador do sistema.</p><Link href="/crm">Voltar à Central de Operações</Link></main>;
}
