# RFC-0012 - Distribuicao Inteligente e Gestao de Atendimento Comercial

- **Status:** proposta para aprovacao arquitetural
- **Data:** 2026-08-16
- **Escopo desta etapa:** documentacao, integracao conceitual e plano seguro de implementacao
- **Fora do escopo:** codigo de producao, migrations, alteracao de regras existentes, commit e push
- **Decisao esperada:** aprovar o modelo de dominio, limites de ownership, faseamento e criterios de entrada do MVP

## 1. Resumo

A AutoPonte deve evoluir de uma entrega simples de lead para uma orquestracao mensuravel do atendimento:

`cliente -> intencao/demanda -> match com veiculo -> parceiro -> vendedores elegiveis -> disponibilidade -> atribuicao/agendamento -> atendimento -> acompanhamento -> proposta -> venda/perda -> metricas e aprendizado`

O resultado desejado e entregar progressivamente o cliente certo ao vendedor adequado, para o veiculo certo, no momento adequado. A RFC cria a base para isso sem transformar vendedor em um usuario generico nem substituir os motores existentes.

A distribuicao deve otimizar capacidade de executar o atendimento corretamente. Conversao e venda sao dimensoes importantes, mas nao podem dominar isoladamente o score nem justificar concentracao permanente de leads.

## 2. Evidencias do repositorio analisado

A analise do workspace em 2026-08-16 encontrou somente o arquivo aberto no editor, `app/crm/page.tsx`; o diretorio persistente nao apresentou `docs`, Git, package manifest, schema ou demais rotas no filesystem acessivel. A leitura desse arquivo revelou:

- autenticacao por `requireChatGPTUser("/crm")`;
- acesso de dados por `getDb()` e Drizzle ORM;
- entidade atualmente consultada chamada `tradeIns`;
- mapeamento para `TradeInRow` por `buildMissionControl`;
- renderizacao pela feature `MissionControl`;
- campos observados: cliente, cidade, marca, modelo, ano, veiculo desejado, estimativas, status, categoria de lead, proximo follow-up e criacao.

Nao foi possivel confirmar, nesta copia acessivel, os modulos de parceiros, clientes, leads, oportunidades, estoque, veiculos, propostas, agenda, usuarios/permissoes, APIs, Supabase ou os motores ADE Core, Business Temperature, Opportunity DNA, Confidence, Explainability, Recommendation e Flow Engine.

**Regra de integracao:** a implementacao deve primeiro localizar e confirmar esses contratos. Se existirem em outra camada ou branch, esta RFC deve ser aplicada sobre eles. Nenhuma entidade ou regra existente deve ser duplicada ou substituida por inferencia desta analise.

## 3. Objetivos e nao objetivos

### Objetivos

- cadastrar vendedores como perfis operacionais e comerciais pertencentes a parceiros;
- conhecer disponibilidade real, incluindo agenda propria da loja/vendedor;
- selecionar vendedores elegiveis com regras explicaveis e auditaveis;
- monitorar SLA e permitir redistribuicao sem perder historico;
- medir qualidade operacional, atendimento, resultado e fairness;
- conectar o ciclo a clientes, leads, oportunidades, veiculos, propostas e relatorios;
- preparar dados para calibracao futura baseada em evidencia.

### Nao objetivos desta RFC

- construir agora o Seller Matching Engine;
- escolher pesos definitivos do Seller Performance Score;
- introduzir IA antes de existir historico confiavel;
- migrar banco, alterar schema ou criar endpoints;
- mudar os motores ADE Core, Business Temperature, Opportunity DNA, Confidence, Explainability, Recommendation ou Flow Engine;
- substituir o modelo atual de `tradeIns`/Mission Control sem mapeamento aprovado.

## 4. Modelo conceitual

### 4.1 Entidades novas ou a formalizar

| Entidade | Papel | Ownership conceitual |
|---|---|---|
| `SellerProfile` | perfil operacional/comercial do vendedor | parceiro; campos administrativos sob governanca AutoPonte |
| `SellerSpecialty` | marcas, categorias, faixas e tipos atendidos | parceiro, com catalogo controlado |
| `SellerAvailability` | janelas disponiveis, indisponiveis e capacidade | vendedor/parceiro |
| `SellerCalendarSource` | origem da agenda propria ou AutoPonte | parceiro/vendedor |
| `Appointment` | compromisso e seu ciclo | dono do compromisso, com acesso compartilhado controlado |
| `Assignment` | atribuicao de cliente/oportunidade a vendedor | AutoPonte como orquestradora |
| `AssignmentAttempt` | aceite, recusa, expiração e redistribuicao | AutoPonte; historico imutavel |
| `SlaPolicy` | politica configuravel por contexto/parceiro | AutoPonte com overrides aprovados |
| `SlaInstance` | contagem e estado de um SLA aplicado | AutoPonte |
| `SellerMetricSnapshot` | metricas por janela e dimensao | AutoPonte; agregado sem substituir fatos |
| `SellerScoreVersion` | versao do calculo e seus fatores | AutoPonte; nenhum peso fixo nesta RFC |
| `OperationalEvent` | telemetria do ciclo e auditoria | AutoPonte, com escopo de acesso |
| `RedistributionCase` | motivo, gatilhos e resultado da redistribuicao | AutoPonte |

Essas entidades sao propostas conceituais. Antes de qualquer migration, deve ser feito um inventario de tabelas, tipos e relacoes existentes para reutilizar entidades equivalentes.

### 4.2 Seller Directory

O cadastro deve conter, no minimo:

- identidade e referencia ao parceiro/loja;
- funcao, status operacional e periodo de validade;
- disponibilidade atual e fonte da agenda;
- especialidades, marcas, categorias, faixas de preco e tipos de veiculo;
- capacidade operacional configuravel;
- historico de atendimentos AutoPonte;
- metricas operacionais e comerciais por periodo, sempre com janela, amostra e versao;
- flags de elegibilidade, bloqueio e consentimento de compartilhamento.

Vendedor nao e apenas usuario. Um usuario/perfil de autenticacao pode ser associado a `SellerProfile`, mas o perfil possui ciclo de vida, metricas, agenda, especialidades e relacao com parceiro proprios.

### 4.3 Agenda e disponibilidade

`Appointment` deve suportar criacao, alteracao, cancelamento, confirmacao, comparecimento e no-show. Deve registrar origem (`autoponte`, `loja`, `vendedor`, `integracao`), veiculo/oportunidade relacionados, participantes, local/canal, horario, fuso e ator da mudanca.

A disponibilidade efetiva resulta da combinacao de:

- janelas de trabalho e capacidade do vendedor;
- compromissos AutoPonte;
- compromissos proprios da loja/vendedor;
- bloqueios, ferias e indisponibilidade;
- conflitos e regras de antecedencia;
- status operacional do vendedor.

A primeira entrega deve permitir uma fonte de verdade claramente definida. Integracoes externas de calendario ficam condicionadas ao inventario de APIs existente.

## 5. Elegibilidade, matching e fairness

O fluxo de selecao deve ser separado em duas etapas:

1. **Elegibilidade:** filtros obrigatorios: parceiro correto, status ativo, permissao, especialidade compativel, capacidade, horario, canal e ausencia de bloqueio.
2. **Priorizacao:** ordenacao explicavel dos elegiveis, com score versionado, desempate deterministico, rotacao e limites de concentracao.

Fatores futuros incluem responsividade, aceite, tempo ate primeiro contato, follow-up, atualizacao do CRM, cumprimento de proximos passos, qualidade operacional, processo, disponibilidade, aderencia cliente/veiculo, especializacao, comparecimento, proposta, negociacao, conversao e historico recente.

O score nao deve ser implementado com pesos arbitrarios nesta etapa. Deve guardar fatores, qualidade da amostra, periodo, versao e razao legivel. Fairness deve prever:

- limite de exposicao e de leads simultaneos;
- rotacao entre vendedores elegiveis;
- protecao contra concentracao por historico;
- tratamento de vendedor novo sem penalizacao por falta de amostra;
- exclusao de metricas contaminadas por falta de disponibilidade ou por atribuicoes invalidadas;
- auditoria de distribuicao por parceiro, equipe, especialidade e periodo.

Os motores existentes de recomendacao e explainability, quando confirmados, devem continuar donos do match de cliente/veiculo. O matching de vendedor deve consumir seus sinais e expor sua propria explicacao, sem recalcular ou sobrescrever ADE Core, Business Temperature, Opportunity DNA ou Confidence.

## 6. Seller Performance Score

O modelo inicial e multidimensional, sem pesos definitivos:

| Dimensao | Exemplos de metricas necessarias |
|---|---|
| A. Responsividade | tempo para aceitar; tempo ate primeiro contato; taxa de aceite |
| B. Acompanhamento | follow-ups no prazo; intervalo entre contatos; continuidade |
| C. Disciplina operacional | completude, atualidade e consistencia dos campos/etapas |
| D. Cumprimento do processo | agendamento, confirmacao, visita, proposta, negociacao e encerramento |
| E. Resultado | oportunidades qualificadas, propostas, vendas, perdas e conversao |

Para calibrar pesos depois, sera necessario coletar denominadores, timestamps, amostras, censura de dados, contexto do lead/veiculo, disponibilidade real, canal, parceiro, sazonalidade e motivo de perda. O resultado comercial deve ser analisado junto da qualidade de execucao, nunca isoladamente.

## 7. SLA e redistribuicao

`SlaPolicy` deve ser configuravel por tipo de atendimento, parceiro, canal, horario e etapa. Exemplos: aceite, primeiro contato, tempo maximo sem atualizacao, follow-up esperado e confirmacao de visita. Valores definitivos permanecem fora desta RFC.

Fluxo proposto:

`lead atribuido -> SLA iniciado -> alerta -> ausencia de acao -> janela de liberacao -> liberacao/redistribuicao -> novo vendedor -> continuidade`

A redistribuicao deve:

- preservar atribuicoes e tentativas anteriores;
- registrar motivo, regra, timestamps e atores;
- evitar duplicidade de contato e conflito de ownership;
- manter a oportunidade e o historico do cliente;
- notificar os envolvidos conforme permissao;
- permitir pausa justificada e override auditado;
- produzir `seller_reassigned` e indicadores de qualidade.

Nenhum cliente pode ficar indefinidamente preso a um vendedor sem atendimento minimo. O SLA nao deve ser hard-coded em componentes ou regras de dominio.

## 8. Telemetria e audit trail

Usar a convencao de eventos ja existente, depois de confirmada. Se nao houver convencao, a proposta inicial e nomes em `snake_case`:

`lead_created`, `seller_eligible`, `seller_assigned`, `seller_accepted`, `first_contact`, `follow_up`, `appointment_created`, `appointment_confirmed`, `customer_arrived`, `no_show`, `proposal_created`, `negotiation_started`, `sale_completed`, `opportunity_lost`, `seller_reassigned`.

Cada evento deve carregar `event_id`, tipo, timestamp, origem, ator, parceiro, vendedor quando aplicavel, cliente/oportunidade/veiculo, correlation id, versao do schema e dados minimos necessarios. Eventos de negocio e trilha de auditoria nao devem depender apenas de texto de log.

## 9. Integracao com o CRM atual

| Area existente | Integracao proposta |
|---|---|
| Clientes | referencia ao cliente existente; evitar duplicar identidade e consentimento |
| Leads | atribuicao, aceite, SLA, contato, origem e redistribuicao |
| Oportunidades | vendedor atual, historico de tentativas, etapa e resultado |
| Parceiros | loja dona da oferta, isolamento, equipe e politicas locais |
| Estoque/veiculos | match existente como entrada; disponibilidade e parceiro como restricoes |
| Propostas | continuidade do fluxo atual e eventos de proposta |
| Agenda | nova capacidade operacional consumindo compromissos de ambas as origens |
| Usuarios/permissoes | autentica usuarios; `SellerProfile` governa operacao comercial |
| Relatorios | funil, SLA, fairness, qualidade, capacidade e conversao |
| Recomendacoes de IA | consumir sinais e explicacoes existentes; nao substituir motores |
| Central de Operacoes | fila de elegibilidade, atribuicao, SLAs, excecoes e redistribuicao |

No arquivo observado, `MissionControl` parece ser a superficie adequada para a operacao, mas isso precisa ser confirmado junto aos componentes e rotas reais antes de desenhar telas definitivas.

## 10. Dados, privacidade e acesso

- Parceiro so visualiza seus vendedores, agenda, leads e metricas permitidos.
- Vendedor visualiza apenas atendimentos e dados de cliente necessarios ao trabalho.
- AutoPonte visualiza o ecossistema e agregados necessários para governanca, com trilha de acesso.
- Ownership deve distinguir entidade do cliente, oferta do parceiro, tarefa do vendedor e orquestracao AutoPonte.
- RLS/politicas existentes, se Supabase for confirmado, devem ser preservadas e estendidas; nao se presume acesso amplo por service role.
- Dados minimos: referencias, status, timestamps operacionais, preferencias relevantes, especialidades, agenda, resultados e motivos de mudanca.
- Dados de contato e historico devem ter retencao, exportacao e eliminacao alinhadas a politica vigente e requisitos legais.
- Historico de atribuicao, SLA, score e auditoria deve ser append-only ou versionado; correcoes nao devem apagar fatos.
- Definir mascaramento, consentimento, base legal, retencao e visibilidade entre AutoPonte, parceiro e vendedor antes do schema.

## 11. UX e navegacao

A proposta deve preservar a auditoria UX/UI existente, cuja localizacao nao estava disponivel nesta copia. Os fluxos necessarios sao:

### Operacao AutoPonte

Cliente -> veiculo -> parceiro -> vendedores elegiveis -> disponibilidade -> motivo da escolha -> atribuir/agendar. Exibir sinais, SLA, conflitos e explicacao do ranking sem esconder alternativas.

### Vendedor

Receber atendimento -> aceitar -> visualizar contexto minimo do cliente e veiculo -> registrar contato -> acompanhar -> atualizar etapa -> registrar proposta/resultado. Estados de aceite, SLA e proximo passo devem ser evidentes.

### Gestor da loja

Equipe -> agenda agregada -> leads e fila -> SLAs -> excecoes -> performance por dimensao. Permitir filtro por periodo, vendedor, origem, veiculo e status.

### Gestao AutoPonte

Ecossistema -> parceiros -> vendedores -> atendimento -> SLAs -> redistribuicoes -> conversao -> qualidade operacional e fairness. Exibir agregados e drill-down auditavel.

Navegacao, rotulos, componentes e acessibilidade devem seguir os padroes confirmados no inventario do front-end; esta RFC nao autoriza uma nova linguagem visual.

## 12. APIs e contratos a planejar

Apos confirmar as APIs existentes, planejar contratos idempotentes para:

- consultar vendedores elegiveis para uma oportunidade/veiculo;
- consultar disponibilidade e conflitos;
- atribuir, aceitar, recusar e liberar atendimento;
- criar, alterar, confirmar e cancelar compromisso;
- registrar contato, follow-up, comparecimento, proposta e resultado;
- consultar e justificar score, SLA e redistribuicao;
- consultar metricas por parceiro, equipe e periodo;
- ingerir eventos de integracoes de agenda.

Cada mutacao deve exigir autorizacao, correlation id, idempotency key quando aplicavel, validacao de ownership, auditoria e resposta de conflito explicita.

## 13. Faseamento aprovado para planejamento

### MVP / Fase 1 - fundacao operacional

- inventario e mapeamento das entidades existentes;
- `SellerProfile` e relacao segura com parceiro/usuario;
- status, especialidades e elegibilidade basica;
- agenda operacional e compromissos de ambas as origens;
- atribuicao manual assistida pela Central de Operacoes;
- historico de atribuicao, aceite, contato e resultado;
- permissao, isolamento e audit trail;
- telas essenciais para operacao, vendedor e gestor;
- testes de contrato e observabilidade basica.

### Fase 2 - metricas, automacoes e regras

- eventos completos do ciclo;
- politicas de SLA configuraveis e alertas;
- liberacao e redistribuicao por regras auditaveis;
- snapshots multidimensionais de performance;
- ranking explicavel por regras, rotacao e fairness;
- relatorios de capacidade, qualidade, SLA e concentracao.

### Fase 3 - matching inteligente baseado em dados

- validar qualidade e volume historico;
- calibrar pesos e intervalos de confianca;
- experimentar modelos de matching com feature store/versionamento;
- avaliar contra baseline de regras e fairness;
- rollout gradual, explicabilidade, kill switch e monitoramento de drift.

Nao iniciar a Fase 3 por intuicao ou com dados insuficientes.

## 14. Plano de implementacao em etapas pequenas

1. Recuperar o inventario completo do repositorio e localizar contratos dos motores preservados.
2. Mapear entidades existentes para o modelo conceitual e registrar duplicidades/decisoes.
3. Aprovar ownership, RLS/permissoes, retencao e fronteira AutoPonte-parceiro.
4. Definir eventos, estados, transicoes, ids e idempotencia.
5. Implementar somente o perfil de vendedor e validacoes de parceiro, com testes de autorizacao.
6. Implementar disponibilidade e compromissos, incluindo conflitos e auditoria.
7. Integrar atribuicao manual e historico na Central de Operacoes.
8. Instrumentar aceite, primeiro contato, follow-up e resultado.
9. Ativar SLA configuravel em modo observacao, depois alertas e redistribuicao controlada.
10. Publicar metricas e baseline de regras com explicacao e fairness.
11. Rodar piloto por parceiro e comparar com baseline antes de automatizar.
12. Avaliar dados para matching inteligente e aprovar experimento separado.

Cada etapa deve ter migration/rollout reversivel, feature flag quando houver risco, logs estruturados, dashboards e criterio de parada.

## 15. Testes necessarios

- unidade: elegibilidade, conflitos de agenda, estados, SLA, fairness e calculo versionado;
- integracao: parceiro/usuario, cliente/lead/oportunidade, veiculo/estoque, proposta e eventos;
- autorizacao/RLS: isolamento entre parceiros, papeis e visibilidade AutoPonte;
- contrato de API: idempotencia, concorrencia, erros e versionamento;
- fluxo: aceite, primeiro contato, follow-up, agendamento, comparecimento, no-show, proposta, venda/perda;
- redistribuicao: timeout, pausa justificada, duplicidade, continuidade e audit trail;
- dados: timestamps, fuso, retencao, agregacao e qualidade dos denominadores;
- UX: responsividade, acessibilidade, estados vazios, conflito, loading e explicacao do ranking;
- carga: consulta de elegibilidade, agenda e eventos;
- seguranca: acesso indevido, escalacao de privilegio, dados pessoais e logs;
- regressao: motores ADE Core, Business Temperature, Opportunity DNA, Confidence, Explainability, Recommendation e Flow Engine;
- rollout: feature flag, reprocessamento seguro e rollback.

## 16. Riscos tecnicos

- duplicar cliente, lead, oportunidade ou calendario por falta de inventario;
- misturar usuario de autenticacao com perfil operacional de vendedor;
- acesso cruzado entre parceiros por ownership ou RLS incompleto;
- score enviesado por baixa amostra, disponibilidade desigual ou concentracao historica;
- redistribuicao criando contato duplicado ou disputa de ownership;
- eventos incompletos impossibilitando SLA e metricas confiaveis;
- conflitos de fuso, recorrencia e integracao de agenda;
- dependencia de contratos nao confirmados do Supabase/APIs;
- regressao silenciosa nos motores de recomendacao existentes;
- adocao de IA antes de haver dados rotulados e baseline;
- custo e latencia de ranking em tempo real;
- exigencias de privacidade, retencao e auditoria subestimadas.

## 17. Decisoes que precisam de aprovacao

- fonte de verdade da agenda e politica para integracoes externas;
- ownership de cada entidade e fronteira de visibilidade AutoPonte/parceiro/vendedor;
- estados oficiais de seller, assignment, appointment e opportunity;
- convencao de eventos e garantia de entrega;
- politica de SLA, pausas, excecoes e autoridade para redistribuir;
- limites de concentracao e criterio de fairness;
- denominadores, janelas e politica de baixa amostra das metricas;
- estrategia de associacao entre usuario e `SellerProfile`;
- requisitos legais de consentimento, retencao e acesso;
- criterios objetivos de entrada e saida de cada fase;
- baseline e guardrails para qualquer futuro modelo inteligente.

## 18. Impacto previsto no CRM atual

O impacto esperado e aditivo e concentrado em atendimento, agenda, distribuicao, telemetria e relatorios. Clientes, leads, oportunidades, veiculos, propostas e motores existentes devem continuar como fontes/consumidores de seus proprios contratos. A principal mudanca operacional futura sera registrar atribuicao e progresso como fatos auditaveis, sem remover o historico atual.

Antes da implementacao, deve ser produzido um mapa de impacto por modulo e uma suite de regressao dos motores preservados. Nenhuma regra de negocio atual deve ser alterada apenas para acomodar a RFC.

## 19. Criterios de pronto para iniciar implementacao

A RFC so deve sair de planejamento quando houver: inventario completo do repositorio; modelo de entidades aprovado; matriz de acesso aprovada; eventos e estados versionados; contratos de API definidos; baseline de distribuicao manual; estrategia de agenda; plano de testes; owners nomeados; feature flags, observabilidade e rollback definidos; e aprovacao formal das decisoes listadas acima.
