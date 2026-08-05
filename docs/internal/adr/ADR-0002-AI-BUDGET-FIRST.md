# ADR-0002 — AI Budget First

Status: Aprovado
Classificação: Estratégico / Privado

## Decisão
Toda chamada de IA passa pelo AI Orchestrator.

## Ordem obrigatória
1. Rule Engine.
2. Cache.
3. Resultado persistido.
4. Processamento em background.
5. Modelo externo apenas quando houver ganho claro.

## Controles
- Limite mensal por organização.
- Limite por funcionalidade.
- Estimativa de custo antes da execução.
- Persistência e reutilização do resultado.
- Registro de custo e ROI.
- Funções essenciais continuam operacionais sem IA.

## Meta inicial
Manter custo de IA previsível e proporcional ao valor gerado, evitando chamadas por clique ou por abertura de tela.
