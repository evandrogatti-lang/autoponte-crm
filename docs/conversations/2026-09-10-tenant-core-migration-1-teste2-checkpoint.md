# Checkpoint — Tenant Core Migration 1 aplicada em teste2

**Data:** 2026-09-10
**Checkout:** `C:\AutoPonteDev\autoponte_work`
**Ambiente alterado:** somente Supabase `teste2` (`prcmlynykncfgzwluoef`)
**Produção:** não acessada

## Marco concluído

A migration `drizzle/0023_tenant_core_fail_closed.sql` foi aplicada exclusivamente em `teste2` por conexão PostgreSQL administrativa, com TLS validado por CA oficial, `rejectUnauthorized=true` e validação de hostname.

Ela criou somente `tenants`, `stores`, `memberships`, `role_assignments` e `store_access`. Não criou extensão, trigger/função de `updated_at`, policy RLS, grant de cliente, `FORCE ROW LEVEL SECURITY`, bootstrap, nem alterou tabela existente.

## Estado estrutural confirmado

- As cinco tabelas existem com PKs, FKs, checks, uniques e índices previstos.
- `memberships.user_id` referencia `auth.users(id)`.
- As FKs compostas em `store_access` comprovam, no banco, que Membership e Store pertencem ao mesmo Tenant.
- RLS está habilitada nas cinco tabelas, sem `FORCE` e com zero policies.
- `anon` e `authenticated` não possuem privilégios de `SELECT`, `INSERT`, `UPDATE` ou `DELETE` nas cinco tabelas.
- Os dez testes negativos diretos, cinco tabelas para cada papel de cliente, falharam com `42501`.
- A chave pública de `teste2` foi aceita; a Data API retornou `401` para cada uma das cinco tabelas.

## Preflight e segurança

- `gen_random_uuid()` está disponível nativamente no PostgreSQL 17 de `teste2`; nenhuma extensão foi criada.
- O papel executor confirmou privilégio `REFERENCES` sobre `auth.users` e `CREATE` em `public`.
- Não havia conflito prévio com os cinco nomes de tabela.
- Default privileges do executor concederiam acesso a `anon` e `authenticated`; o `REVOKE` explícito da migration removeu essa janela.
- Security Advisor não pôde ser consultado: não há token de Management API configurado e o banco não expõe função de advisor. A validação equivalente por catálogo confirmou RLS ativo, zero policies e zero privilégios de cliente.

## Próximo passo autorizado pendente

Preparar **bootstrap controlado**, por conexão PostgreSQL administrativa/migration role: criar Tenant, Store, Membership ativa e RoleAssignment de homologação sem conceder acesso ao cliente. Grants mínimos e policies RLS ficam para migration posterior, atômica e somente após bootstrap e testes.

## Git e escopo de commit

Este marco deve versionar somente `drizzle/0023_tenant_core_fail_closed.sql` e este checkpoint. Todo dirty/untracked preexistente permanece preservado fora do commit.
