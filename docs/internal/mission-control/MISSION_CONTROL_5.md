# Mission Control 5.0

## Status
Implementado sobre o código real da AutoPonte.

## Objetivo
Substituir definitivamente o dashboard legado por uma experiência operacional orientada a decisão, isolada em CSS Modules e organizada por feature.

## Estrutura
- `features/mission-control/components/MissionControl.tsx`
- `features/mission-control/components/MissionControl.module.css`
- `features/mission-control/components/icons.tsx`
- `features/mission-control/index.ts`

## Princípios aplicados
- Briefing antes de indicadores.
- Missão do Dia como protagonista.
- Três decisões prioritárias no máximo.
- IA explicável sem chamada de modelo no carregamento.
- CSS isolado para impedir colisões com estilos legados.
- Responsividade com navegação própria no mobile.
- Dados reais quando disponíveis e fallback demonstrativo quando o banco está vazio.

## Critérios de aceite
1. `/crm` importa exclusivamente `features/mission-control`.
2. Nenhuma classe global antiga controla o layout do Mission Control.
3. Build do Next.js passa sem erros.
4. Desktop apresenta briefing, missão, feed, pipeline, conselheiro, agenda e ações rápidas.
5. Mobile apresenta navegação inferior e conteúdo em uma coluna.
