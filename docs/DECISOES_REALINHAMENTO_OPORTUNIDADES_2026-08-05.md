# AutoPonte CRM — Decisões de realinhamento

**Data:** 05/08/2026  
**Status:** decisão aprovada para orientar a Operational Foundation V2  
**Escopo deste documento:** consolidar as decisões tomadas após a validação da Operational Layer V1.

## 1. Ordem obrigatória de trabalho

A partir desta etapa, cada ciclo do AutoPonte seguirá esta sequência:

1. corrigir o que está operacionalmente quebrado;
2. registrar as decisões tomadas;
3. preparar o mapa de ação prioritária do próximo ciclo;
4. somente depois iniciar novas funcionalidades.

Esta ordem evita crescimento sobre uma base instável e reduz a sequência de hotfixes.

## 2. Decisão central: oportunidade não é troca

A tabela e a interface atuais ainda usam `trade_ins` como agregado temporário. Esse desenho permanece apenas como camada legada durante a estabilização.

O modelo definitivo separará:

- **Cliente:** pessoa ou empresa que participa da operação;
- **Veículo:** bem físico identificado e independente da modalidade comercial;
- **Demanda:** intenção e critérios de compra;
- **Oferta:** veículo disponível ou potencialmente disponível;
- **Match:** compatibilidade detectada entre demanda e oferta;
- **Oportunidade:** situação comercial acionável, com valor e motivo explícitos;
- **Negócio:** oportunidade que entrou em negociação;
- **Evento:** registro imutável das ações e decisões.

Uma troca pode originar uma oferta e, posteriormente, uma ou mais oportunidades. Ela não será mais tratada como a própria oportunidade.

## 3. Definição operacional de oportunidade

A AutoPonte reconhecerá oportunidade quando existir uma combinação acionável de demanda, oferta, margem, liquidez, velocidade, conectividade ou efeito multiplicador.

Tipos prioritários já aprovados:

1. **Compra estratégica:** veículo de alta liquidez abaixo do mercado, com resultado financeiro e giro projetado;
2. **Consignação conectada:** veículo consignado com cliente ou demanda compatível já identificada;
3. **Venda 0 km com troca relevante:** venda cujo veículo recebido na troca gera valor adicional;
4. **Otimização de margem:** oferta com aderência equivalente ou suficiente ao cliente e melhor resultado financeiro.

A estrutura ficará preparada para cadeia de trocas, giro de estoque, reativação, ajuste de preço, arbitragem regional e compra antecipada.

## 4. Match, oportunidade e negócio são estados distintos

- **Match:** descoberta algorítmica, ainda sem compromisso operacional;
- **Oportunidade:** match ou condição de mercado considerada relevante e acionável;
- **Negócio:** oportunidade em negociação efetiva, com contato, proposta, visita ou reserva.

O pipeline não deverá receber automaticamente todo match. Haverá critérios mínimos de aderência, viabilidade, confiança e prioridade.

## 5. Valor de uma oportunidade

A ordenação futura não dependerá apenas da probabilidade de fechamento. O valor operacional deverá considerar:

- margem potencial e margem líquida;
- velocidade estimada;
- liquidez;
- conectividade entre oferta e demanda;
- capital necessário e prazo de imobilização;
- risco comercial e documental;
- efeito multiplicador de novas ofertas e novos negócios.

## 6. Correções operacionais aplicadas nesta entrega

A camada atual foi estabilizada sem antecipar a migração estrutural:

- valores literais `NULL`, `undefined`, `N/A` e equivalentes deixam de gerar links;
- WhatsApp brasileiro é validado e salvo no formato canônico com DDI 55;
- e-mail é validado e normalizado;
- links de WhatsApp e e-mail só aparecem quando o canal é válido;
- registros antigos sem contato exibem mensagem objetiva, sem abrir URL inválida;
- o Opportunity Workspace passa a permitir corrigir nome, WhatsApp, e-mail, cidade e veículo desejado;
- toda correção de cliente gera evento no histórico e recalcula a inteligência;
- registro de contato exige resumo, evitando evento vazio;
- Clientes e AutoPonte Match passam a usar a mesma regra de contato seguro.

Nenhuma migração SQL é exigida por esta correção.

## 7. Limite desta entrega

Esta entrega não cria ainda as tabelas canônicas nem integra os dropdowns FIPE. O objetivo é deixar o que já existe utilizável e impedir dados de contato inválidos.

A integração FIPE será implementada apenas depois da Operational Foundation V2, para que marca, modelo, ano, versão e código FIPE sejam ligados a veículos, demandas e ofertas corretos — e não diretamente ao registro legado `trade_ins`.

## 8. Direção da Operational Foundation V2

A próxima fundação deverá introduzir, com migração reversível:

- `customers`;
- `vehicles`;
- `customer_demands`;
- `vehicle_supplies`;
- `matches`;
- `opportunities`;
- `deals`;
- `opportunity_events` com referência canônica;
- serviços centralizados de leitura e escrita;
- índices, paginação e recálculo apenas dos registros afetados.

## 9. Dimensionamento de referência

A fundação deverá atender inicialmente:

- 3 lojas;
- 60 a 200 veículos;
- até 5 usuários por loja;
- até 5.000 clientes;
- até 20.000 eventos operacionais.

Sem redesenho estrutural, deverá permitir expansão para:

- 30 lojas;
- aproximadamente 5.000 veículos ativos;
- 100.000 clientes;
- centenas de milhares de matches;
- mais de 1 milhão de eventos históricos.

Esses números são metas arquiteturais e serão confirmados por testes de carga.

## 10. Critérios de aceite antes da camada FIPE

- contatos nunca geram `NULL`, `undefined`, `wa.me/55` ou `mailto:` vazio;
- cliente, demanda e troca possuem fronteiras definidas;
- migração é idempotente e reversível;
- registros atuais são conciliados sem perda;
- Mission Control lê dados canônicos;
- histórico permanece auditável;
- build local e Vercel são reproduzíveis;
- não há backups ou artefatos de validação dentro da árvore compilada;
- testes funcionais e de integração são aprovados.
