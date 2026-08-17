# Resumo técnico — AutoPonte CRM — 2026-08-17

## Objetivo

Registrar o fechamento do trabalho realizado em UX/UI do CRM, o estado conhecido dos commits/deploys, decisões de produto tomadas durante a homologação e pendências para retomada.

## Estado do P1-01 a P1-04

O pacote trabalhou principalmente densidade operacional e modos de visualização em Clientes e Oportunidades.

### Entregas validadas tecnicamente

- busca nominal de Clientes ajustada para semântica de prefixo (`startsWith`) com normalização de caixa e acentos;
- CPF e RG não foram adicionados porque não estão disponíveis no modelo atual; não houve migration nem alteração de schema para forçar essa funcionalidade;
- Oportunidades passou a adotar os modos conceituais `Lista | Detalhes | Cards`;
- `Detalhes` é o modo padrão para usuário sem preferência válida;
- preferência de visualização é persistida localmente e contempla compatibilidade/fallback das preferências anteriores;
- filtros, ordenação e workspace foram preservados nos checks realizados;
- Match Engine e Recommendation Engine não foram alterados neste pacote;
- schema e API não foram alterados;
- build e `git diff --check` passaram nos checks do hotfix;
- erros gerais de TypeScript e uma falha de teste operacional foram comparados com o parent e identificados como preexistentes, fora do escopo deste hotfix.

### Commits relevantes

- `0c5c00e6ead450464df9343812946be97b2e3b17` — pacote anterior P1-01 a P1-04;
- `3404cbc422cf1bfb398a72ec65f6a895eb581144` — `feat(crm): refine client search and opportunity views`.

Na última verificação, `origin/main` apontava para `3404cbc422cf1bfb398a72ec65f6a895eb581144`.

## Homologação visual — pendência bloqueante

A homologação manual mostrou que a responsividade mobile ainda não está correta no Opportunity Workspace.

Problemas observados:

- composição de desktop ainda comprimida em viewport estreito;
- cabeçalho da oportunidade requer reorganização/empilhamento no mobile;
- KPIs permanecem densos demais horizontalmente;
- bloco `Cliente / Corrigir dados e contato` não reorganiza adequadamente os campos pessoais;
- `DDI + telefone` ainda fica comprimido;
- campos de informação pessoal precisam ocupar largura útil no mobile;
- bloco de Demanda e seus selects também precisam ser empilhados em largura pequena;
- a correção anterior do `InternationalPhoneField` isoladamente não resolveu a causa estrutural.

**Conclusão:** P1-02/P1 de UX não deve ser considerado homologado visualmente até a correção responsiva do workspace ser testada em viewport real.

### Próximo hotfix mobile

Escopo planejado:

1. auditar `OpportunityWorkspace` e grids/containers relacionados;
2. corrigir header/hero para empilhamento em `<= 600px`;
3. KPIs em 1 ou 2 colunas conforme largura disponível;
4. dados pessoais do Cliente em uma coluna;
5. WhatsApp com DDI de largura controlada e telefone flexível (`min-width: 0; flex: 1`);
6. Demanda com Marca, Modelo, Versão e demais campos empilhados no mobile;
7. preservar desktop/tablet e evitar alterações globais desnecessárias;
8. validar visualmente em 390x844, 430x932, 768x1024, 1366x768 e 1920x1080;
9. não marcar responsividade como OK sem teste real de viewport.

## Busca de Clientes — decisão de produto

A busca da Base Comercial deve tratar nome de forma diferente de uma busca textual genérica:

- `ana` deve localizar nomes iniciados por Ana;
- não deve retornar Juliana apenas por conter `ana` internamente;
- comparação deve ignorar caixa e acentuação.

Também foi decidido que CPF e RG são critérios úteis para localização inequívoca e prevenção de duplicidade. Entretanto, como esses documentos não estão disponíveis no modelo atual, sua inclusão fica para uma evolução de dados específica, sem ser misturada ao hotfix de UX.

Quando implementados, CPF/RG devem ser normalizados para busca independentemente de máscara e não devem ser expostos integralmente em listagens sem necessidade/permissão.

## Matches e Recomendações IA — prioridade seguinte

Após o fechamento do hotfix mobile, a prioridade de produto passa a ser Matches + Recomendações IA.

### Princípio

- **Match Engine:** responde quais veículos são compatíveis com a demanda do cliente e por quê.
- **Recommendation Engine/IA:** responde qual ação comercial o vendedor deveria executar agora e por quê.

A primeira versão do Match deve ser determinística, explicável e baseada em dados reais disponíveis, sem score fictício ou IA generativa tomando decisões sem base.

Fluxo alvo:

`cliente/intenção -> requisitos -> estoque -> match/score -> recomendação -> prioridade -> ação do vendedor -> registro da ação -> recálculo`

### Destaque operacional obrigatório

Um match forte ou recomendação crítica não pode existir somente dentro de `Correspondências IA`.

Quando essa integração for implementada, oportunidades de alta prioridade deverão aparecer de forma evidente na Central de Operações, aproveitando a arquitetura visual existente:

- `Missão do Dia` para ação prioritária;
- `Conselheiro AutoPonte` como segunda camada de recomendação/explicação;
- indicador/badge de `Correspondências IA`;
- sinalização contextual em Clientes/Oportunidades;
- workspace completo de Correspondências IA para análise e histórico.

O alerta deve mudar de estado após ação, descarte, contato ou vinculação, evitando acúmulo de notificações sem utilidade.

### Preparação das visualizações de Oportunidades

Os modos devem estar aptos a receber dados reais futuramente:

- **Lista:** badge compacto de Match e máxima densidade;
- **Detalhes:** Match + explicação + próxima ação;
- **Cards:** destaque visual do Match sem replicar o workspace completo.

Nenhum placeholder de Match/IA deve ser apresentado como dado real antes da implementação dos motores.

## Cadastro de veículos / FIPE

A evolução da FIPE não é prioridade imediata. A busca por placa tende a reduzir a fricção futura de identificação do veículo. Correções FIPE já em andamento podem ser aproveitadas se retornarem estáveis, mas não devem bloquear a sequência atual de UX e Matches.

## Comercial no cadastro de veículo

A direção de produto discutida é manter informações comerciais associadas ao contexto em que fazem sentido operacionalmente, especialmente cadastro/gestão do veículo AutoPonte, evitando espalhar campos comerciais sem relação direta pelo cadastro de parceiros.

O bloco comercial deve privilegiar conceitos como preço de venda, custo de aquisição, custos adicionais, custo total, margem bruta estimada, margem percentual e observações comerciais. Sugestão de preço por IA pode ser evolução posterior, sustentada por dados reais de mercado/estoque/margem.

## Direção de produto

O CRM deve continuar atendendo a operação própria da AutoPonte, mas sua arquitetura deve evitar acoplamentos que inviabilizem uma futura oferta para pequenas lojas/parceiros.

A diferenciação comercial pretendida não é apenas cadastro: é transformar dados de cliente, intenção, veículo, oportunidade e operação em prioridade comercial acionável.

Matches + Recomendações + Central de Operações são peças centrais dessa proposta de valor.

## Ordem de retomada

1. corrigir responsividade real do Opportunity Workspace/Cliente;
2. executar smoke visual em viewports reais e fechar P1-01 a P1-04;
3. especificar/auditar contratos existentes para Match Engine v1;
4. implementar Match Engine determinístico e explicável;
5. implementar Recomendações IA v1 sobre dados e sinais reais;
6. integrar prioridade/recomendação à Central de Operações;
7. testar ciclo completo até ação registrada pelo vendedor;
8. retomar CPF/RG e demais evoluções de cadastro como pacote de dados separado.

## Restrições mantidas

Até decisão específica, evitar misturar esses próximos trabalhos com:

- migrations oportunistas;
- mudanças de schema não planejadas;
- alterações FIPE fora do escopo;
- mudanças em ADE Core, Opportunity DNA, Business Temperature, Confidence, Explainability ou Flow Engine sem RFC/contrato correspondente;
- scores ou recomendações fictícias apenas para preencher UI.

## Status de encerramento do dia

- código principal do refinamento P1 publicado em `main` até o commit `3404cbc` na última verificação;
- validações técnicas do hotfix concluídas com falhas preexistentes separadas do escopo;
- homologação visual mobile ainda pendente/bloqueante;
- causa do próximo trabalho identificada como responsividade estrutural do Opportunity Workspace, não apenas campo de telefone;
- Matches + Recomendações IA definidos como próxima frente estratégica após o fechamento do mobile.
