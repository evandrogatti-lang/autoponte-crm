# Auditoria e estabilização do repositório — 2026-08-28

## Resumo executivo

O AutoPonte é um monólito modular Next.js/PostgreSQL em evolução, não um conjunto de serviços independentes. A estratégia mais segura é continuar extraindo slices verticais do `app/` para serviços e regras de domínio testáveis, sem reescrita ampla. A execução estabilizou o baseline, verificou o schema real de staging, tornou estados e autorização explícitos, adicionou CI e iniciou a decomposição dos pontos de maior risco.

Resultado: `npm run check` aprovado com TypeScript estrito, lint do núcleo sem warnings e 77 testes. O schema de staging foi auditado via Session Pooler com consultas somente leitura.

## Arquitetura atual

```text
browser
  -> app/pages + features/components
  -> app/api (identidade, permissão, HTTP)
  -> lib/<domínio> (casos de uso e regras)
  -> db (Drizzle/PostgreSQL)
  -> Supabase PostgreSQL/Auth
```

- `app/` ainda concentra composição e algumas consultas, mas rotas mutáveis críticas possuem política de acesso comum.
- `features/` abriga UI por fluxo; `components/` contém elementos transversais e protótipos históricos.
- `lib/` é a fronteira preferida para domínio, apresentação compartilhada e serviços de aplicação.
- `db/schema.ts` é a representação tipada; `drizzle/*.sql` é a fonte canônica do histórico PostgreSQL.
- O deploy alvo atual é Next.js; resíduos Vinext/Cloudflare precisam de decisão explícita antes da remoção.

## Achados e tratamento

| Prioridade | Achado | Tratamento/estado |
| --- | --- | --- |
| P0 | estado remoto das migrações era incerto | staging auditado; constraints, triggers e FK 0019–0021 confirmados |
| P0 | journal Drizzle mistura legado SQLite | `db:generate`/`db:push` bloqueados até baseline PostgreSQL seguro |
| P0 | autorização de mutações era desigual | helper central e matriz mínima aplicados a veículos, oportunidades e parceiros |
| P1 | estados de oportunidades divergiam | máquina de estados e catálogos canônicos; transição inválida retorna 409 |
| P1 | lifecycle coordenado dentro da rota | extraído para serviço de aplicação transacional e testável |
| P1 | ausência de gate reprodutível | `npm run check` e workflow de CI adicionados; lint integral tornou-se multiplataforma |
| P2 | catálogos/formatadores repetidos | utilitários compartilhados adotados em quatro superfícies |
| P2 | página de veículo extensa | hero e painel operacional extraídos; decomposição deve continuar por fatias |
| P2 | snapshots, diagnósticos e protótipos versionados | classificados em `LEGACY_INVENTORY.md`; sem remoção arriscada nesta fase |

## Banco verificado

- Dez colunas de lifecycle das migrações 0019/0021 presentes.
- Constraints de origem, lifecycle, blockers e estados terminais presentes.
- `commercial_cases_acquisition_mode_check` aceita `sale`.
- FK de evento para caso usa `ON DELETE SET NULL`.
- Triggers de contexto comercial e readiness ativos.
- Nenhuma referência órfã, lifecycle nulo ou blocker em estado terminal encontrado.
- Dois veículos históricos permanecem `AVAILABLE` sem readiness completo; o guard protege novas transições, mas não reescreve legado.
- Não existe ledger de migrações da aplicação no PostgreSQL de staging.

## Oportunidades de reutilização

1. Aplicar o padrão `route -> service -> domain -> db` aos próximos endpoints mutáveis, começando por oportunidades e parceiros.
2. Migrar formatações locais para `lib/presentation/formatters.ts` quando cada tela for tocada.
3. Centralizar catálogos de oportunidade e caso comercial como foi feito para veículos.
4. Reutilizar o helper de acesso, mas só liberar permissões `*_own` depois de implementar escopo por loja/owner na consulta.
5. Extrair os demais painéis da ficha de veículo sem criar abstrações genéricas antes de haver segundo consumidor.

## Plano incremental priorizado

### P0 — antes de novas migrações ou ampliação de acesso

1. Criar um baseline PostgreSQL e um ledger da aplicação; então reabilitar geração/aplicação automatizada de migrações.
2. Corrigir ou justificar formalmente os dois veículos históricos sem readiness.
3. Implementar escopo de tenant/loja para permissões `*_own`, com testes de isolamento.
4. Garantir rate limiting/WAF nas rotas públicas de escrita no ambiente de borda.

### P1 — próximo ciclo de engenharia

1. Extrair serviços de aplicação de oportunidades e parceiros.
2. Adicionar testes de integração PostgreSQL para transações, triggers e concorrência de lifecycle.
3. Reduzir o lint completo por categoria até transformá-lo em gate sem warnings.
4. Validar o build/preview no ambiente oficial e documentar o pipeline único de deploy.

### P2 — redução de custo e legado

1. Consolidar snapshots P0 e backups versionados em uma política de arquivo.
2. Decidir se os protótipos de IA e Mission Control entram no roadmap ou são removidos.
3. Retirar artefatos Vinext/Cloudflare apenas após comprovar que o hosting não os consome.
4. Continuar decompondo componentes extensos e eliminando formatadores locais por toque.

## Fases executadas

1. Preservação do baseline e correções de integridade.
2. Estabilização TypeScript/testes.
3. Auditoria read-only de staging e fonte de verdade de migrações.
4. Estados de domínio canônicos.
5. Gate de qualidade e CI.
6. Política uniforme de autenticação/autorização.
7. Serviço de lifecycle de veículos.
8. Reutilização de apresentação.
9. Decomposição inicial da ficha de veículo.
10. Inventário de legado, README real, relatório final e registro no Obsidian.

## Riscos residuais

- O lint completo de UI executa de forma multiplataforma e encontrou 54 ocorrências (30 erros e 24 warnings); o gate obrigatório cobre o núcleo enquanto essa dívida é reduzida.
- A ausência de ledger PostgreSQL impede afirmar sequência de aplicação apenas pelo repositório.
- Permissões próprias/por loja não devem ser habilitadas sem filtragem de escopo.
- Protótipos e backups aumentam ruído, mas uma exclusão em massa seria mais arriscada que a remoção incremental.
