# AutoPonte — mapa de ação prioritária

**Data de execução:** 06/08/2026  
**Atualização:** após correção da validação TypeScript

## Ordem obrigatória

### P0 — Confirmar a estabilização instalada

1. Aplicar o hotfix V1.2.1.
2. Confirmar testes operacionais.
3. Confirmar smoke test de Clientes, Oportunidades e Workspace.
4. Confirmar TypeScript com os tipos oficiais.
5. Confirmar build Next.js limpo.
6. Iniciar `npm.cmd run dev` e validar o registro corrigido.

**Saída esperada:** base atual operacional e reproduzível, sem `NULL` em contato e sem conflito de tipos.

### P1 — Teste funcional do que existe

1. Corrigir nome, WhatsApp, e-mail, cidade e veículo desejado.
2. Abrir WhatsApp somente quando houver número válido.
3. Registrar contato com resumo.
4. Adicionar observação.
5. Definir próxima ação e data.
6. Alterar estágio.
7. Recarregar a página e confirmar persistência.
8. Confirmar evento correspondente no histórico.

**Saída esperada:** checklist com aprovação ou falha por campo.

### P2 — Inventário e desenho da Foundation V2

1. Mapear os campos ainda concentrados em `trade_ins`.
2. Classificar cada campo como cliente, veículo, demanda, oferta, match, oportunidade, negócio ou evento.
3. Definir tabelas canônicas e relacionamentos.
4. Definir migração idempotente, reconciliação e rollback.
5. Definir índices e paginação para o piloto e expansão.

**Saída esperada:** esquema lógico aprovado antes de qualquer nova funcionalidade.

### P3 — Contrato da camada Vehicle & FIPE

1. Definir campos canônicos do veículo.
2. Definir sequência tipo → marca → modelo → ano → versão.
3. Definir armazenamento do código FIPE, mês de referência, valor e data da consulta.
4. Separar valor FIPE, valor pedido, avaliação, oferta e valor final.

**Saída esperada:** especificação; nenhuma implementação antes da aprovação da Foundation V2.

## Bloqueadores

- Qualquer falha no build mantém a prioridade em P0.
- Qualquer campo operacional que não persista mantém a prioridade em P1.
- Não iniciar FIPE, matching ou novos módulos enquanto P0 e P1 não estiverem aprovados.
