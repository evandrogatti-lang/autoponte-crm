AUDITORIA UX/UI — AutoPonte CRM
================================

Este documento é o registro canônico cumulativo da Auditoria UX/UI do projeto AutoPonte.
Fonte auxiliar: docs/PATCH_GROUP_2.md (não modificado nem promovido a canônico).

1) Objetivo e escopo
- Objetivo: identificar e corrigir problemas críticos de usabilidade e acessibilidade da fundação de navegação compartilhada (sidebar/topbar/nav móvel) sem alterar regras de negócio.
- Escopo: componentes de navegação compartilhada em `components/crm/CRMAppShell.*`, regras CSS associadas, e comportamentos móveis/ARIA. Exclusões: engines, integrações, banco de dados, persistência e lógica de negócio.

2) Regra crítica
- Regra obrigatória: NÃO alterar regras de negócio, engines, integrações, persistência, ou fluxos transacionais. Correções devem ser estruturais/visuais e reversíveis.

3) Arquitetura e componentes de referência
- Componentes principais auditados:
  - `components/crm/CRMAppShell.tsx` — shell compartilhado (sidebar, topbar, nav, mobile toggle).
  - `components/crm/CRMAppShell.module.css` — estilos base/responsivos ligados ao shell.
  - `components/apdl/index.tsx` — primitives de UI utilizadas.
- Observação: a navegação móvel é construída como um grid de 5 colunas dentro de `<nav className={styles.nav}>` quando `@media (max-width:760px)`.

4) Diagnóstico consolidado
- Sintomas relatados: botão "Mais" invisível/coluna vazia no mobile; quinto slot da grade aparece vazio; em produção o botão estava no DOM mas com largura reduzida (~25px).
- Causa final verificada: o botão `.mobileMoreButton` estava fora de `<nav className={styles.nav}>` (filho de `aside.sidebar`), portanto não fazia parte da grade móvel; isso deixou a quinta coluna vazia e o botão comprimido fora do grid.

5) Patch Group 1 — Acessibilidade (resumo)
- Ações: adição de `aria-hidden` em ícones, `aria-current="page"` em links ativos, focus-visible visível, atalhos/teclado para busca, e melhorias na gestão de foco.
- Arquivos impactados: `components/crm/CRMAppShell.tsx`, `components/apdl/index.tsx`.
- Validações: ESLint focal e `tsc --noEmit` em arquivos modificados passaram.

6) Patch Group 2 — Navegação móvel (resumo)
- Ação principal: mover o botão `mobileMoreButton` para dentro de `<nav className={styles.nav}>` como último filho (5º item na grade móvel). Mantive `mobileMorePanel` fora do `nav`.
- CSS: manter a regra base de ocultação e regra mobile de exibição sem `!important`:
  - `.mobileMoreButton { display: none; }`
  - `@media (max-width: 760px) { .mobileMoreButton { display: flex; } }`
- Objetivo: corrigir posicionamento horizontal/compressão sem alterar o grid nem comportamento.

7) Causa definitiva e solução do botão “Mais”
- Causa: estrutura DOM incorreta — botão fora do container de grade móvel (`nav.nav`).
- Solução: movi o botão para ser um filho direto de `nav.nav`, garantindo que ele participe do grid de 5 colunas no mobile; preservei todos os handlers, refs e ARIA.

8) Arquivos e commits envolvidos
- `components/crm/CRMAppShell.module.css`
  - Commit: `71677e5` — ajuste inicial de CSS (visibilidade base); enviado e sincronizado.
  - Commit: `9877372` — atualização mínima de CSS para manter ocultação base + exibição mobile (mantida ao mover o botão).
- `components/crm/CRMAppShell.tsx`
  - Commit: `9877372` — movimentação estrutural do botão para dentro do `nav`.
- Notas: `docs/PATCH_GROUP_2.md` foi criado como fonte auxiliar.

9) Validações técnicas e visuais
- Lint/TypeScript:
  - ESLint (focal): passou (`LINT_EXIT=0`) nos arquivos alterados.
  - TypeScript (`tsc --noEmit`): passou (`TSC_EXIT=0`) após ajustes.
- Validação visual:
  - Deploy na Vercel: build automático executado e validado em produção.
  - Teste visual: aprovado — botão "Mais" aparece como quinto item, comportamentos (Esc, click-outside, foco) funcionando.

10) Limitações ambientais conhecidas
- Build local: houve falha durante `npm run build` por `EPERM` ao manipular artefatos em `.next` devido a bloqueo do Windows/OneDrive. Classificado como bloqueio ambiental; não foi tratado por alterações de código.

11) Pendências priorizadas (Patch Groups 3–5)
- Group 3 (Prioridade alta): revisar **responsividade fina** do bottom bar em iOS Safari (gestos e safe-area), validar overflow horizontal e gaps na grade quando labels encurtam.
- Group 4 (Prioridade média): testes de acessibilidade automatizados (axe, Lighthouse CI) em páginas gerenciadas e não-gerenciadas; corrigir contrastes residuais.
- Group 5 (Prioridade baixa): unificar variantes de ícone e tokens CSS para reduzir duplicação e facilitar temas futuros.

12) Histórico de atualizações
- 2026-08-05: `DECISAO_TECNICA_VALIDACAO_TYPESCRIPT_2026-08-05.md` (documento de decisão TypeScript).
- 2026-08-06: MAPA_ACAO_PRIORITARIA e planejamento.
- 2026-08-13: Patch Group 1 aplicado e registrado; Patch Group 2 aplicado, commit `9877372` enviado; validações e teste visual aprovados; EPERM local registrado.

Declarações finais
- Confirma-se que nenhuma regra de negócio, engine, integração, persistência ou dado foi alterado durante estes patches.

---
Registro gerado em: 2026-08-13
Autor: gerado por automação assistida (registrado por Evandro Gatti)

13) Status Onda 1A
- Onda 1A concluída: alterações limitadas ao `components/crm/CRMAppShell.tsx` (conversão de anchors internos para `Link` e atualização dos links do painel móvel). Commit associado: `05c7b55`. Status: concluída em produção — validação visual e funcional aprovada.

14) Status Onda 1B — CONCLUÍDA
- Commit: `92e2525` — refactor(ux): standardize EnterpriseSidebar navigation.
- Arquivos alterados: `components/apdl/index.tsx`, `app/globals.css`, `docs/AUDITORIA_UX_UI_AUTOPONTE.md`.
- Alterações: renderização condicional em `EnterpriseSidebar` — internos (`/…`) → `Link`; âncoras hash (`#`, `#…`) → `<span aria-disabled="true">`; externos preservados como `<a>`.
- Validações: ESLint focal (`LINT_EXIT=0`), TypeScript `--noEmit` (`TSC_EXIT=0`), validação visual e funcional aprovada em produção pelo responsável (2026-08-13).
- Regras de negócio: nenhuma regra de negócio, engine, integração, persistência ou dado foi alterado.
- Status: concluída — push para `origin/main` confirmado; HEAD e origin/main em `92e2525`.

15) Status Onda 1C
- Commit: `588c02e` — refactor(ux): standardize Mission Control navigation.
- Constatação de escopo: a inspeção da cadeia ativa de `/crm` confirmou que esse commit alterou componentes legados em `components/mission-control/*`, não consumidos por `/crm`; a implementação não atingiu o Mission Control exibido em produção.
- Correção de escopo implementada, aguardando validações: `features/mission-control/components/MissionControl.tsx` passou a tratar a navegação interna ativa com `Link`; hashes foram preservados como anchors nativos.
- Pendência funcional: os destinos semanticamente questionáveis das Ações rápidas ativas permanecem inalterados e requerem decisão funcional posterior: "Novo lead" → `/oportunidades`, "Avaliar troca" → `/oportunidades`, "Buscar veículo" → `/matches` e "Nova proposta" → `/propostas`.
- Regras de negócio: nenhuma regra de negócio, engine, integração, persistência ou dado foi alterado.
- Status: correção de escopo aguardando validação técnica e visual; não concluída nesta etapa.

16) Anchor de agenda e evolução funcional
- Correção técnica: o anchor `/crm#agenda` foi restaurado pelo commit `181c3d8` com `id="agenda"` na seção "AGENDA DE HOJE"; a navegação por fragmento foi validada.
- Avaliação de produto: o comportamento atual apenas desloca a página para o resumo já visível da agenda de hoje. É redundante e tem baixa utilidade operacional; não corresponde à expectativa de uma agenda completa.
- Escopo: uma agenda completa é evolução funcional separada, fora do escopo estritamente visual desta auditoria. Nenhum modelo, banco de dados, integração, persistência ou regra operacional foi alterado.
- Proposta futura, sem implementação: rota própria `/agenda`; visualizações diária, semanal e mensal; compromissos, tarefas, retornos, follow-ups e próximas ações; vínculo com clientes, oportunidades, responsáveis e prazos; filtros por vendedor, loja, prioridade e tipo; sincronização futura com Google Calendar.
- Pré-requisitos para a evolução: definir modelo de dados, permissões, persistência, regras operacionais e contrato de integração antes de criar a experiência de agenda.
- Opções temporárias avaliadas: (A) manter "Ver agenda" com o comportamento atual; (B) renomear para "Ir para agenda de hoje", alinhando o texto ao comportamento. Recomendação: B, por reduzir expectativa incorreta sem introduzir fluxo, dados ou comportamento novo. Não aplicada sem autorização.
- Nomenclatura temporária: a opção B foi aprovada e implementada em `MissionControl.tsx`; o anchor preserva `/crm#agenda` e passa a exibir "Ir para agenda de hoje". A agenda completa permanece apenas como proposta futura, sem implementação.

17) Ondas tipográficas T1 e T1.1
- Onda T1 concluída: commit `60a4f11` — melhoria da legibilidade dos textos operacionais do Mission Control. TypeScript e build aprovados; validação visual aprovada.
- Onda T1.1 concluída: commit `89db904` — complementação tipográfica no Conselheiro AutoPonte e no Funil Comercial. TypeScript e build aprovados; validação visual aprovada em desktop e mobile.
- Escopo preservado: não houve alterações em cálculos, estágios, probabilidades, regras do Flow Engine ou regras de negócio. A densidade e a estrutura da experiência foram preservadas, sem regressões visuais observadas.
- Próxima pendência: T2, referente à tipografia responsiva do `CRMAppShell` e da barra inferior mobile, permanece pendente e não iniciada. A agenda completa permanece uma evolução funcional futura.

18) Fechamento operacional — 2026-08-13
- T2A concluída e validada: legibilidade da barra inferior mobile.
- F1 concluída: filtros operacionais para Estoque, Estoque de Parceiro e Trocas.
- Correções F1 concluídas: limpar filtros; preservação de contexto do estoque parceiro; retorno à ficha com URL de origem; normalização de busca por acentos/caixa; status "Todos" como padrão de busca; e remoção de parâmetros vazios enviados pelo formulário.
- Busca por placa `LT5FA89` validada em produção. Os diagnósticos temporários de console e interface foram removidos após a validação.
- TypeScript e builds foram aprovados nas etapas publicadas. Não houve mudanças em banco, schema, APIs, IA, Flow Engine, cálculos ou regras de negócio.

19) Pendências após o fechamento
- Validação visual final da busca pelo formulário após o último deploy.
- Filtros de Potenciais Clientes.
- Filtros de Parceiros: busca, estado, cidade, status, tipo, integração, estoque e atualização. Bairro depende de cadastro, schema e migration futura.
- Edição real de Veículos, Clientes e Parceiros permanece pendente como onda funcional separada.
- T2B safe-area e T2C rail de tablet permanecem pendentes.
- Mostrar versão/commit ativo no CRM e criar futura tela de status operacional.
