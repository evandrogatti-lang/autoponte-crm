"use client";

import { FormEvent, useEffect, useState } from "react";
import { coreStyles as shell } from "../../components/crm/CoreShell";
import styles from "./operations.module.css";

type Seller = { id: string; userName: string; userEmail: string; partnerId: string; status: string; availabilityStatus: string; capacity: number; specialties: string[] };
type Opportunity = { id: string; name: string; city: string; brand: string; model: string; status: string; assignment: { id: string; sellerProfileId: string; status: string } | null; eligibleSellerIds: string[] };
type User = { id: string; name: string; email: string; storeId: string };
type Partner = { id: string; name: string };
type ApiData = { sellers: Seller[]; opportunities: Opportunity[]; availableUsers: User[]; partners: Partner[] };

const emptyData: ApiData = { sellers: [], opportunities: [], availableUsers: [], partners: [] };
const statusLabel: Record<string, string> = { assigned: "Aguardando aceite", accepted: "Aceito", contacted: "Em contato", completed: "Concluído", reassigned: "Redistribuído" };

export default function OperationsConsole() {
  const [data, setData] = useState<ApiData>(emptyData);
  const [message, setMessage] = useState("Carregando fila operacional…");
  const [loading, setLoading] = useState(true);
  const [selectedSeller, setSelectedSeller] = useState<Record<string, string>>({});
  const [profile, setProfile] = useState({ crmUserId: "", partnerId: "", capacity: "1", specialties: "" });

  const load = async () => {
    setLoading(true);
    const [operationResponse, profileResponse] = await Promise.all([fetch("/api/atendimento", { cache: "no-store" }), fetch("/api/seller-profiles", { cache: "no-store" })]);
    const operation = await operationResponse.json();
    const profiles = await profileResponse.json();
    if (!operationResponse.ok) setMessage(operation.error ?? "Não foi possível carregar a fila.");
    else { setData({ sellers: operation.sellers, opportunities: operation.opportunities, availableUsers: profiles.availableUsers, partners: profiles.partners }); setMessage(""); }
    setLoading(false);
  };
  // The initial request intentionally hydrates this client-only operations console.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, []);

  const submitProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const response = await fetch("/api/seller-profiles", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...profile, capacity: Number(profile.capacity), specialties: profile.specialties.split(",") }) });
    const result = await response.json();
    setMessage(result.error ?? "Perfil de vendedor criado.");
    if (response.ok) { setProfile({ crmUserId: "", partnerId: "", capacity: "1", specialties: "" }); await load(); }
  };

  const assign = async (opportunityId: string) => {
    const sellerProfileId = selectedSeller[opportunityId];
    if (!sellerProfileId) return;
    const response = await fetch("/api/atendimento", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "assign", opportunityId, sellerProfileId }) });
    const result = await response.json();
    setMessage(result.error ?? "Atendimento atribuído.");
    if (response.ok) await load();
  };

  const action = async (opportunityId: string, assignmentId: string, actionName: "accept" | "contact" | "complete") => {
    const response = await fetch("/api/atendimento", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: actionName, opportunityId, assignmentId, outcome: actionName === "complete" ? "follow_up" : undefined }) });
    const result = await response.json();
    setMessage(result.error ?? "Atendimento atualizado.");
    if (response.ok) await load();
  };

  const sellersById = new Map(data.sellers.map((seller) => [seller.id, seller]));
  return <div className={shell.grid2}>
    <section className={styles.queue}>
      <div className={styles.queueHeader}><div><span className={styles.eyebrow}>OPERAÇÃO</span><h2>Fila de atendimento</h2></div><span className={styles.counter}>{data.opportunities.length} qualificações</span></div>
      {message && <div className={shell.warning}>{message}</div>}
      {loading ? <div className={shell.empty}>Consultando disponibilidade…</div> : data.opportunities.length === 0 ? <div className={shell.empty}>Nenhuma qualificação aguardando atendimento.</div> : <div className={styles.opportunityList}>{data.opportunities.map((opportunity) => { const candidates = opportunity.eligibleSellerIds.map((sellerId) => sellersById.get(sellerId)).filter((seller): seller is Seller => Boolean(seller)); return <article className={styles.opportunity} key={opportunity.id}><div><span className={styles.kicker}>{opportunity.status}</span><h3>{opportunity.name}</h3><p>{opportunity.brand} {opportunity.model} · {opportunity.city}</p></div>{opportunity.assignment ? <div className={styles.assignment}><strong>{statusLabel[opportunity.assignment.status] ?? opportunity.assignment.status}</strong><div className={styles.actions}>{opportunity.assignment.status === "assigned" && <button onClick={() => void action(opportunity.id, opportunity.assignment!.id, "accept")}>Aceitar</button>}{["assigned", "accepted"].includes(opportunity.assignment.status) && <button onClick={() => void action(opportunity.id, opportunity.assignment!.id, "contact")}>Registrar contato</button>}{opportunity.assignment.status === "contacted" && <button onClick={() => void action(opportunity.id, opportunity.assignment!.id, "complete")}>Concluir atendimento</button>}</div></div> : <div className={styles.assignBox}><select aria-label={`Vendedor para ${opportunity.name}`} value={selectedSeller[opportunity.id] ?? ""} onChange={(event) => setSelectedSeller((current) => ({ ...current, [opportunity.id]: event.target.value }))}><option value="">Selecionar vendedor</option>{candidates.map((seller) => <option key={seller.id} value={seller.id}>{seller.userName}{seller.partnerId ? ` · ${seller.partnerId}` : ""}</option>)}</select><button disabled={!selectedSeller[opportunity.id]} onClick={() => void assign(opportunity.id)}>Atribuir</button>{candidates.length === 0 && <small>Nenhum vendedor elegível no momento.</small>}</div>}</article>; })}</div>}
    </section>
    <aside className={styles.side}>
      <section className={shell.card}><h2>Novo perfil de vendedor</h2><p>Associe um usuário ativo a um parceiro e registre as especialidades usadas na elegibilidade.</p><form className={styles.form} onSubmit={submitProfile}><label>Usuário ativo<select required value={profile.crmUserId} onChange={(event) => setProfile((current) => ({ ...current, crmUserId: event.target.value }))}><option value="">Selecionar</option>{data.availableUsers.map((user) => <option key={user.id} value={user.id}>{user.name} · {user.email}</option>)}</select></label><label>Parceiro<select value={profile.partnerId} onChange={(event) => setProfile((current) => ({ ...current, partnerId: event.target.value }))}><option value="">Sem parceiro definido</option>{data.partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.name}</option>)}</select></label><label>Especialidades<input placeholder="Honda, SUV, seminovos" value={profile.specialties} onChange={(event) => setProfile((current) => ({ ...current, specialties: event.target.value }))} /></label><label>Capacidade simultânea<input type="number" min="1" max="20" value={profile.capacity} onChange={(event) => setProfile((current) => ({ ...current, capacity: event.target.value }))} /></label><button className={styles.primary}>Criar perfil</button></form></section>
      <section className={shell.card}><div className={styles.queueHeader}><div><span className={styles.eyebrow}>DIRETÓRIO</span><h2>Vendedores ativos</h2></div><span className={styles.counter}>{data.sellers.length}</span></div><div className={styles.sellerList}>{data.sellers.map((seller) => <div className={styles.seller} key={seller.id}><div><strong>{seller.userName}</strong><small>{seller.specialties.join(" · ") || "Todas as qualificações"}</small></div><span className={seller.availabilityStatus === "available" ? styles.available : styles.unavailable}>{seller.availabilityStatus === "available" ? "Disponível" : "Indisponível"}</span></div>)}</div></section>
    </aside>
  </div>;
}
