"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import styles from "../login/auth.module.css";

export default function PasswordForm({ invalid = false }: { invalid?: boolean }) {
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    if (password.length < 8) return setMessage("A senha deve ter pelo menos 8 caracteres.");
    if (password !== confirmation) return setMessage("As senhas não coincidem.");
    if (invalid) return setMessage("Link inválido, expirado ou já utilizado. Solicite um novo link.");
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Não foi possível atualizar a senha.");
      setSuccess(true);
      setMessage("Senha atualizada. Agora você já pode entrar no CRM.");
      event.currentTarget.reset();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar a senha.");
    } finally {
      setLoading(false);
    }
  }

  return <main className={styles.page}><section className={styles.brandPanel}><div className={styles.brand}><span>AP</span><div><strong>AutoPonte</strong><small>CRM AUTOMOTIVO</small></div></div><div className={styles.promise}><p>ACESSO SEGURO</p><h1>Defina sua nova senha.</h1><span>Use uma senha exclusiva para proteger os dados comerciais e operacionais da AutoPonte.</span></div><small className={styles.footnote}>Acesso exclusivo para usuários autorizados.</small></section><section className={styles.formPanel}><div className={styles.formCard}><p className={styles.eyebrow}>NOVA SENHA</p><h2>{invalid ? "Link inválido" : "Atualizar acesso"}</h2><p>{invalid ? "Este link expirou ou já foi utilizado." : "Escolha uma senha com pelo menos 8 caracteres."}</p>{invalid ? <div className={styles.notice} role="alert">Link inválido, expirado ou já utilizado.</div> : <form onSubmit={submit}><label>Nova senha<input name="password" type="password" minLength={8} required autoComplete="new-password" disabled={success} /></label><label>Confirmar nova senha<input name="confirmation" type="password" minLength={8} required autoComplete="new-password" disabled={success} /></label>{message ? <div className={styles.notice} role="status">{message}</div> : null}{success ? null : <button type="submit" disabled={loading}>{loading ? "Aguarde…" : "Atualizar senha"}</button>}</form>}{success ? <Link href="/login">Ir para o login</Link> : invalid ? <Link href="/recuperar-senha">Solicitar novo link</Link> : <Link href="/login">Cancelar e voltar</Link>}</div></section></main>;
}
