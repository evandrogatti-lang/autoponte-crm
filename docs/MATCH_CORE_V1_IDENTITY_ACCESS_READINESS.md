# Match Core V1 — Registro de decisões de identidade e acesso

**Status:** Tenant Model V1 reconciliado; arquitetura aprovada, implementação, migration e integração runtime continuam não autorizadas.
**Base:** `TENANT_MODEL_V1_PROPOSED.md` — `TENANT MODEL V1 — APPROVED`; branch `codex/mission-control-cockpit`.
**Legenda:** `DECIDIDO` = regra fechada; `PRECISA_DECISÃO` = escolha ainda obrigatória; `BLOQUEADO` = depende de decisão, migration ou evidência anterior.

## 1. Resultado da revisão

O `CandidateInput` já pode ser representado estruturalmente, mas ainda não pode ser montado para operação real com segurança. O contrato arquitetural de Tenant, Store, Membership, roles, `VehicleSpecification`, `TenantVehicle` e intake foi aprovado; faltam seu desenho físico revisável, matriz de visibilidade, vínculo canônico Source→`TenantVehicle` e implementação validada.

A opção V1 aprovada separa Tenant de ownership, restringe acesso ao tenant ativo, mantém Store como unidade operacional subordinada e preserva o Candidate Assembly puro. Partner, role, owner e Customer não são Tenant; `TenantVehicle`, e não `VehicleSpecification`, é a identidade operacional candidata a Match.

## 2. Tenant canônico

| ID | Decisão obrigatória | Estado | Impacto | Opção V1 mais simples e segura |
|---|---|---|---|---|
| TEN-01 | Tenant é a fronteira organizacional de isolamento comercial e de dados. | `DECIDIDO` | Impede usar unidade, parceiro ou responsável como boundary implícito. | Adotar `TenantId` opaco e estável, próprio do domínio de acesso. |
| TEN-02 | `crm_users.store_id` representa tenant? | `DECIDIDO` | Evita conceder acesso com base em texto livre sem FK ou entidade `stores`. | Não; tratá-lo como metadado legado até existir modelo explícito. |
| TEN-03 | `partner_id` representa tenant? | `DECIDIDO` | Preserva partner como contraparte/proveniência. | Não; partner só se relaciona com tenant por vínculo explícito futuro. |
| TEN-04 | `inventory_scope` representa tenant? | `DECIDIDO` | Evita converter classificação de estoque em identidade organizacional. | Não; usar apenas como `autoponte`/`partner`. |
| TEN-05 | Qual entidade persistirá tenant? | `DECIDIDO` | Sem identidade persistida não há FK, membership ou RLS confiável. | Tenant é entidade própria, com ID opaco e estável; é a única boundary organizacional e de dados. |
| TEN-06 | Como usuários pertencem a tenants? | `DECIDIDO` | Define a prova canônica de pertencimento. | Membership tenant-scoped, ativa, separada de ownership; assignments de role são relações separadas da Membership. |
| TEN-07 | Usuário pode pertencer a vários tenants? | `DECIDIDO` | Altera seleção de contexto e prevenção de acesso acidental. | Sim; um usuário pode ter zero ou mais memberships. Contexto do cliente só vale após validação contra Auth + membership persistida. |
| TEN-08 | Quais recursos recebem tenant materializado? | `DECIDIDO` | Determina o alcance real das queries fail-closed. | Raízes tenant-scoped possuem Tenant físico: Buyer Profile, Consignment, Trade-in, Customer, Commercial Case e `TenantVehicle`. Filhas herdam por FK; `vehicle_matches` é candidato explícito a Tenant físico + validação relacional, condicionado ao contrato final de seus pais. `VehicleSpecification` é global, técnico e não sensível. |
| TEN-09 | Store participa da autorização V1? | `DECIDIDO` | Texto livre não suporta subescopo seguro. | Store pertence a exatamente um Tenant. `StoreAccess` é relação separada; `owner` tem acesso implícito às Stores do próprio Tenant, enquanto `manager` e `seller` exigem `StoreAccess` em operações vinculadas a Store. A matriz detalhada de ações permanece futura. |
| TEN-10 | Partner participa da autorização V1? | `DECIDIDO` | Partner pode fornecer estoque sem possuir todo o tenant. | Não. Partner é relação comercial; não é Tenant, não concede acesso e não é fonte canônica de autorização. |
| TEN-11 | Como tratar tenant ausente ou divergente? | `DECIDIDO` | Bloqueia geração, ranking e leitura cross-tenant. | Ausente → `unresolved`; conflito explícito → `denied`; nunca inferir. |
| TEN-12 | Como realizar backfill? | `NÃO APLICÁVEL NESTA FASE` | Não existem dados reais a preservar ou migrar. | Não projetar backfill, quarentena ou compatibilidade de legado. Uma futura mudança de premissa exige nova decisão documental. |
| TEN-13 | Tenant pode vir de store, partner, e-mail, cidade ou usuário executor? | `DECIDIDO` | Proíbe atalhos não auditáveis. | Não; exigir vínculo persistido ou contexto explicitamente resolvido. |

**Evidência atual:** não existem entidades físicas de Tenant, Store, Membership ou StoreAccess; `store_id` e `partner_id` são textos sem boundary comum; Buyer Profile, Sources, `vehicles` híbridos, Match, Customer e Case não compartilham `tenant_id`. Isto é gap de implementação, não decisão aberta do modelo.

## 3. Ownership e visibilidade

| ID | Decisão obrigatória | Estado | Impacto | Opção V1 mais simples e segura |
|---|---|---|---|---|
| OWN-01 | Tenant e ownership são conceitos separados. | `DECIDIDO` | Atribuir seller não define nem transfere tenant. | Resolver tenant primeiro e validar owner dentro dele. |
| OWN-02 | Quem pode ser Match owner? | `PRECISA_DECISÃO` | Define fila e responsabilidade comercial. | Um `seller_profile_id` ativo do tenant; `null` antes da atribuição. |
| OWN-03 | Como definir owner inicial? | `PRECISA_DECISÃO` | Autoatribuição pode conceder acesso indevido. | Começar sem owner e exigir atribuição explícita/auditada. |
| OWN-04 | Reviewer pode ser o owner? | `PRECISA_DECISÃO` | Afeta segregação de funções. | Permitir na V1, mas persistir reviewer separadamente. |
| OWN-05 | Como persistir review? | `BLOQUEADO` | O estado atual não guarda revisão V1 auditável. | Aguardar modelo de Match/review; registrar ator, verdict, timestamp e versão imutáveis. |
| OWN-06 | O que seller pode ver? | `PRECISA_DECISÃO` | Define fila própria e não atribuída. | Matches próprios e, com permission específica, fila não atribuída do tenant. |
| OWN-07 | O que manager pode ver? | `PRECISA_DECISÃO` | A role atual não identifica equipe ou tenant. | Somente tenant ativo; gestão por equipes fica adiada. |
| OWN-08 | O que owner/admin pode ver? | `PRECISA_DECISÃO` | Bypass global conflita com isolamento. | `owner` atua somente no próprio Tenant; administrador da plataforma não tem acesso automático e eventual suporte segue grant explícito futuro. A matriz de visibilidade permanece pendente. |
| OWN-09 | `seller_profiles.partner_id` concede estoque inteiro do partner? | `DECIDIDO` | Evita expansão implícita de escopo. | Não; exigir tenant, ação e grant aplicável. |
| OWN-10 | Mudanças de owner/reviewer preservam histórico? | `DECIDIDO` | Garante auditoria. | Eventos imutáveis; projeção aponta para o estado válido mais recente. |

**Evidência atual:** Mission Control filtra seller em memória por Case/task owner; manager/admin recebem o conjunto global carregado; `requirePermission()` é global; não existe role persistida `owner`.

## 4. Source → Vehicle

| ID | Decisão obrigatória | Estado | Impacto | Opção V1 mais simples e segura |
|---|---|---|---|---|
| SV-01 | Qual é a identidade operacional do veículo? | `DECIDIDO` | Garante identidade única para Match acionável. | `TenantVehicle`; `VehicleSpecification` somente enriquece atributos técnicos e não é candidato acionável. |
| SV-02 | Resolver pode criar Vehicle? | `DECIDIDO` | Evita efeitos colaterais e duplicação. | Nunca; ausência resulta em `unresolved`. |
| SV-03 | Quais resultados o resolver produz? | `DECIDIDO` | Impede escolha arbitrária. | `resolved | unresolved | ambiguous`. |
| SV-04 | Vehicle direto pode ser sua própria Source? | `DECIDIDO` | Permite estoque canônico sem vínculo artificial. | Para `TenantVehicle` de estoque, `source.id` pode referir o próprio `TenantVehicle`, após compatibilidade de Tenant. |
| SV-05 | `vehicles.source_type` prova vínculo com Source externa? | `DECIDIDO` | Evita provenance inventada onde falta `source_id`. | Não; o campo atual não prova vínculo. A futura separação de `TenantVehicle` não altera essa regra. |
| SV-06 | Onde persistir Source→Vehicle? | `PRECISA_DECISÃO` | Sem vínculo único, Matches podem discordar sobre o Vehicle. | Criar `source_vehicle_links` tenant-scoped, auditável e revogável. |
| SV-07 | Qual cardinalidade ativa? | `PRECISA_DECISÃO` | Evita uma Source apontar para vários Vehicles. | No máximo um vínculo ativo por `(tenant_id, source_type, source_id)`. |
| SV-08 | Quais métodos podem produzir `resolved`? | `PRECISA_DECISÃO` | Define o nível mínimo de prova. | Aceitar `direct_vehicle` e `explicit_link`; adiar identificador automático. |
| SV-09 | Placa única resolve Consignment automaticamente? | `PRECISA_DECISÃO` | Placa pode estar errada ou fora do tenant. | Apenas sugerir candidato; confirmação auditada cria o vínculo. |
| SV-10 | FIPE/modelo/ano/km resolvem Trade-in? | `DECIDIDO` | Evita confundir similaridade com identidade física. | Não; retornar `unresolved` sem vínculo explícito/identificador verificado. |
| SV-11 | Como tratar vários Vehicles candidatos? | `DECIDIDO` | Elimina desempate por score ou ordem de query. | Retornar `ambiguous` com candidatos/evidências determinísticos. |
| SV-12 | `vehicle_matches.vehicle_id` é vínculo canônico da Source? | `DECIDIDO` | Impede usar associação por Buyer como verdade global. | Não; somente evidência contextual. |
| SV-13 | Case com `opportunity_id + vehicle_id` é vínculo canônico? | `DECIDIDO` | Separa contexto de Negociação da identidade da oferta. | Não; somente evidência contextual sujeita a tenant/modo de aquisição. |
| SV-14 | Persistência/resolução real pode começar? | `BLOQUEADO` | Faltam desenho físico revisado, relação física e política final. | Tenant Model V1 está aprovado; aguardar desenho físico autorizado e SV-06–SV-09. |

**Evidência atual:** Trade-in e Consignment não têm `vehicle_id`; o `vehicles` híbrido atual não tem `source_id`; `vehicle_matches` possui vínculo opcional por Buyer; Consignment tem placa opcional; Trade-in não tem identificador físico no schema. A decisão de `TenantVehicle` ainda não está implementada.

### Contrato mínimo de resolução

```ts
type SourceVehicleResolution =
  | { status: "resolved"; vehicleId: string; method: "direct_vehicle" | "explicit_link"; evidenceIds: readonly string[] }
  | { status: "unresolved"; reasonCodes: readonly SourceVehicleReasonCode[] }
  | { status: "ambiguous"; candidates: readonly VehicleIdentityCandidate[]; reasonCodes: readonly SourceVehicleReasonCode[] };
```

Nunca selecionar arbitrariamente um Vehicle nem criar Vehicle durante resolução.

## 5. `AccessScopeResolver`

| ID | Decisão obrigatória | Estado | Impacto | Opção V1 mais simples e segura |
|---|---|---|---|---|
| ACC-01 | Resolver é puro e recebe fatos carregados? | `DECIDIDO` | Torna autorização determinística e separada de I/O. | Sim; não consultar banco, autenticar ou inferir tenant. |
| ACC-02 | Qual é o resultado? | `DECIDIDO` | Representa ausência de prova sem liberar acesso. | `allowed | denied | unresolved`. |
| ACC-03 | Qual precedência usar? | `DECIDIDO` | Uniformiza fail-closed. | Conflito provado → `denied`; fato ausente → `unresolved`; `allowed` só com todas as provas. |
| ACC-04 | Quais ações existem na V1? | `PRECISA_DECISÃO` | Determina permissions e testes. | `match.read`, `review`, `qualify`, `assign_owner` e `promote`. |
| ACC-05 | Quais fatos do ator são obrigatórios? | `PRECISA_DECISÃO` | Sem snapshot mínimo não há decisão reproduzível. | CRM User/status, tenant ativo, membership/status, role e permissions tenant-scoped. |
| ACC-06 | Quais fatos do recurso são obrigatórios? | `PRECISA_DECISÃO` | Impede autorização baseada só no login. | Tenant do Match, Buyer, Source e Vehicle, mais owner atual. |
| ACC-07 | Quais regras de visibilidade entram na V1? | `PRECISA_DECISÃO` | Define fila própria/não atribuída. | Owner próprio e permission de fila do tenant; adiar team/store/partner. |
| ACC-08 | Admin tem bypass? | `DECIDIDO` | Bypass permitiria acesso cross-tenant não auditado. | Não. Administrador da plataforma não recebe acesso automático; eventual suporte exige grant explícito futuro, nunca bypass. |
| ACC-09 | Cross-tenant entra na primeira V1? | `PRECISA_DECISÃO` | Grants ampliam a superfície de segurança. | Não; negar fora do tenant ativo. |
| ACC-10 | Reason codes são fechados e sem PII? | `DECIDIDO` | Permite auditoria/testes seguros. | Catálogo próprio, estável e determinístico. |
| ACC-11 | `seller_operations.manage` basta? | `DECIDIDO` | Evita reutilizar permission global como política completa. | Não; permissions Match-specific mais tenant/visibilidade. |
| ACC-12 | Resolver pode operar sobre dados reais agora? | `BLOQUEADO` | O modelo foi aprovado, mas Tenant, Membership e matriz ainda não existem fisicamente nem foram validados. | Aguardar desenho físico autorizado, ACC-04–ACC-07, RLS e testes negativos. |
| ACC-13 | RLS habilitada comprova isolamento? | `DECIDIDO` | Evita falsa conclusão de segurança. | Não; exigir policies tenant-scoped testadas pela conexão real da aplicação. |

### Contrato mínimo proposto

```ts
declare function resolveMatchAccessScope(input: {
  action: MatchAccessAction;
  evaluatedAt: string;
  actor: {
    crmUserId: string;
    status: "active" | "inactive" | "unknown";
    activeTenantId: string | null;
    membershipStatus: "active" | "inactive" | "unknown";
    roleCode: string | null;
    permissions: readonly string[];
  };
  resource: {
    matchTenantId: string | null;
    buyerTenantId: string | null;
    sourceTenantId: string | null;
    vehicleTenantId: string | null;
    ownerSellerProfileId: string | null;
  };
  visibility: {
    actorSellerProfileId: string | null;
    canReadTenantQueue: boolean;
  };
}): { status: "allowed" | "denied" | "unresolved"; reasonCodes: readonly MatchAccessReasonCode[] };
```

## 6. Candidate Assembly

| ID | Decisão obrigatória | Estado | Impacto | Opção V1 mais simples e segura |
|---|---|---|---|---|
| ASM-01 | Assembler é composição pura? | `DECIDIDO` | Separa carga, segurança, identidade e domínio. | Sim; receber snapshots/resultados prontos. |
| ASM-02 | Quem fornece `candidateId`/`evaluatedAt`? | `DECIDIDO` | Preserva determinismo. | Caller fornece ambos. |
| ASM-03 | Assembler consulta banco ou autoriza? | `DECIDIDO` | Impede mistura de I/O/política. | Nunca; loaders/resolvers vêm antes. |
| ASM-04 | Assembler cria/persiste entidades? | `DECIDIDO` | Evita efeitos colaterais e avanço de lifecycle. | Nunca criar Vehicle, Customer, Candidate persistido ou Match. |
| ASM-05 | Como mapear `unresolved/ambiguous`? | `DECIDIDO` | Faz incerteza bloquear elegibilidade. | `vehicle: null`; nunca selecionar candidato. |
| ASM-06 | Como validar `resolved`? | `DECIDIDO` | Evita combinar o Vehicle errado. | Exigir `resolvedVehicle.id === resolution.vehicleId`; divergência é erro. |
| ASM-07 | Quem determina `consistency`? | `PRECISA_DECISÃO` | Assembler não pode declarar consistência por ausência de erro. | Receber verdict explícito de verificador puro; ausência vira `unknown`. |
| ASM-08 | Assembler corrige tenant? | `DECIDIDO` | Não esconde falhas de D5. | Não; preservar valores e Access Scope `unresolved/denied`. |
| ASM-09 | Assembler chama `evaluateCandidate()`? | `DECIDIDO` | Mantém composição separada da avaliação. | Não. |
| ASM-10 | Assembler puro pode ser implementado sem migration? | `DECIDIDO` | Define incremento isolado possível. | Sim, após fechar ASM-07 e sem consumidor runtime. |
| ASM-11 | Pode ser conectado a dados reais agora? | `BLOQUEADO` | Tenant, acesso e Vehicle ainda não são comprovados ponta a ponta. | Aguardar resolvers, loaders tenant-first, RLS e testes negativos. |

```ts
declare function assembleCandidateInput(input: {
  candidateId: string;
  evaluatedAt: string;
  buyerIntent: BuyerIntentSnapshot;
  source: SourceCandidateSnapshot;
  vehicleResolution: SourceVehicleResolution;
  resolvedVehicle: VehicleSnapshot | null;
  accessScope: AccessScopeVerdict;
  consistency: "consistent" | "inconsistent" | "unknown";
}): CandidateInput;
```

## 7. Decisões recomendadas para aprovação V1

1. Tenant próprio, memberships explícitas e tenant ativo obrigatório: `DECIDIDO` pelo Tenant Model V1.
2. Store é unidade operacional subordinada, StoreAccess é separado; partner é atributo comercial, nunca Tenant: `DECIDIDO` pelo Tenant Model V1.
3. Um owner opcional por Match; atribuição e review separados e auditáveis.
4. Seller vê próprios Matches e, com permission, fila não atribuída do tenant.
5. Manager fica restrito ao tenant ativo; teams são adiados.
6. Sem cross-tenant na primeira V1, inclusive para administrador da plataforma; suporte futuro exige grant explícito e não é bypass: `DECIDIDO` pelo Tenant Model V1.
7. `source_vehicle_links` é o vínculo canônico; sem auto-resolução por similaridade.
8. Placa de Consignment apenas sugere candidato até confirmação auditada.
9. Trade-in permanece `unresolved` sem vínculo explícito.
10. Assembler recebe consistency explícita e não chama o kernel.

## 8. Ordem obrigatória de fechamento

1. Tenant Model V1: `DECIDIDO`; o desenho físico continua pendente e não é autorizado por este documento.
2. OWN-02–OWN-08: owner, reviewer e visibilidade.
3. ACC-04–ACC-09: ações, inputs, permissions e cross-tenant.
4. SV-06–SV-09: persistência, cardinalidade e métodos Source→`TenantVehicle`.
5. ASM-07: origem do verdict de consistência.
6. Só então propor desenho físico de migration, resolvers puros, loaders tenant-first, RLS e integração. Backfill não faz parte desta fase porque não há dados reais de legado.

## 9. Evidências principais

- `db/schema.ts`, `db/vehicle-schema.ts`, `db/partner-schema.ts`, `db/pilot-schema.ts`
- `lib/access-control.ts`, `app/app-auth.ts`
- `lib/commercial-cases/mission-control.ts`, `lib/commercial-cases/service.ts`
- `lib/match-engine.ts`
- `app/api/vehicles/route.ts`, `app/api/trade-in/route.ts`, `app/api/consignments/route.ts`
- `supabase/004_vehicle_registry.sql`, `006_inventory_partners.sql`, `007_access_control.sql`, `008_seller_operations_mvp.sql`
- `drizzle/0017_e2e_pilot_operational_spine.sql`
- `lib/matches/domain/types.ts`, `lib/matches/adapters/*`
