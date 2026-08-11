import { desc } from "drizzle-orm";
import { requireChatGPTUser } from "../chatgpt-auth";
import { getDb } from "../../db";
import { vehicles } from "../../db/vehicle-schema";
import tradeStyles from "./Trocas.module.css";
import { CoreShell, coreStyles as styles } from "../../components/crm/CoreShell";

export const dynamic = "force-dynamic";
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export default async function TrocasPage() {
  await requireChatGPTUser("/trocas");
  const allVehicles = await getDb().select().from(vehicles).orderBy(desc(vehicles.updatedAt)).limit(1000);
  const rows = allVehicles.filter((v) => v.sourceType === "trade_in");
  const active = rows.filter((v) => !["sold", "unavailable"].includes(v.status));
  const totalFipe = active.reduce((s, v) => s + (v.fipeValue || 0), 0);
  const totalAsked = active.reduce((s, v) => s + (v.askingPrice || v.fipeValue || 0), 0);

  return <CoreShell activeHref="/trocas" title="Trocas" subtitle="Veículos recebidos ou avaliados em operações de troca, separados das oportunidades." actions={<><a href="/veiculos/novo">Cadastrar veículo</a><a className="primary" href="/oportunidades">Ver oportunidades</a></>}>
    <section className={styles.metrics}>
      <article className={styles.metric}><span>Trocas registradas</span><strong>{rows.length}</strong></article>
      <article className={styles.metric}><span>Ativas</span><strong>{active.length}</strong></article>
      <article className={styles.metric}><span>FIPE acumulada</span><strong>{money.format(totalFipe)}</strong></article>
      <article className={styles.metric}><span>Valor comercial</span><strong>{money.format(totalAsked)}</strong></article>
    </section>
    {rows.length === 0 ? <div className={styles.empty}>Nenhum veículo de troca cadastrado. Cadastre o veículo com origem <b>Troca</b> em Estoque.</div> : <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>Veículo</th><th>Ano</th><th>Km</th><th>FIPE</th><th>Preço</th><th>Condição</th><th>Status</th><th>Ação</th></tr></thead><tbody>{rows.map((v)=><tr key={v.id} className={tradeStyles.clickableRow}><td><b>{v.brand} {v.model}</b><br/><small>{v.plate || "Sem placa"}</small></td><td>{v.modelYear || "—"}</td><td>{v.mileage.toLocaleString("pt-BR")} km</td><td>{money.format(v.fipeValue || 0)}</td><td>{money.format(v.askingPrice || v.fipeValue || 0)}</td><td>{v.vehicleCondition || "—"}</td><td><span className={styles.badge}>{v.status}</span></td><td><a href={`/veiculos/${v.id}`}>Abrir veículo</a></td></tr>)}</tbody></table></div>}
  </CoreShell>;
}
