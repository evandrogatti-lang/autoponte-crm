"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createAuthClient } from "../../lib/supabase-auth-client";
import styles from "./auth.module.css";

export default function AuthForm({ mode }: { mode: "login" | "recovery" }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    try {
      const supabase = createAuthClient();
      if (mode === "login") {
        const password = String(form.get("password") ?? "");
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace("/crm");
        router.refresh();
      } else {
        const redirectTo = `${window.location.origin}/nova-senha`;
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) throw error;
        setMessage("Se o e-mail estiver cadastrado, você receberá um link para definir uma nova senha.");
        event.currentTarget.reset();
      }
    } catch (error) {
      const text = error instanceof Error ? error.message : "Não foi possível concluir a solicitação.";
      setMessage(text === "Invalid login credentials" ? "E-mail ou senha inválidos." : text);
    } finally {
      setLoading(false);
    }
  }

  return <main className={styles.page}>
    <section className={styles.brandPanel}>
      <div className={styles.brand}><span>AP</span><div><strong>AutoPonte</strong><small>CRM AUTOMOTIVO</small></div></div>
      <div className={styles.promise}>
        <p>OPERAÇÃO CONECTADA</p>
        <h1>Decisões melhores começam com acesso seguro.</h1>
        <span>Clientes, veículos, oportunidades e margens em um ambiente único para a equipe AutoPonte.</span>
      </div>
      <small className={styles.footnote}>Acesso exclusivo para usuários autorizados.</small>
    </section>
    <section className={styles.formPanel}>
      <div className={styles.formCard}>
        <p className={styles.eyebrow}>{mode === "login" ? "BEM-VINDO" : "RECUPERAR ACESSO"}</p>
        <h2>{mode === "login" ? "Entrar no CRM" : "Esqueceu sua senha?"}</h2>
        <p>{mode === "login" ? "Use o e-mail corporativo vinculado ao seu perfil." : "Informe seu e-mail para receber as instruções de recuperação."}</p>
        <form onSubmit={submit}>
          <label>E-mail corporativo<input name="email" type="email" autoComplete="email" required placeholder="nome@empresa.com" /></label>
          {mode === "login" ? <label>Senha<input name="password" type="password" autoComplete="current-password" required placeholder="Digite sua senha" /></label> : null}
          {message ? <div className={styles.notice} role="status">{message}</div> : null}
          <button type="submit" disabled={loading}>{loading ? "Aguarde…" : mode === "login" ? "Entrar" : "Enviar link de recuperação"}</button>
        </form>
        {mode === "login" ? <Link href="/recuperar-senha">Esqueci minha senha</Link> : <Link href="/login">Voltar para o login</Link>}
        <small className={styles.support}>Problemas com o acesso? Procure o administrador do sistema.</small>
      </div>
    </section>
  </main>;
}
