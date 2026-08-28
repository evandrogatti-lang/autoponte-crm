# Inventário de legado

Revisado em 2026-08-28. Este documento distingue código morto comprovado de protótipos sem consumidor atual. Ausência de import não é, isoladamente, autorização para apagar uma decisão arquitetural preservada.

## Alta confiança: fora do runtime atual

| Área | Evidência | Decisão |
| --- | --- | --- |
| `.autoponte-backups/` e `.autoponte-backup-ade01-*` | snapshots versionados, sem imports de runtime | manter nesta fase; remover em PR próprio após confirmar retenção necessária |
| `P0-01/`, `P0-01_DIAGNOSTICO.txt`, `P0-02_SIDEBAR_SCAN.txt`, `P0-03_ROTAS_SCAN.txt`, `ESTADO_LIMPO_20260809.txt` | saídas históricas de diagnóstico, caminhos absolutos antigos | arquivar/remover em PR documental separado |
| `.vinext/` e `build/` versionados | artefatos de ferramenta/build, não fonte da aplicação Next | validar dependência do pipeline de hosting antes de retirar do Git |
| `supabase/*.sql` | cópias/linha histórica anterior ao diretório canônico | congelado; não criar novas migrações aqui |

## Protótipos dormentes, não classificados como lixo

| Área | Estado | Motivo para retenção conservadora |
| --- | --- | --- |
| `lib/ai/orchestrator.ts` e `lib/ai/in-memory.ts` | sem consumidor no runtime | implementação acompanha `docs/internal/adr/ADR-0002-AI-BUDGET-FIRST.md`; decidir junto do roadmap de IA |
| `components/mission-control/{DecisionRail,MissionBrief,OperationOverview,PipelineLive,QuickActions}.tsx` | sem import pela UI atual | protótipos descritos em `docs/internal/mission-control/`; a tela ativa está em `features/mission-control/` |
| exports visuais de `components/apdl/` | consumo parcial | fundação de design documentada; fazer tree-shaking/inventário de catálogo antes de excluir símbolos |

## Duplicações e sobreposições relevantes

- Formatação monetária estava repetida em páginas e componentes; o caminho canônico agora é `lib/presentation/formatters.ts`. Restam formatações locais em fluxos especializados, que podem migrar por toque.
- Catálogos de lifecycle/origem estavam repetidos entre listagem e detalhe; agora convergem em `lib/vehicles/presentation.ts`.
- O lifecycle de veículos deixou de duplicar coordenação de domínio dentro da rota e usa `lib/vehicles/lifecycle-service.ts`.
- `supabase/002_opportunity_workspace.sql` e `003_desired_vehicle_fipe_profile.sql` duplicam as migrações Drizzle 0007 e 0008; permanecem congeladas por rastreabilidade.
- A raiz contém documentos e snapshots de diversas ondas P0. Eles devem ser consolidados em `docs/archive/` ou retirados do Git somente após checagem de referências externas.

## Critério para a próxima limpeza

1. Confirmar que o CI/hosting não lê o alvo.
2. Confirmar ausência de imports, scripts e links documentais necessários.
3. Mover documentação histórica útil para `docs/archive/`.
4. Remover um grupo por commit, executar `npm run check` e validar o build aplicável.
5. Preservar a possibilidade de restauração pelo Git; não misturar limpeza com mudança funcional.
