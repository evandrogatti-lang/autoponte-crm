import { CoreShell, coreStyles as styles } from "../../components/crm/CoreShell";

export default function ConfiguracoesPage() {
  return (
    <CoreShell
      activeHref="/configuracoes"
      title="Configurações"
      subtitle="Central de administração do sistema AutoPonte."
    >
      <div>
        <section className={styles.card}>
          <h2>Operação</h2>

          <div className={styles.list}>
            <a href="/parceiros">
              <span>Parceiros</span>
              <small>Cadastro e integração</small>
            </a>

            <a href="/veiculos">
              <span>Estoque</span>
              <small>AutoPonte e parceiros</small>
            </a>

            <a href="/matches">
              <span>Correspondências IA</span>
              <small>Compatibilidade entre demanda e veículos</small>
            </a>

            <a href="/recomendacoes">
              <span>Recomendações IA</span>
              <small>Ações e decisões sugeridas</small>
            </a>
          </div>
        </section>

        <section className={styles.card}>
          <h2>Administração do sistema</h2>

          <div className={styles.list}>
            <div>
              <strong>Usuários e acessos</strong>
              <small>Em preparação</small>
            </div>

            <div>
              <strong>Perfis e permissões</strong>
              <small>Em preparação</small>
            </div>

            <div>
              <strong>Segurança</strong>
              <small>Em preparação</small>
            </div>

            <div>
              <strong>Integrações</strong>
              <small>Em preparação</small>
            </div>
          </div>
        </section>
      </div>
    </CoreShell>
  );
}