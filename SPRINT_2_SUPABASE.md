# Sprint 2 — Migração para Supabase

## Alterações
- Cloudflare D1 substituído por PostgreSQL/Supabase.
- Cloudflare R2 substituído por Supabase Storage via API REST.
- Schema Drizzle convertido para PostgreSQL.
- Rotas de trocas, consignações, compradores e fotos atualizadas.
- Dashboard, oportunidades e Match passaram a consultar PostgreSQL.

## Implantação
1. Execute `supabase/001_autoponte_schema.sql` no SQL Editor do Supabase.
2. Configure no `.env.local` e na Vercel: `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.
3. Execute `npm install` e `npm run build`.
4. Faça commit e push.

Nunca envie `.env.local` ao GitHub.
