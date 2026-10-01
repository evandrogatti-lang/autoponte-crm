# Checkpoint — Tenant Core RLS Policy 1 validada em teste2

**Data:** 2026-09-10
**Checkout:** `C:\AutoPonteDev\autoponte_work`
**Ambiente alterado:** somente Supabase `teste2` (`prcmlynykncfgzwluoef`)
**Produção:** não acessada

## Marco concluído

A migration `drizzle/0024_tenant_core_read_policies.sql` foi aplicada transacionalmente somente em `teste2`, depois do bootstrap controlado e da criação de fixtures QA dedicadas.

As fixtures são limitadas a `teste2`: seis usuários Auth QA não pessoais, um Tenant secundário, duas Stores adicionais, cinco Memberships ativas com RoleAssignments e dois StoreAccess ativos. Nenhum e-mail real, senha, JWT, refresh token ou chave administrativa foi registrado em arquivos versionados.

## Matriz JWT validada

- JWTs reais foram emitidos e verificados para owner de homologação, usuário sem Membership, usuário de outro Tenant, manager com e sem StoreAccess e seller com e sem StoreAccess.
- `owner` visualiza as Stores do próprio Tenant; `manager` e `seller` visualizam somente a Store com StoreAccess ativo.
- Usuário sem Membership não visualiza registros do Tenant Core.
- O usuário do Tenant secundário visualiza somente seu próprio Tenant e Store; leituras cross-tenant foram bloqueadas inclusive com IDs conhecidos.
- Memberships, RoleAssignments e StoreAccess de terceiros permanecem invisíveis.

## Estado de autorização confirmado

- RLS permanece habilitada nas cinco tabelas e existem exatamente cinco policies de leitura esperadas.
- `authenticated` possui somente `SELECT` nas tabelas do Tenant Core.
- `anon` e `PUBLIC` não possuem leitura indevida.
- INSERT, UPDATE e DELETE permanecem bloqueados; as probes retornaram `42501`.
- Não houve alteração de APIs, runtime, outras tabelas ou Production.

## Próximo passo autorizado pendente

Desenhar as **policies de escrita controlada** do Tenant Core, com grants e policies atômicos, antes de qualquer aplicação em `teste2`.

## Git e escopo de commit

Este marco deve versionar somente `drizzle/0024_tenant_core_read_policies.sql` e este checkpoint. Todo dirty/untracked preexistente permanece preservado fora do commit.
