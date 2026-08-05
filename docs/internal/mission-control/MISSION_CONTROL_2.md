# Mission Control 2.0

## Objetivo
Converter o dashboard do CRM em um centro de decisão operacional, com foco em três perguntas:
1. O que merece atenção agora?
2. Onde existe maior impacto financeiro?
3. Qual é a próxima ação?

## Arquitetura
- A página `app/crm/page.tsx` apenas carrega dados e compõe a experiência.
- Regras e cálculos ficam em `lib/mission-control`.
- Interface fica em `components/mission-control`.
- Componentes visuais reutilizam a APDL.

## Componentes entregues
- MissionControlShell
- MissionBrief
- OperationOverview
- PipelineLive
- DecisionRail
- QuickActions

## Critérios de aceite
- Missão do dia visível antes dos KPIs.
- Três prioridades no máximo.
- IA explica recomendação e confiança.
- Pipeline acessível sem esconder etapas.
- Funciona com dados reais e fallback demonstrativo.
- Responsivo em desktop, tablet e mobile.

## AI Budget First
Nenhuma chamada de IA é realizada ao abrir a tela. As recomendações atuais são derivadas de regras e dados persistidos. IA generativa será acionada somente por evento ou solicitação explícita através do Orchestrator.
