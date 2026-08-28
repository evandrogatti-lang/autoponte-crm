# Gates de qualidade

## Gate obrigatório

`npm run check` executa, nesta ordem:

1. TypeScript estrito sem emissão e sem cache incremental;
2. ESLint do núcleo (`lib`, `db`, `tests`, `scripts`) com zero warning;
3. todos os arquivos `tests/**/*.test.ts` pelo runner nativo do Node.

O workflow `.github/workflows/quality.yml` executa esse gate em pull requests e pushes para `main`.

## Gates adicionais

- `npm run lint`: baseline multiplataforma de toda a fonte, incluindo UI/Next; exclui snapshots e artefatos versionados fora dos diretórios de fonte e ainda pode conter dívida histórica a ser reduzida por categoria.
- `npm run test:artifact`: gera o build e valida o HTML renderizado; exige ambiente compatível com o build.
- `npm run check:full`: combina o gate obrigatório, lint completo e validação de artifact.
- `npm run db:audit:staging`: auditoria read-only do schema de staging.

`db:generate` e `db:push` estão intencionalmente bloqueados enquanto o journal SQLite legado não for substituído por um baseline PostgreSQL seguro. Consulte `DATABASE_MIGRATIONS.md`.
