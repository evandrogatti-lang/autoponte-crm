# Checkpoint — autenticação e logout seguro

- Data: 2026-09-02 (Europe/Berlin)
- Branch/PR: `codex/mission-control-cockpit`, PR #10
- Commit inicial: `3c6cc0f8085d1fa8771337d912603c5b7a870f06`
- Ambiente autorizado: Supabase `teste2` e Vercel Preview. Production não foi alterada nem promovida.

## Alterações e decisões de segurança

- URL pública centralizada em `lib/auth-flow.ts`, com fallback explícito para o Preview e rejeição de localhost/Production.
- Convite e recuperação apontam para `/nova-senha`; recuperação mantém resposta genérica para não enumerar e-mails.
- O código PKCE é consumido no servidor pelo Proxy e removido da URL. Um cookie HttpOnly, Secure e de curta duração marca o fluxo como pendente.
- Rotas protegidas bloqueiam sessões pendentes e usuários CRM não ativos.
- A senha é atualizada apenas com sessão Supabase validada e marcador pendente; o marcador é consumido e a sessão temporária encerrada após o sucesso.
- Somente usuários com estado `invited` são promovidos a `active`; recuperação não reativa usuários suspensos/inativos.
- Logout é exclusivamente POST, encerra a sessão Supabase, limpa estado local/cache, redireciona com 303 para `/login` e tenta auditar sem deixar uma falha de auditoria impedir a saída.
- O shell revalida a sessão ao retomar foco e oculta Configurações sem contexto administrativo.
- Acesso direto não administrativo a Configurações termina em uma página controlada de acesso negado.

## Configuração necessária

- Vercel > Project Settings > Environment Variables: definir `AUTOPONTE_APP_URL` apenas para Preview como `https://autoponte-crm-git-codex-mission-control-cockpit-auto-ponte.vercel.app`.
- Supabase `teste2` > Authentication > URL Configuration:
  - Site URL: `https://autoponte-crm-git-codex-mission-control-cockpit-auto-ponte.vercel.app`
  - Redirect URL: `https://autoponte-crm-git-codex-mission-control-cockpit-auto-ponte.vercel.app/nova-senha`
- Não adicionar localhost nem domínio de Production a estes fluxos de teste.

## Validações

- TypeScript: passou.
- ESLint dos arquivos alterados: passou.
- Testes direcionados de autenticação/RBAC: 13/13 passaram.
- Build completo Next.js: passou.
- Suíte ampla: 68 passaram e 4 falharam por problemas preexistentes do executor/imports (`lib/ade`, `lib/clients/search` e ausência de `dist/server/index.js`), sem relação com o reparo.

## Bloqueios e próximo passo

- `AUTOPONTE_APP_URL` não existe no `.env.local`; a configuração remota de Preview precisa ser confirmada no painel Vercel.
- O rate limit de e-mail impede insistir em convite/recuperação real. Não foi usado Production como contorno.
- O Obsidian não foi exposto como aplicativo/vault acessível nesta sessão; este arquivo preserva o checkpoint para ser copiado ao vault quando disponível.
- Próximo passo: após o rate limit, validar manualmente no Preview convite, recuperação, link expirado/reutilizado, logout/Voltar/múltiplas abas e os perfis administrador, gerente e vendedor.
