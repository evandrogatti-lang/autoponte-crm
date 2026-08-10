# AutoPonte CRM — Mapa de ação prioritária

**Data de execução:** 06/08/2026  
**Objetivo do dia:** fechar a estabilização operacional e preparar a Operational Foundation V2 sem iniciar ainda a camada FIPE.

## Resultado obrigatório ao final do dia

Uma base validada em que os contatos funcionam, os registros atuais estão inventariados e a migração canônica possui desenho, critérios de reconciliação e plano de rollback aprovados.

## P0 — Bloqueadores operacionais

### P0.1 Validar o hotfix de contatos no ambiente local

**Ações**

- instalar o patch de estabilização;
- abrir uma oportunidade existente com contato `NULL` ou inválido;
- corrigir WhatsApp ou e-mail no workspace;
- confirmar que o novo valor persiste após recarregar a página;
- confirmar a criação do evento “Dados do cliente atualizados”;
- abrir WhatsApp e e-mail somente quando válidos.

**Aceite**

- nenhum link inválido;
- nenhum texto literal `NULL` na interface;
- atualização persistida no Supabase;
- inteligência recalculada após a correção.

### P0.2 Validar as demais ações atuais

**Ações**

- alterar etapa;
- registrar contato com resumo;
- adicionar observação;
- definir próxima ação e prazo;
- recarregar a página;
- verificar histórico e Mission Control.

**Aceite**

- todas as ações permanecem salvas;
- cada ação gera exatamente um evento;
- momentum, confiança, temperatura e recomendação são atualizados;
- nenhuma página retorna erro 500.

### P0.3 Consolidar build e estrutura local

**Ações**

- manter backups fora de `autoponte_work`;
- limpar `.next`;
- executar testes operacionais;
- executar build completo;
- registrar qualquer dependência de ambiente.

**Aceite**

- `npm.cmd run test:operational` aprovado;
- `npm.cmd run build` aprovado no computador local;
- projeto inicia com `npm.cmd run dev`.

## P1 — Preparação da Operational Foundation V2

### P1.1 Inventário do modelo legado

Mapear os campos e volumes reais de:

- `trade_ins`;
- `buyer_profiles`;
- `consignments`;
- `vehicle_matches`;
- `opportunity_events`.

Classificar cada campo como cliente, veículo, demanda, oferta, match, oportunidade, negócio ou legado.

**Entrega:** matriz de origem e destino, incluindo campos vazios, duplicados e conflitantes.

### P1.2 Desenho canônico do banco

Fechar a primeira versão das tabelas:

- `customers`;
- `vehicles`;
- `customer_demands`;
- `vehicle_supplies`;
- `matches`;
- `opportunities`;
- `deals`;
- eventos e vínculos.

Definir chaves, índices, unicidade, estados, origem de dados e regras de exclusão.

**Entrega:** SQL preliminar e diagrama textual revisável.

### P1.3 Estratégia de migração e reconciliação

Definir:

- como identificar clientes duplicados;
- como separar compra direta de compra com troca;
- como converter troca em veículo e oferta potencial;
- como preservar IDs legados;
- como impedir duplicidade em reexecução;
- como comparar contagens e totais antes e depois;
- como reverter a migração.

**Entrega:** roteiro de dry-run e checklist de rollback.

## P2 — Preparação funcional, sem implementação prematura

### P2.1 Especificar tipos de oportunidade

Formalizar os quatro tipos iniciais:

- compra estratégica;
- consignação conectada;
- venda 0 km com troca relevante;
- otimização de margem.

Para cada tipo, registrar gatilho, dados mínimos, cálculo de valor, riscos, ação recomendada e critério de encerramento.

### P2.2 Contrato da futura camada FIPE

Definir somente o contrato de dados:

- tipo de veículo;
- marca;
- modelo;
- ano;
- versão;
- código FIPE;
- mês de referência;
- valor consultado;
- data da consulta.

Não conectar ainda ao formulário legado.

## Ordem sugerida do dia

| Bloco | Prioridade | Trabalho | Saída esperada |
|---|---:|---|---|
| Início | P0 | Instalação e validação dos contatos | Hotfix aprovado com registro real |
| Bloco 2 | P0 | Teste de todas as ações operacionais | Checklist funcional completo |
| Bloco 3 | P0 | Testes e build | Base local reproduzível |
| Bloco 4 | P1 | Inventário dos dados legados | Matriz origem → destino |
| Bloco 5 | P1 | Modelo canônico | Esquema V2 preliminar |
| Bloco 6 | P1 | Migração, reconciliação e rollback | Plano executável |
| Encerramento | P2 | Tipos de oportunidade e contrato FIPE | Decisões prontas para a próxima sprint |

## Regra de decisão ao final do dia

Somente iniciar a implementação da Operational Foundation V2 se todos os itens P0 estiverem aprovados. Caso exista qualquer falha em persistência, build, contato ou histórico, o dia seguinte continua dedicado à estabilização.
