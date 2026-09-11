# Checkpoint — Tenant Model V1 aprovado e reconciliação documental

**Data:** 2026-09-10
**Checkout:** `C:\AutoPonteDev\autoponte_work`
**Branch / HEAD:** `codex/mission-control-cockpit` / `9eb6696`

## Estado do marco

`TENANT MODEL V1 — APPROVED`.

As sete decisões do Tenant Model V1 foram aprovadas e registradas no contrato canônico. A reconciliação documental de identidade/acesso e do plano greenfield foi concluída. Nenhuma alteração técnica foi executada.

## Contrato consolidado

- Tenant é a boundary canônica de isolamento; Store pertence a exatamente um Tenant.
- Membership ativa prova pertencimento; roles tenant-scoped são assignments separados. `owner` tem acesso implícito às Stores do Tenant; `manager` e `seller` exigem `StoreAccess` nas operações vinculadas a Store.
- `VehicleSpecification` é global, estritamente técnico e não sensível; `TenantVehicle` é físico, comercial e tenant-scoped. Match Core usa `TenantVehicle` como candidato acionável.
- Raízes tenant-scoped possuem Tenant físico. Filhas herdam Tenant pela FK âncora; `vehicle_matches` é candidato explícito a materialização com validação relacional, condicionado ao contrato final de seus pais tenant-scoped.
- Administrador da plataforma não tem acesso automático a Tenant. Suporte futuro exige grant explícito, limitado, auditável, revogável e com expiração. `service_role` permanece restrito a processos server-side autorizados e nunca a acesso pessoal/interativo.
- Intake público resolve Tenant e Store no servidor por configuração persistida. Seu identificador público é somente routing, não controle de autorização. Intake interno deriva Tenant de Auth + membership ativa.

## Reconciliação realizada

- `MATCH_CORE_V1_IDENTITY_ACCESS_READINESS.md`: TEN-05–TEN-10 foram atualizados como `DECIDIDO`; TEN-12 tornou-se `NÃO APLICÁVEL NESTA FASE`, pois não há dados reais de legado. Referências a Vehicle foram alinhadas a `TenantVehicle` versus `VehicleSpecification` sem reabrir decisões de Match Core.
- `MATCH_CORE_V1_TENANT_MIGRATION_PLAN.md`: o plano efetivo passou a ser greenfield; backfill, quarentena, classificação de legado, batches e rollback de dados foram removidos do plano ativo e preservados somente em apêndice histórico não normativo.
- Decisões de Policy, Access Scope, Source→Vehicle e Candidate Assembly que não conflitam com Tenant Model V1 foram preservadas como pendências/bloqueios próprios.

## Fora do escopo desta sessão

Nenhum schema, migration, Supabase, RLS, grant, API, runtime, Storage, integração, teste de runtime, deploy ou alteração em Production foi executado.

## Próximo passo recomendado

Preparar o desenho físico V1 revisável, derivado exclusivamente do Tenant Model V1 aprovado, sem executar migration. Antes disso ainda precisam de definição: matriz de ações/permissões e Store, contrato final de `vehicle_matches`, SV-06–SV-09, limites técnicos de `VehicleSpecification`/identidade física e grant de suporte se necessário.

## Verificação e Git

- Revisar somente o diff de `TENANT_MODEL_V1_PROPOSED.md`, `MATCH_CORE_V1_IDENTITY_ACCESS_READINESS.md`, `MATCH_CORE_V1_TENANT_MIGRATION_PLAN.md` e deste checkpoint.
- Executar `git diff --check` antes do commit documental.
- O worktree continha alterações rastreadas e arquivos não rastreados preexistentes, preservados fora deste marco. O commit deve incluir exclusivamente os quatro documentos desta sessão.
