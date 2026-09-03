# Checkpoint — reparo do login após logout

- Data: 2026-09-03 (Europe/Berlin)
- Branch/PR: `codex/mission-control-cockpit`, PR #10
- Commit inicial: `7ec86fb6056ff55ef301fc6ad3c47e82439b8a26`
- Escopo: somente Supabase `teste2` (`prcmlynykncfgzwluoef`) e Vercel Preview. Production não foi consultada nem alterada.

## Causa confirmada

- O acesso anterior foi uma sessão de recuperação com `login_method=implicit`, não um `signInWithPassword`.
- Os dois `POST /api/auth/password` retornaram `400` localmente antes de chamar `updateUser`; nenhuma senha nova foi gravada.
- O logout executou `signOut({ scope: "local" })`, removeu o estado pendente e funcionou corretamente.
- O usuário permanece existente, confirmado e com provider Email habilitado no Auth de `teste2`.

## Reparo local

- Fluxo canônico SSR: token hash de recuperação/convite, callback `/api/auth/confirm`, `verifyOtp`, cookies SSR e marcador HttpOnly pendente.
- `/nova-senha` só exibe o formulário quando o callback server-side criou o marcador pendente.
- Códigos internos seguros distinguem estado ausente, sessão expirada, política, rate limit, indisponibilidade/configuração e falha do Supabase.
- O marcador pendente é preservado em falhas e consumido somente depois de `updateUser` confirmado.
- Após sucesso: ativa somente convidado aplicável, tenta auditar, encerra a sessão temporária e redireciona ao login.
- Validação fail-closed compara projeto esperado, URL Auth, banco e, quando decodificáveis, chaves JWT.

## Configuração manual concluída em `teste2`

- Configurado no Vercel Preview da branch `codex/mission-control-cockpit`, sem alterar Production:
  - `NEXT_PUBLIC_SUPABASE_URL=https://prcmlynykncfgzwluoef.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key de teste2>`
  - `SUPABASE_SERVICE_ROLE_KEY=<service role key de teste2>`
  - `DATABASE_URL=<conexão do banco de teste2>`
  - `AUTOPONTE_SUPABASE_PROJECT_REF=prcmlynykncfgzwluoef`
  - `NEXT_PUBLIC_SUPABASE_PROJECT_REF=prcmlynykncfgzwluoef`
  - `AUTOPONTE_APP_URL=https://autoponte-crm-git-codex-mission-control-cockpit-auto-ponte.vercel.app`
- Authentication > URL Configuration:
  - Site URL: `https://autoponte-crm-git-codex-mission-control-cockpit-auto-ponte.vercel.app`
  - Redirect URL: `https://autoponte-crm-git-codex-mission-control-cockpit-auto-ponte.vercel.app/api/auth/confirm`
- Authentication > Email Templates > Reset password: o link de ação deve ser:
  - `<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery">Definir nova senha</a>`
- Authentication > Email Templates > Invite user: o link de ação deve ser:
  - `<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=invite">Definir senha e aceitar convite</a>`

- A URL anterior `/nova-senha` foi preservada temporariamente na allowlist.

## Validações locais

- TypeScript: passou (`tsc --noEmit`).
- ESLint relevante: passou.
- Auth, ambiente e RBAC: 17 testes passaram.
- `git diff --check`: passou; somente avisos informativos de conversão LF/CRLF.
- Build integral Next.js 16.2.6/Turbopack: passou, incluindo `/api/auth/confirm` e 36 páginas estáticas.
- Escopo do build: nenhum `playwright.config.ts` nem `scripts/homologation-*` encontrado.
- Nenhum e-mail de recuperação, convite ou outro tipo foi enviado.
- Nenhuma consulta a banco foi executada e Production não foi acessada ou alterada.

## Bloqueio local atual

- O pull do Vercel confirmou as duas refs, URL Auth, alias e publishable key de `teste2`.
- `DATABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` estão marcadas como Sensitive na Vercel; o CLI retorna `[SENSITIVE]` e não permite sincronizar seus valores reais para o ambiente local.
- Os dois valores foram repostos manualmente em `.env.staging.local` em 2026-09-03; o arquivo permanece ignorado pelo Git e nenhum segredo apareceu na saída.
- A primeira tentativa do diagnóstico bloqueou antes da rede porque uma `DATABASE_URL` herdada do processo derivava `jwglftqsnvzximybealt`.
- A origem foi corrigida no script: `.env.staging.local` é carregado deterministicamente e sobrescreve variáveis herdadas somente para o diagnóstico.
- Novo preflight: arquivo do checkout principal, todas as refs exclusivas de `prcmlynykncfgzwluoef`; publishable e Secret API Key foram aceitas pelo Auth de `teste2`.
- A conexão read-only chegou ao banco de `teste2`, mas foi rejeitada por autenticação de senha (`28P01`) antes de qualquer SQL. `crm_users`, papel, status e tenant permanecem não verificados.
- É necessário conferir localmente a senha/URI do Transaction pooler de `teste2`, sem alterar o project ref; depois, repetir o diagnóstico integrado antes do commit.
- Pendência futura: outros worktrees contêm `.env.local` com a referência antiga `jwglftqsnvzximybealt`; não foram alterados nesta etapa.
- Como todas as validações ainda não passaram, nenhum commit, push, deploy, merge ou promoção foi realizado.

## Checkpoint pendente — autenticação e isolamento tenant

- Ambiente validado: Supabase `teste2` (`prcmlynykncfgzwluoef`), usando o Transaction pooler.
- O canal cliente até o pooler foi validado com a CA oficial carregada explicitamente, `rejectUnauthorized=true`, hostname correspondente e socket TLS criptografado e autorizado.
- O usuário de teste foi localizado com role `sales`; `store_id` existe, é `NOT NULL`, mas contém string vazia.
- Não existe `seller_profile` nem associação indireta desse usuário com loja/parceiro.
- O vínculo entre Supabase Auth e `crm_users` corresponde, sem criação ou alteração de sessão.
- O contrato de isolamento por tenant está incompleto. RLS está habilitado nas tabelas de acesso analisadas, mas não há políticas efetivas em `crm_users`.
- A configuração de usuários e níveis de acesso foi temporariamente adiada. Tenant, RBAC e RLS devem ser corrigidos antes da homologação final ou de qualquer deploy.
- Nenhuma mutação de usuário, tenant ou banco foi realizada durante o diagnóstico.
- Checkout operacional atual: `C:\AutoPonteDev\autoponte_work`.
- A cópia antiga no OneDrive permanece apenas como preservação temporária e não deve ser usada como checkout operacional.
