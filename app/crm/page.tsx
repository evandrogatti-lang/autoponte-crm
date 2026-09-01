import Link from "next/link";
import { requireCurrentAppUser } from "../app-auth";
import { requirePermission } from "../../lib/access-control";
import { getMissionControl } from "../../lib/commercial-cases/service";
import styles from "./mission-control.module.css";

export const dynamic = "force-dynamic";

const actionLabels: Record<string, string> = {
  CONTACT_CUSTOMER: "Contatar cliente",
  REQUEST_DOCUMENTS: "Solicitar documentos",
  REVIEW_PROPOSAL: "Revisar proposta",
  SCHEDULE_FOLLOW_UP: "Agendar acompanhamento",
  MARK_CASE_LOST: "Registrar perda",
};

const statusLabels: Record<string, string> = {
  opened: "Aberto",
  active: "Ativo",
  appraisal_completed: "Avaliação concluída",
  awaiting_documents: "Aguardando documentos",
  active_negotiation: "Negociação ativa",
  lost: "Perdido",
  negotiation_lost: "Negociação perdida",
};

const priorityLabels: Record<string, string> = {
  LOW: "Baixa",
  NORMAL: "Normal",
  HIGH: "Alta",
  URGENT: "Urgente",
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function caseIdentifier(pilotCode: string, id: string) {
  return pilotCode || id.slice(0, 8).toUpperCase();
}

export default async function CrmPage() {
  const user = await requireCurrentAppUser("/crm");
  await requirePermission(user, "seller_operations.manage");
  const model = await getMissionControl();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <span>ATENÇÃO OPERACIONAL</span>
          <h1>Mission Control</h1>
          <p>Casos que exigem decisão ou acompanhamento, na ordem de atenção.</p>
        </div>
      </header>

      <dl className={styles.counters} aria-label="Resumo operacional">
        <div data-tone={model.counters.overdue > 0 ? "critical" : "neutral"}>
          <dt>Atrasadas</dt>
          <dd>{model.counters.overdue}</dd>
        </div>
        <div data-tone={model.counters.dueToday > 0 ? "attention" : "neutral"}>
          <dt>Vencem hoje</dt>
          <dd>{model.counters.dueToday}</dd>
        </div>
        <div data-tone={model.counters.noNextAction > 0 ? "attention" : "neutral"}>
          <dt>Sem próxima ação</dt>
          <dd>{model.counters.noNextAction}</dd>
        </div>
        <div data-tone={model.counters.urgentHigh > 0 ? "critical" : "neutral"}>
          <dt>Urgentes / altas</dt>
          <dd>{model.counters.urgentHigh}</dd>
        </div>
      </dl>

      <section className={styles.queue} aria-labelledby="mission-control-queue">
        <div className={styles.queueHeader}>
          <div>
            <span>FILA PRIORIZADA</span>
            <h2 id="mission-control-queue">Casos relevantes</h2>
          </div>
          <strong>{model.cases.length} casos</strong>
        </div>

        {model.cases.length === 0 ? (
          <p className={styles.empty}>Nenhum caso requer atenção operacional agora.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Caso / cliente</th>
                  <th>Status</th>
                  <th>Próxima ação</th>
                  <th>Responsável</th>
                  <th>Prazo</th>
                  <th>Prioridade</th>
                  <th><span className={styles.srOnly}>Comando</span></th>
                </tr>
              </thead>
              <tbody>
                {model.cases.map((item) => {
                  const action = item.nextAction;
                  return (
                    <tr key={item.id} data-attention={item.attention}>
                      <td>
                        <strong>{caseIdentifier(item.pilotCode, item.id)}</strong>
                        <span>{item.customerName || "Cliente não informado"}</span>
                      </td>
                      <td>
                        <span className={styles.status} data-status={item.status}>
                          {statusLabels[item.status] || item.status.replaceAll("_", " ")}
                        </span>
                        {item.lostReason ? <small>Motivo: {item.lostReason}</small> : null}
                      </td>
                      <td>
                        {action ? (
                          <>
                            <strong>{actionLabels[action.actionType] || action.actionType}</strong>
                            <span>{action.context || "Sem contexto adicional"}</span>
                          </>
                        ) : item.lostReason ? (
                          <>
                            <strong>Caso encerrado</strong>
                            <span>Sem próxima ação pendente</span>
                          </>
                        ) : (
                          <>
                            <strong className={styles.missing}>Sem próxima ação</strong>
                            <span>{item.noNextActionReason || "Motivo não registrado."}</span>
                          </>
                        )}
                      </td>
                      <td>{action?.ownerName || action?.ownerId || "—"}</td>
                      <td>{action ? dateFormatter.format(action.dueAt) : "—"}</td>
                      <td>
                        {action ? (
                          <span className={styles.priority} data-priority={action.priority}>
                            {priorityLabels[action.priority] || action.priority}
                          </span>
                        ) : "—"}
                      </td>
                      <td>
                        <Link className={styles.openCase} href={`/casos/${item.id}`}>
                          Abrir caso
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
