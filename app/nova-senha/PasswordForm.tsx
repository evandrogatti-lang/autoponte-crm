"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { createAuthClient } from "../../lib/supabase-auth-client";
import styles from "../login/auth.module.css";

export default function PasswordForm() {
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const supabase = createAuthClient();
    let active = true;
    async function prepareSession() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          window.history.replaceState({}, "", url.pathname);
        }
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (active && data.session) setSessionReady(true);
        else if (active) setMessage("Este link expirou ou já foi utilizado. Solicite um novo convite ou uma nova recuperação de senha.");
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : "Não foi possível validar este link.");
      }
    }
    void prepareSession();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active && session) {
        setSessionReady(true);
        setMessage("");
      }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    if (password.length < 8) return setMessage("A senha deve ter pelo menos 8 caracteres.");
    if (password !== confirmation) return setMessage("As senhas não coincidem.");
    if (!sessionReady) return setMessage("A sessão do convite ainda não está pronta. Abra novamente o link recebido por e-mail.");
    setLoading(true);
    setMessage("");
    try {
      const { error } = await createAuthClient().auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setMessage("Senha atualizada. Agora você já pode entrar no CRM.");
      formElement.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar a senha.");
    } finally {
      setLoading(false);
    }
  }

  return <main className={styles.page}><section className={styles.brandPanel}><div className={styles.brand}><span>AP</span><div><strong>AutoPonte</strong><small>CRM AUTOMOTIVO</small></div></div><div className={styles.promise}><p>ACESSO SEGURO</p><h1>Defina sua nova senha.</h1><span>Use uma senha exclusiva para proteger os dados comerciais e operacionais da AutoPonte.</span></div><small className={styles.footnote}>Acesso exclusivo para usuários autorizados.</small></section><section className={styles.formPanel}><div className={styles.formCard}><p className={styles.eyebrow}>NOVA SENHA</p><h2>Atualizar acesso</h2><p>{sessionReady ? "Escolha uma senha com pelo menos 8 caracteres." : "Validando o link seguro recebido por e-mail…"}</p><form onSubmit={submit}><label>Nova senha<input name="password" type="password" minLength={8} required autoComplete="new-password" disabled={!sessionReady || success} /></label><label>Confirmar nova senha<input name="confirmation" type="password" minLength={8} required autoComplete="new-password" disabled={!sessionReady || success} /></label>{message ? <div className={styles.notice} role="status">{message}</div> : null}{success ? null : <button type="submit" disabled={loading || !sessionReady}>{loading ? "Aguarde…" : sessionReady ? "Atualizar senha" : "Validando link…"}</button>}</form>{success ? <Link href="/login">Ir para o login</Link> : <Link href="/login">Cancelar e voltar</Link>}</div></section></main>;
}
