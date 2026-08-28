console.error([
  "Comando bloqueado com segurança.",
  "O journal atual pertence ao protótipo SQLite e staging ainda não possui ledger de migrations da aplicação.",
  "Crie/revise SQL PostgreSQL sequencial em drizzle/ e siga docs/DATABASE_MIGRATIONS.md.",
].join("\n"));
process.exit(1);
