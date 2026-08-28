# AutoPonte

Plataforma operacional para intermediação automotiva: CRM, oportunidades, estoque, trocas, parceiros, lifecycle de veículos e inteligência veicular. A aplicação é um monólito modular em Next.js, com PostgreSQL/Supabase e Drizzle ORM.

## Requisitos

- Node.js `>=22.13.0`
- npm compatível com o `package-lock.json`
- projeto Supabase/PostgreSQL acessível

## Configuração local

1. Instale as dependências com `npm ci`.
2. Copie `.env.example` para `.env.local` e preencha:
   - `DATABASE_URL`: conexão PostgreSQL; em ambientes serverless, prefira o Session Pooler;
   - `NEXT_PUBLIC_SUPABASE_URL`;
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`;
   - `SUPABASE_SERVICE_ROLE_KEY` — somente no servidor;
   - `AUTOPONTE_APP_URL` — URL pública usada em redirects;
   - opcionalmente, apenas em desenvolvimento, `AUTOPONTE_DEV_AUTH_BYPASS=true` e a identidade local `AUTOPONTE_ADMIN_EMAIL`/`AUTOPONTE_ADMIN_NAME`.
3. Inicie com `npm run dev`.

Nunca exponha a service-role key ao browser nem versione arquivos `.env*`.

## Comandos principais

| Comando | Finalidade |
| --- | --- |
| `npm run dev` | servidor local Next.js |
| `npm run build` | build de produção |
| `npm run check` | gate obrigatório: TypeScript, lint do núcleo e testes unitários |
| `npm run lint` | baseline ESLint completo, incluindo a dívida histórica de UI |
| `npm run check:full` | gate obrigatório, lint completo e validação do artefato |
| `npm run db:audit:staging` | auditoria read-only do schema de staging |

`db:generate` e `db:push` estão bloqueados de propósito: o journal do Drizzle ainda contém uma base SQLite histórica e não representa o PostgreSQL. Não contorne esse bloqueio; siga [docs/DATABASE_MIGRATIONS.md](docs/DATABASE_MIGRATIONS.md).

## Organização

- `app/`: páginas, composição server-side e endpoints HTTP;
- `features/`: componentes de fluxos verticais;
- `lib/<domínio>/`: regras puras e serviços de aplicação;
- `db/`: schema e acesso PostgreSQL;
- `drizzle/`: histórico SQL canônico e imutável;
- `supabase/`: migrações legadas congeladas;
- `tests/`: testes unitários e regressões estruturais;
- `docs/`: decisões, políticas e guias operacionais.

O padrão de extração recomendado e as responsabilidades de cada camada estão em [docs/ARCHITECTURE_BOUNDARIES.md](docs/ARCHITECTURE_BOUNDARIES.md).

## Documentação essencial

- [Relatório da auditoria e estabilização](docs/REPOSITORY_AUDIT_2026-08-28.md)
- [Gates de qualidade](docs/QUALITY_GATES.md)
- [Banco e migrações](docs/DATABASE_MIGRATIONS.md)
- [Estados de domínio](docs/DOMAIN_STATES.md)
- [Política de segurança das APIs](docs/API_SECURITY.md)
- [Controle de acesso](docs/ACCESS_CONTROL_V1.md)

## Antes de abrir um PR

Execute `npm run check`. Mudanças de domínio devem incluir teste; mudanças de schema devem manter `db/` e uma nova migração PostgreSQL numerada em `drizzle/` sincronizados. Não reescreva migrações já aplicadas.
