# Matriz canônica de revisão funcional — AutoPonte CRM

- Data-base: 2026-09-03 (Europe/Berlin)
- Checkout observado: `C:\AutoPonteDev\autoponte_work`
- Fonte estrutural: `artifacts/homologation/route-inventory.json`, `coverage-matrix.csv` e `untested-routes.md`
- Regra de evidência: os artefatos são inventário estrutural, não homologação funcional. Seus 42 registros de rota e 21 testes `PLANEJADO` não comprovam funcionamento.

## Contrato funcional

- Jornada comercial: **Lead → Qualificação → Negociação → Venda**.
- Funil é visão transversal da jornada.
- Match substitui Oportunidades como capacidade de descoberta e qualificação.
- Negociação é o workspace operacional.
- Cases permanece como estrutura interna e não deve ser destino mental ou navegável do vendedor.

## Matriz rastreável prioritária

| Módulo / rota ou fluxo | Finalidade e perfil previsto | Origem de navegação | CTAs / formulários e handlers | API / operação / persistência | Estado real | Evidência | Teste necessário | Correção necessária | Prioridade |
|---|---|---|---|---|---|---|---|---|---|
| Mission Control `/crm` | Visão operacional priorizada; vendedor, gerente e admin | Login e navegação principal | Links para negociações, agenda, funil, Match e ações rápidas | Leitura via `getMissionControl`; `commercial_cases`, tarefas e eventos | **Parcial** | `app/crm/page.tsx`, `lib/commercial-cases/service.ts` | E2E autenticado por perfil; destinos e contadores com dados reais | Remover linguagem/links legados de Oportunidades e validar os destinos das ações rápidas | P0 |
| Leads `/leads` e `/leads/novos` | Entrada e acompanhamento de leads; vendedor | Mission Control, funil e clientes | Filtros/formulário; “Novo lead” atualmente pode cair em `/oportunidades` | Leitura de clientes/oportunidades; criação ainda distribuída entre fluxos legados | **Divergente** | `app/leads/page.tsx`, `app/leads/novos/page.tsx`, `features/mission-control/components/MissionControl.tsx` | Jornada desde entrada até qualificação, incluindo persistência e retorno | Definir entrada canônica de Lead e eliminar criação pela superfície legada de Oportunidades | P0 |
| Qualificação | Converter Lead em demanda qualificada antes de Match/Negociação; vendedor | Lead e formulários comerciais | Seletores de demanda/FIPE existem, mas não formam etapa canônica única | `buyer_profiles`, `trade_ins` e serviços distribuídos | **Parcial** | `features/vehicle-demand/components/DesiredVehicleSelector.tsx`, `app/api/buyer-profiles/route.ts`, `app/api/trade-in/route.ts` | Critérios de qualificação, transição de estado e rejeições | Formalizar contrato e estado de Qualificação na jornada | P0 |
| Funil `/funil` | Visão transversal da jornada; vendedor/gestão | Mission Control | Cards por estágio encaminham a Leads, Match, Propostas ou Negociação | Leitura via `getMissionControl`; baseada internamente em Cases | **Parcial** | `app/funil/page.tsx`, `lib/commercial-cases/mission-control.ts` | Contagens, valores e links de cada estágio com fixtures reais | Alinhar estágios a Lead → Qualificação → Negociação → Venda e desacoplar linguagem de Cases | P0 |
| Match `/matches` | Descoberta e qualificação de compatibilidades; vendedor | Mission Control e Funil | “+ Gerar Match” aponta para `/oportunidades/nova`; contato WhatsApp condicionado | Leitura de `vehicle_matches` + `buyer_profiles`; sem handler canônico Match → Negociação | **Divergente** | `app/matches/page.tsx` | Geração, revisão, consentimento, descarte e promoção de Match | Criar ação/contrato explícito de qualificação e promoção para Negociação; remover dependência de `/oportunidades/nova` | P0 |
| Match → Negociação | Promover Match qualificado a workspace operacional | Card/ação do Match | Não há CTA/handler canônico identificado | Persistências de Match e `commercial_cases` existem sem transição explícita | **Bloqueado** | `db/schema.ts`, `lib/commercial-cases/service.ts`, ausência de handler dedicado em `app/api` | Idempotência, autoria, histórico e vínculo entre entidades | Definir comando transacional e evento auditável para criar/associar Negociação | P0 |
| Negociações `/negociacoes` | Lista de negociações em execução; vendedor/gestão | Mission Control, Agenda, Aprovações e Funil | Cada linha abre `/negociacoes/:id` | Leitura de `commercial_cases` | **Funcional, não homologado** | `app/negociacoes/page.tsx`, `lib/commercial-cases/service.ts` | E2E autenticado, filtros/ownership e casos vazios | Homologar e garantir que só itens promovidos apareçam | P0 |
| Workspace `/negociacoes/:id` | Conduzir etapa, contato, próxima ação e observações | Lista, Agenda e Aprovações | Handlers de edição, etapa, contato, próxima ação e nota | `app/api/cases/[id]`; mutações em Cases/eventos | **Parcial** | `app/negociacoes/[id]/page.tsx`, `features/opportunity-workspace/components/OpportunityWorkspace.tsx`, `app/api/cases/[id]/route.ts` | Cada comando, autorização, erro, auditoria e concorrência | Renomear contratos externos de Opportunity/Case para Negociação sem perder a estrutura interna | P0 |
| Propostas `/propostas` | Visão de propostas da negociação; vendedor | Funil, relatórios e workspace | Lista leva ao workspace | Leitura operacional; não há workflow completo de proposta identificado | **Parcial** | `app/propostas/page.tsx`, `lib/commercial-cases/service.ts` | Criar/revisar/aceitar/rejeitar proposta com auditoria | Definir entidade/estado e comandos canônicos dentro da Negociação | P1 |
| Aprovações `/aprovacoes` | Revisões gerenciais e exceções; gestor/admin | Navegação e tarefas | Itens abrem a Negociação | Derivada de tarefas; outros tipos explicitamente não simulados | **Parcial** | `app/aprovacoes/page.tsx` | Permissões, decisão e trilha de auditoria | Criar workflow explícito apenas para tipos aprovados | P1 |
| Agenda `/agenda` | Próximas ações e atividade; vendedor/gestão | Mission Control e workspace | Filtros e links abrem Negociação | Leitura de `case_tasks` e eventos | **Funcional, não homologado** | `app/agenda/page.tsx`, `app/crm/page.tsx` | Hoje/atrasadas/atividade, timezone e ownership | Atualizar documentação antiga e homologar sem reintroduzir agenda demonstrativa | P1 |
| Venda | Fechamento da jornada e entrega | Negociação/Funil | Estado fechado, entrega e resultado aparecem dispersos | `commercial_cases.final_outcome`, entregas e eventos | **Parcial** | `app/entregas/page.tsx`, `lib/commercial-cases/service.ts`, `db/pilot-schema.ts` | Fechamento, venda perdida, entrega e consistência financeira | Definir transição final Negociação → Venda e sua persistência canônica | P0 |
| Cases `/casos`, `/casos/:id` | Estrutura técnica interna | Rotas diretamente acessíveis | Lista e workspace próprios duplicam Negociação | `app/api/cases`, `commercial_cases`, tarefas e eventos | **Divergente** | `app/casos/page.tsx`, `app/casos/[id]/page.tsx`, `app/api/cases/route.ts` | Garantir ausência na navegação e compatibilidade interna das APIs | Retirar superfícies `/casos*` da jornada do vendedor; preservar serviço/modelo interno | P0 |
| Legado `/oportunidades*` | Antiga carteira/criação/workspace | Clientes, veículos, trocas, propostas, relatórios, Mission Control e Match | CTAs “Nova oportunidade”, cards e filtros | `trade_ins`, `app/api/opportunities`, componentes Opportunity | **Divergente** | `app/oportunidades/**`, `components/crm/OpportunityViewToggle.tsx` | Inventário completo de entradas e equivalência dos destinos novos | Substituir links por Lead, Match ou Negociação conforme intenção; depois desativar a superfície legada | P0 |

## Inventário dos links remanescentes para `/oportunidades`

| Origem | Uso atual | Destino canônico esperado | Prioridade |
|---|---|---|---|
| `features/mission-control/components/MissionControl.tsx` | “Novo lead” e “Avaliar troca” | Lead e Qualificação; troca permanece como dado de entrada | P0 |
| `app/matches/page.tsx` | “+ Gerar Match” | Fluxo próprio de Match/Qualificação | P0 |
| `app/clientes/page.tsx` | Criar/abrir oportunidade | Lead/Negociação conforme estado | P0 |
| `components/crm/OpportunityViewToggle.tsx` | Abrir detalhe legado | Negociação ou Match qualificado | P0 |
| `app/veiculos/[id]/page.tsx` | Criar oportunidade a partir do veículo | Criar Match/Qualificação | P0 |
| `app/trocas/page.tsx` | Ver oportunidades | Match ou Funil | P0 |
| `app/propostas/page.tsx` e `app/relatorios/page.tsx` | Abrir funil comercial | `/funil` | P0 |
| `components/mission-control/Shell.tsx` e `PipelineLive.tsx` | Nova oportunidade / funil completo | Lead/Match e `/funil` | P1; componentes podem ser legados |

## Critério de homologação futura

Uma linha só poderá passar a **funcional homologado** quando houver evidência reproduzível de navegação, autorização, handler, API, persistência, erro controlado e efeito observado no ambiente autorizado. Contagem estática de elementos não atende esse critério.

## P0 ordenado

1. Congelar a taxonomia e o mapa de estados da jornada Lead → Qualificação → Negociação → Venda.
2. Inventariar e reclassificar cada link para `/oportunidades` pela intenção real.
3. Definir e testar a transição transacional Match → Negociação.
4. Alinhar o Funil aos estados canônicos e remover dependência conceitual de Cases.
5. Consolidar Negociação como única superfície operacional e manter Cases apenas internamente.
6. Definir a transição Negociação → Venda e o fechamento auditável.
7. Montar homologação E2E autenticada por perfil para a jornada completa, sem considerar o inventário estrutural como aprovação.
