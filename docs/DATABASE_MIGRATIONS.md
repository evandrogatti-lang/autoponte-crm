# Banco e migrações

## Fonte de verdade

- `db/*.ts` é a representação tipada usada pela aplicação.
- `drizzle/*.sql` é o histórico SQL imutável do produto.
- `supabase/*.sql` é legado congelado. Não adicionar novas migrações nesse diretório.
- Novas mudanças PostgreSQL devem receber o próximo número sequencial em `drizzle/` e ser acompanhadas pela alteração equivalente em `db/`.

## Histórico legado

`drizzle/meta/_journal.json` e as migrações `0000_heavy_winter_soldier.sql`, `0001_wet_abomination.sql` até `0006_lying_wrecker.sql` pertencem ao protótipo SQLite. O journal não representa o PostgreSQL de staging e não deve ser usado com `drizzle-kit migrate`.

`supabase/002_opportunity_workspace.sql` e `supabase/003_desired_vehicle_fipe_profile.sql` são cópias exatas de `drizzle/0007_opportunity_workspace.sql` e `drizzle/0008_desired_vehicle_fipe_profile.sql`. Elas permanecem apenas para preservar o histórico.

## Situação verificada em staging

Auditoria read-only realizada em 2026-08-28 pelo Session Pooler:

- as dez colunas de lifecycle das migrações 0019 e 0021 existem em `public.vehicles`;
- constraints de origem, lifecycle, blockers e estados terminais existem;
- `commercial_cases_acquisition_mode_check` aceita o modo `sale` da migração 0020;
- `vehicle_lifecycle_events.case_id` usa `ON DELETE SET NULL`;
- triggers de contexto comercial e readiness estão ativos;
- não há lifecycle nulo, blockers em estado terminal ou referências órfãs na amostra integral;
- existem dois veículos históricos em `AVAILABLE` sem mídia/publicação pronta; o trigger 0021 protege novas transições, mas preservou esses registros anteriores deliberadamente;
- staging não possui tabela de migrations da aplicação; as tabelas encontradas pertencem apenas a `auth`, `realtime` e `storage` do Supabase.

## Procedimento operacional

1. Alterar o schema em `db/` e criar uma migração PostgreSQL idempotente em `drizzle/`.
2. Adicionar teste que compare os campos/constraints críticos com o SQL.
3. Validar em banco descartável ou staging.
4. Executar inspeção read-only depois da aplicação.
5. Registrar no relatório de release qual migração foi aplicada e em qual ambiente.

Enquanto não existir um ledger PostgreSQL da aplicação, não executar `drizzle-kit migrate` nem assumir que o journal SQLite indica o estado remoto.
