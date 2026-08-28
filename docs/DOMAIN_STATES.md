# Estados de domínio

Cada agregado possui um estado próprio. Estados com nomes parecidos não são intercambiáveis.

## Oportunidade

Fonte canônica: `lib/opportunities/types.ts` e `lib/opportunities/domain.ts`.

Fluxo principal: `pre_evaluated → new → contacted → qualified → sent_to_store → proposal → closed`. Uma oportunidade ativa pode ir para `lost`; a reabertura explícita retorna de `lost` para `new`. `closed` é terminal.

Valores legados são adaptados na leitura: `received → new` e `store → sent_to_store`.

## Estágio ADE

O estágio ADE é uma projeção analítica, não o estado persistido. O mapeamento é feito por `statusToStage()` e termina em `closed` tanto para sucesso quanto para perda; o status da oportunidade preserva o resultado real.

## Atribuição de vendedor

Fonte canônica: `lib/central-assignment-lifecycle.ts`.

- ativos: `assigned`, `accepted`, `contacted`;
- terminal de capacidade: `completed`;
- `reassigned` encerra a atribuição substituída.

O estado da atribuição não altera implicitamente o estado da oportunidade.

## Caso comercial

Fonte canônica: `lib/commercial-cases/contracts.ts`.

- caso: `opened`, `active`, `closed`, `lost`;
- resultado: vazio, `active_negotiation`, `awaiting_documents`, `proposal_rejected`, `negotiation_lost`, `sold`;
- aquisição: `direct_purchase`, `trade_in`, `consignment`, `appraisal_only`, `sale`.

Ordens, publicações, propostas, contratos e pagamentos possuem matrizes próprias em `caseEntityTransitions`. Uma entrega concluída fecha o caso como `sold`; não se deve inferir essa conclusão apenas pelo status de uma proposta.

## Veículo

`vehicles.status` é o status legado de catálogo. `vehicles.lifecycle_status` é o estado operacional canônico novo, definido em `lib/vehicles/lifecycle.ts`.

O fluxo é `PENDING_ENTRY → IN_STOCK → PREPARATION/READY → PUBLISHED/AVAILABLE → RESERVED → SOLD → DELIVERED`. Retorno de `RESERVED` para `AVAILABLE` é permitido. Readiness e constraints do banco protegem a progressão.

## Regras de integração

1. Adaptadores entre agregados devem ser funções nomeadas e testadas.
2. UI e handlers não podem criar strings de estado novas.
3. Transições são validadas no domínio antes da persistência e reforçadas no banco quando críticas.
4. Estados históricos desconhecidos devem ser normalizados explicitamente, nunca aceitos silenciosamente em uma escrita.
