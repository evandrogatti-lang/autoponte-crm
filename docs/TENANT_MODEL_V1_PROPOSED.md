# AutoPonte CRM — Tenant Model V1

**Status:** `TENANT MODEL V1 — APPROVED`
**Decisão formal registrada:** `TENANT MODEL — DECISION 1/7 — APPROVED`
**Decisão formal registrada:** `TENANT MODEL — DECISION 2/7 — APPROVED`
**Decisão formal registrada:** `TENANT MODEL — DECISION 3/7 — APPROVED`
**Decisão formal registrada:** `TENANT MODEL — DECISION 4/7 — APPROVED`
**Decisão formal registrada:** `TENANT MODEL — DECISION 5/7 — APPROVED`
**Decisão formal registrada:** `TENANT MODEL — DECISION 6/7 — APPROVED`
**Decisão formal registrada:** `TENANT MODEL — DECISION 7/7 — APPROVED`
**Escopo desta rodada:** arquitetura conceitual. Não autoriza migration, schema, RLS, grants, runtime, Supabase ou Production.
**Contexto de produto informado em 2026-09-10:** não existem dados reais de produção a preservar ou migrar. Compatibilidade, backfill, quarentena e tratamento de legado não fazem parte desta proposta.

## 1. Objetivo e precedência

Definir uma fronteira organizacional que permita isolamento seguro de dados e autorização contextual antes da primeira implementação de tenant/RLS.

Este modelo aprovado preserva a decisão de que Tenant não é `partner`, `crm_users.store_id`, e-mail, metadata, payload, URL ou ownership informal.

### Divergência documental a resolver

`MATCH_CORE_V1_IDENTITY_ACCESS_READINESS.md` marca TEN-05 a TEN-10 como `PRECISA_DECISÃO`, mas `MATCH_CORE_V1_TENANT_MIGRATION_PLAN.md` afirma que parte delas foi aprovada e pressupõe backfill/quarentena. A premissa de legado deste segundo documento conflita com o contexto atual. Este documento é a referência arquitetural aprovada para o Tenant Model V1; os demais documentos não são reescritos nesta rodada e precisam de reconciliação posterior explícita.

## 2. Modelo conceitual aprovado

```text
Tenant / Organization
  └── Store (0..N)
        └── unidade operacional do Tenant

User (identidade autenticada)
  └── TenantMembership (0..N por User; 0..N por Tenant)
        ├── status
        ├── TenantRoleAssignment (0..N; tenant-scoped)
        └── StoreAccess (0..N, quando a operação exigir recorte por Store)

Os role assignments são separados da Membership. A matriz detalhada de permissões permanece fora do escopo deste modelo.
```

### Entidades e cardinalidades

| Relação | Cardinalidade | Significado |
|---|---:|---|
| Tenant → Store | 1:N | Uma empresa/conta pode operar uma ou mais lojas. |
| User → TenantMembership | 1:N | A mesma pessoa pode participar de tenants diferentes. |
| Tenant → TenantMembership | 1:N | Um tenant possui vários membros ativos ou inativos. |
| TenantMembership → StoreAccess | 0:N | A autorização de loja é opcional e pode cobrir mais de uma loja. |
| StoreAccess → Store | N:1 | Cada concessão se refere a uma loja do mesmo tenant da membership. |

### Identidade canônica do tenant

**APPROVED:** `Tenant` é uma entidade própria, com ID opaco e estável. É a única boundary organizacional de dados e autorização.

**ALTERNATIVE:** fazer `partner` ou uma loja existente cumprir esse papel. Rejeitada como recomendação: mistura relação comercial ou unidade operacional com identidade autorizativa.

**IMPLEMENTATION DETAIL:** a nomenclatura pública (`tenant`, `organization` ou equivalente) não altera a fronteira conceitual aprovada.

## 3. Função da Store

**APPROVED:** Store é uma unidade operacional de um Tenant, nunca a identidade do Tenant. O escopo de loja é aplicado somente em ações que efetivamente o necessitem (por exemplo, fila, inventário, operação local ou atribuição comercial).

**APPROVED:** Membership permanece no nível do Tenant. A vinculação a loja é uma relação própria de acesso (`StoreAccess` conceitual), capaz de representar mais de uma loja para a mesma membership. `owner` possui acesso implícito às Stores do próprio Tenant; `manager` e `seller` exigem `StoreAccess` para operações vinculadas a Store.

**ALTERNATIVE:** guardar uma única `store_id` opcional na membership. É mais curta, mas impede múltiplas lojas e transforma uma evolução provável em mudança estrutural.

**IMPLEMENTATION DETAIL:** a matriz detalhada de ações que exigem Store permanece futura. Até ser definida, Store não reduz nem amplia acesso por inferência.

## 4. Quatro camadas de proteção e autorização

| Camada | Responsabilidade | Não prova |
|---|---|---|
| Vercel Preview | Protege o ambiente de preview | tenant, role ou acesso a dados |
| Supabase Auth | Prova a identidade autenticada | membership, role ou escopo de dados |
| Membership e RBAC | Decide se aquele usuário ativo pode realizar uma ação naquele tenant/store | filtragem física de todas as linhas |
| PostgreSQL RLS | Impõe o escopo de linhas e o `WITH CHECK` no banco | produto, workflow ou RBAC completo |

Login válido não equivale a autorização. A proteção do Preview não participa de nenhuma decisão de tenant.

## 5. Membership, RBAC e administrador da plataforma

### Membership

**APPROVED:** a membership é a relação canônica User ↔ Tenant e contém, conceitualmente, identidade do usuário, Tenant e status. Uma operação só considera um tenant depois de comprovar membership ativa. Roles são atribuídas por assignments tenant-scoped separados da Membership.

O contexto ativo pode ser solicitado pelo cliente, mas sua validade deve ser derivada no servidor/banco a partir da identidade autenticada e da membership; um `tenant_id` enviado pelo cliente nunca é autorização por si só.

### Roles de negócio

| Role | Escopo recomendado | Responsabilidade inicial |
|---|---|---|
| `owner` / Proprietário | Tenant; acesso implícito às Stores do próprio Tenant | Administração comercial e de membros do próprio tenant. |
| `manager` / Gerente | Tenant; `StoreAccess` em ação vinculada a Store | Gestão operacional e visibilidade autorizada no tenant. |
| `seller` / Vendedor | Tenant; `StoreAccess` em ação vinculada a Store | Trabalho comercial dentro do escopo atribuído. |

**APPROVED:** papel é contextual ao Tenant por assignment separado da Membership e não pode reutilizar RBAC global como autorização final. O administrador da plataforma permanece fora deste modelo. A matriz detalhada de permissões não foi definida. Ownership de Case/Task continua responsabilidade operacional, não concessão de tenant.

### Administrador da plataforma AutoPonte

**APPROVED:** é uma função separada de `owner`, `manager` e `seller`; não recebe membership, `StoreAccess`, Tenant ativo ou acesso automático aos dados de qualquer Tenant.

Se suporte administrativo for necessário futuramente, exige grant explícito, limitado ao Tenant, escopo e prazo necessários, auditável, revogável e com expiração. Ausência, expiração ou inconsistência do grant bloqueiam acesso. RLS não trata administrador da plataforma como bypass.

`service_role` pode ser usado exclusivamente por processos server-side autorizados; nunca concede acesso pessoal ou interativo de administrador da plataforma aos dados de Tenant.

## 6. Entidades raiz tenant-scoped

| Entidade | Classificação recomendada | Motivo |
|---|---|---|
| `buyer_profiles` | Raiz tenant-scoped | Contém intenção e dados pessoais do comprador. |
| `trade_ins` | Raiz tenant-scoped | É oportunidade/intake comercial do tenant. |
| `consignments` | Raiz tenant-scoped | É intake comercial e contém dados pessoais. |
| `customers` | Raiz tenant-scoped | Representa relação comercial e PII. |
| `commercial_cases` | Raiz tenant-scoped | É o agregado operacional/comercial. |

**APPROVED:** essas raízes recebem escopo físico de tenant na futura implementação, pois são seus próprios pontos de entrada, consulta e RLS.

`partners` permanece entidade de negócio. Pode fornecer estoque ou serviços, mas não concede acesso e não é fonte canônica de tenant.

## 7. Decisão para Vehicles

### APPROVED — Modelo C refinado

Separar `VehicleSpecification`, catálogo técnico global, de `TenantVehicle`, veículo físico e operação comercial tenant-scoped. A entidade global não representa automaticamente um veículo físico específico.

| Conceito | Escopo | Conteúdo permitido |
|---|---|---|
| `VehicleSpecification` | Global | marca, modelo, versão, motorização, combustível, transmissão, ano/model year e demais atributos técnicos compartilháveis, estritamente não sensíveis. |
| `TenantVehicle` | Exatamente um Tenant; Store quando aplicável | VIN/chassi, placa, estoque, preço, custos, disponibilidade, origem comercial, partner, Store, mídia operacional, publicação, lifecycle e demais dados que revelem a operação do Tenant. |

`VehicleSpecification` não concede autorização nem deve permitir reconstruir atividade comercial de tenants. O Match Core usa `TenantVehicle` como candidato acionável; `VehicleSpecification` somente enriquece atributos técnicos.

Não criar `VehicleOffer` separado na V1 sem necessidade funcional comprovada, como múltiplas ofertas simultâneas, ofertas independentes do lifecycle do estoque ou campanhas comerciais paralelas. Na V1, `TenantVehicle` representa o ativo físico e sua oferta/estoque comercial.

O `vehicles` atual mistura esses papéis: contém identificação técnica, `inventory_scope`, `partner_id`, preços, custos, proprietário e status. Sem dados reais a preservar, a futura refatoração deve corrigir a separação antes do lançamento, em vez de declarar essa tabela híbrida como global ou tenant-scoped por conveniência.

### ALTERNATIVE — Modelo A

Todo veículo pertence a um tenant. É simples e pode ser suficiente para uma única operação, mas impede um catálogo técnico compartilhado sem duplicação.

### ALTERNATIVE — Modelo B

Veículos tenant-scoped e veículos globais na mesma entidade. Não recomendado: cria estados ambíguos e policies muito mais fáceis de errar.

### Limites ainda abertos

Detalhar o conjunto técnico de atributos de `VehicleSpecification` e a regra de identidade física sem introduzir VIN/chassi, placa ou outro identificador de veículo físico no catálogo global. Esses identificadores não devem criar visibilidade cross-tenant por si sós.

### Divergência documental mantida

`MATCH_CORE_V1_TENANT_MIGRATION_PLAN.md` trata `vehicles` como entidade tenant-scoped única. O Modelo C refinado exige reconciliação desse plano antes de qualquer implementação, schema ou migration.

## 8. Entidades filhas e materialização de tenant

**APPROVED:** raízes tenant-scoped possuem `tenant_id` físico. Filhas usam **B — derivação por FK** como padrão: a policy percorre uma FK para a raiz/aggregate tenant-scoped; não se duplica `tenant_id` indiscriminadamente.

**APPROVED (exceção):** usar **C — tenant físico + validação relacional** somente quando houver justificativa estrutural clara. Relações que agregam múltiplas raízes tenant-scoped devem provar coerência entre todos os pais envolvidos. `vehicle_matches` é candidato explícito: se materializar Tenant físico, a integridade futura deve validá-lo contra todos os pais tenant-scoped efetivamente exigidos pelo contrato final da entidade, sem pressupor que Buyer, Case e `TenantVehicle` serão sempre simultaneamente obrigatórios. Validação exclusiva de aplicação não é suficiente.

| Tabela filha | Modelo recomendado | Âncora de tenant / condição de integridade |
|---|---|---|
| `vehicle_matches` | C | candidato a tenant físico; deve coincidir com todos os pais tenant-scoped exigidos pelo contrato final. |
| `opportunity_events` | B | `trade_ins`. |
| `vehicle_evidence_observations` | B | `TenantVehicle`. |
| `vehicle_data_provenance` | B | `TenantVehicle`. |
| `vehicle_scores` | B | `TenantVehicle`. |
| `vehicle_lifecycle_events` | B | `commercial_cases`; `TenantVehicle` referido deve pertencer ao mesmo tenant. |
| `vehicle_cost_entries` | B | `commercial_cases`; `TenantVehicle` do mesmo tenant. |
| `vehicle_work_orders` | B | `commercial_cases`; `TenantVehicle` do mesmo tenant. |
| `vehicle_media` | B | `commercial_cases`; objeto Storage vinculado ao mesmo tenant. |
| `vehicle_publications` | B | `commercial_cases`; `TenantVehicle` do mesmo tenant. |
| `vehicle_price_history` | B | `commercial_cases`; `TenantVehicle` do mesmo tenant. |
| `match_interactions` | B | `commercial_cases`; Match do mesmo tenant. |
| `customer_intents` | B | `commercial_cases`; Customer e Buyer do mesmo tenant. |
| `proposals` | B | `commercial_cases`; Customer, Match e `TenantVehicle` do mesmo tenant. |
| `commercial_contracts` | B | `commercial_cases` e Proposal do mesmo tenant. |
| `payment_records` | B | `commercial_cases` e Proposal do mesmo tenant. |
| `vehicle_deliveries` | B | `commercial_cases`; Customer e `TenantVehicle` do mesmo tenant. |
| `post_sale_followups` | B | `commercial_cases`; Customer do mesmo tenant. |
| `case_tasks` | B | `commercial_cases`; owner precisa de membership ativa no tenant. |

**ALTERNATIVE:** materializar tenant em toda tabela filha. Facilita alguns filtros, mas duplica fonte de verdade e multiplica risco de inconsistência. Não é recomendada.

**FUTURE DOMAIN DECISION:** dados de evidência e proveniência permanecem dependentes de `TenantVehicle` até decisão específica demonstrar que um atributo é estritamente técnico, não sensível e não permite reconstruir operação comercial.

## 9. Impacto no schema atual

| Área atual | Impacto | Direção futura |
|---|---:|---|
| `crm_users.store_id` texto | Alto | Descontinuar como fonte de autorização; migrar conceito para Store/StoreAccess. |
| `crm_roles` / `crm_role_permissions` globais | Alto | Reavaliar como catálogo de capacidades; concessão deve ocorrer na membership contextual. |
| `seller_profiles.partner_id` texto | Médio | Preservar somente como relação operacional, sem grant implícito. |
| `vehicles.inventory_scope` e `partner_id` | Alto | Refatorar o modelo híbrido conforme a decisão de Vehicles. |
| `commercial_cases.partner_id` | Alto | Não usar como tenant; manter apenas se houver significado comercial próprio. |
| Raízes sem tenant físico | Alto | Preparar modelagem tenant-first, sem backfill/legado. |
| Filhas com vários pais | Alto | Exigir integridade de mesmo tenant entre suas FKs antes de RLS. |

Nenhuma dessas direções autoriza apagar, alterar ou criar estruturas nesta rodada.

## 10. Impacto no código e testes existentes

| Dependência observada | Impacto | Motivo |
|---|---:|---|
| `lib/access-control.ts` | Alto | `requirePermission()` consulta usuário/role/permission globais, sem tenant ativo. |
| `app/app-auth.ts` | Alto | Sessão identifica usuário, mas não carrega membership nem contexto tenant validado. |
| Administração de usuários e seller profiles | Alto | APIs usam e exibem `store_id`, roles globais e `partner_id`. |
| APIs de veículos | Alto | Leitura e mutação por role global; consultas não iniciam por tenant. |
| Intake de trade-in, consignment e buyer profile | Alto | Entradas públicas não possuem um roteamento tenant comprovado. |
| Mission Control/Cases | Alto | Carrega conjuntos globais e filtra por owner/role em memória. |
| Páginas de estoque, parceiros, leads, matches e relatórios | Alto | Fazem consultas globais a recursos que deverão ser tenant-scoped. |
| Storage de mídia | Alto | Chaves atuais não carregam boundary tenant verificável. |
| Testes `case-auth`, `case-actions`, seller e veículo | Médio/alto | Validam RBAC global e precisarão de testes positivos e negativos por tenant/store. |

**APPROVED:** intake público usa configuração persistida vinculada a exatamente um Tenant. O cliente não escolhe livremente `tenant_id` ou `store_id`; o servidor resolve o contexto a partir da configuração válida.

## 11. Estratégia futura de RLS

O desenho alvo deve permitir policies distintas para `SELECT`, `INSERT`, `UPDATE` e `DELETE` que provem, no banco:

1. usuário autenticado;
2. membership ativa no tenant do recurso;
3. role/capacidade suficiente para a ação;
4. StoreAccess válida quando a ação exigir Store;
5. coerência de todos os pais de uma entidade filha;
6. `WITH CHECK` impedindo escrever tenant ou Store fora do escopo autorizado.

RLS deve derivar acesso de relações persistidas e confiáveis no banco. Filtro de UI, payload, URL, e-mail, role global, `partner_id` ou `store_id` textual não substituem essa prova.

## 12. Homologação sem lockout

Antes de habilitar RLS restritiva em `teste2`, a sequência proposta é:

1. criar um tenant de teste;
2. criar Store de teste apenas se o cenário a requerer;
3. criar a membership ativa do usuário de homologação;
4. provisionar a autorização e StoreAccess necessárias conforme decisões aprovadas;
5. validar Supabase Auth;
6. validar membership;
7. validar RBAC contextual;
8. validar RLS com cenários positivos e cross-tenant negativos.

Preview Vercel permanece separado desse fluxo. A ausência de membership testável é bloqueador de ativação de RLS, não motivo para bypass.

## 13. Intake público tenant-aware

**APPROVED:** cada intake público usa uma configuração persistida, ativa e vinculada a exatamente um Tenant. O identificador público é somente mecanismo de resolução/routing: pode ser opaco e não previsível, mas sua confidencialidade não é controle de autorização.

- O servidor resolve Tenant, tipo de intake e Store opcional exclusivamente pela configuração; uma Store configurada pertence ao mesmo Tenant.
- O cliente não envia `tenant_id` ou `store_id` como autorização, nem ganha membership, role, `StoreAccess` ou leitura de dados de Tenant.
- Configuração inexistente, inativa, inconsistente ou incompatível com o tipo de intake falha fechada.
- Intake interno autenticado deriva Tenant de Auth + membership ativa, não do payload.
- Segurança futura depende da configuração server-side, validação de input e controles de abuso; resposta pública não revela Tenant ou registros internos.

## 14. Riscos principais

| Risco | Mitigação arquitetural |
|---|---|
| Cross-tenant por `tenant_id` enviado pelo cliente | Derivar autorização de Auth + membership persistida no banco. |
| Cross-tenant entre FKs de entidades filhas | Ancora única ou integridade futura que force pais do mesmo tenant. |
| `partner`/`store_id` virar atalho de permissão | Proibi-los como identidade e como prova suficiente de acesso. |
| RBAC global conceder acesso a todos os dados | Tornar role válida somente no tenant da membership. |
| Lockout na homologação | Provisionar e validar usuário de teste antes de RLS restritiva. |
| Admin de plataforma virar bypass invisível | Separar a função e exigir decisão explícita para suporte excepcional. |
| Modelo híbrido de veículo expor oferta comercial | Separar `VehicleSpecification` global de `TenantVehicle` tenant-scoped. |

## 15. Registro de decisões aprovadas

1. **APPROVED:** Tenant é a identidade canônica de isolamento organizacional e Store é unidade operacional subordinada a exatamente um Tenant. `TENANT MODEL — DECISION 1/7 — APPROVED`.
2. **APPROVED:** membership tenant-scoped, múltiplas memberships por usuário e `StoreAccess` como relação separada. Membership ativa é a prova canônica de pertencimento ao Tenant; `StoreAccess` só referencia Store do mesmo Tenant da membership; contexto do cliente exige validação contra Auth + membership persistida. `crm_users.store_id`, payload, URL, e-mail e ownership não substituem membership. `TENANT MODEL — DECISION 2/7 — APPROVED`.
3. **APPROVED:** assignments de roles tenant-scoped separados da Membership, com códigos `owner`, `manager` e `seller` e labels de UI Proprietário, Gerente e Vendedor. `owner` possui acesso implícito às Stores do próprio Tenant; `manager` e `seller` exigem `StoreAccess` para operações vinculadas a Store; administrador da plataforma fica fora deste modelo. A matriz detalhada de permissões permanece pendente. `TENANT MODEL — DECISION 3/7 — APPROVED`.
4. **APPROVED:** Modelo C refinado: `VehicleSpecification` é catálogo técnico global, estritamente não sensível; `TenantVehicle` é o veículo físico + estoque/operação comercial de exatamente um Tenant. VIN/chassi, placa, preço, custos, disponibilidade, origem, partner, Store, mídia, publicação e lifecycle não pertencem ao catálogo global. Match Core usa `TenantVehicle`; `VehicleOffer` separado não entra na V1 sem necessidade funcional comprovada. A divergência com o plano de migration de `vehicles` permanece para reconciliação antes de implementação. `TENANT MODEL — DECISION 4/7 — APPROVED`.
5. **APPROVED:** raízes tenant-scoped possuem `tenant_id` físico; filhas herdam Tenant pela FK da raiz como padrão; tenant físico em filha exige justificativa estrutural clara. Relações com múltiplas raízes tenant-scoped devem provar coerência entre os pais. `vehicle_matches` é candidato explícito a tenant físico + validação contra todos os pais tenant-scoped efetivamente exigidos pelo contrato final, sem pressupor Buyer, Case e `TenantVehicle` simultaneamente obrigatórios. O cliente não escolhe autorização apenas enviando `tenant_id`. `TENANT MODEL — DECISION 5/7 — APPROVED`.
6. **APPROVED:** administrador da plataforma é separado de `owner`, `manager` e `seller`; não recebe membership, `StoreAccess` ou acesso automático a tenants. Suporte futuro exige grant explícito, limitado, auditável, revogável e com expiração; RLS não o trata como bypass. `service_role` fica restrito a processos server-side autorizados e nunca concede acesso pessoal ou interativo de administrador a dados de Tenant. `TENANT MODEL — DECISION 6/7 — APPROVED`.
7. **APPROVED:** intake público usa configuração persistida vinculada a exatamente um Tenant; Tenant e Store são resolvidos exclusivamente no servidor. O identificador público é somente routing, não controle de autorização, mesmo quando opaco e não previsível. Intake público não concede membership, role, `StoreAccess` ou leitura; intake interno autenticado deriva Tenant de Auth + membership ativa; configuração inválida, inativa ou inconsistente falha fechada. `TENANT MODEL — DECISION 7/7 — APPROVED`.

Não são necessárias decisões de backfill, quarentena ou compatibilidade de dados legados no estado informado.

---

`TENANT MODEL V1 — APPROVED`
