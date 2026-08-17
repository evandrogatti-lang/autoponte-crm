# RFC-0013 — Matches, Recomendações IA e Ação Comercial

- **Status:** proposta / próxima frente estratégica
- **Data:** 2026-08-17
- **Escopo desta etapa:** definição arquitetural e operacional
- **Dependência imediata:** concluir hotfix de responsividade e homologação visual do P1-01 a P1-04
- **Fora do escopo desta RFC:** implementar agora o motor, criar score fictício, migrations oportunistas ou alterar motores existentes sem contrato confirmado

## 1. Resumo

A próxima evolução prioritária do AutoPonte CRM é transformar dados de cliente, intenção, estoque e oportunidade em ação comercial que o vendedor não deixe passar.

A solução será dividida em duas responsabilidades complementares:

1. **Match Engine:** identifica e ordena veículos compatíveis com a demanda do cliente usando critérios objetivos e explicáveis.
2. **Recommendation Engine / IA:** usa matches e sinais operacionais reais para recomendar a melhor próxima ação comercial e explicar o motivo.

O valor não está apenas em calcular um score. O ciclo precisa terminar em uma ação visível, executável e registrada.

Fluxo alvo:

`cliente/intenção -> requisitos -> estoque -> match -> ranking -> recomendação -> prioridade -> alerta operacional -> ação do vendedor -> registro -> recálculo`

## 2. Problema

O CRM já concentra informações comerciais e possui Central de Operações, oportunidades, clientes, estoque e áreas de recomendação/correspondência. Entretanto, o vendedor não deve depender de navegar manualmente até uma tela específica para descobrir uma oportunidade forte.

Um match de alta qualidade escondido em uma página secundária tem pouco valor operacional.

O sistema deve responder de forma evidente:

- qual cliente possui oportunidade relevante agora;
- qual veículo é mais compatível;
- por que a compatibilidade é alta;
- qual é a urgência;
- qual ação deve ser executada;
- o que aconteceu depois da ação.

## 3. Princípios

### 3.1 Determinístico antes de generativo

O Match Engine v1 deve ser determinístico, auditável e explicável. IA generativa não deve inventar compatibilidade, preço, urgência ou intenção.

A camada generativa pode posteriormente transformar evidências estruturadas em explicações claras para o vendedor.

### 3.2 Nenhum score fictício

A UI só deve mostrar Match %, recomendação ou motivo quando houver dados e cálculo reais que sustentem a informação.

### 3.3 Explicabilidade

Um match deve poder explicar seus fatores principais, por exemplo:

- marca/modelo compatíveis;
- faixa de preço atendida;
- ano dentro da preferência;
- câmbio/carroceria compatíveis;
- quilometragem;
- opcionais;
- localização;
- disponibilidade do veículo.

Os critérios definitivos dependem do inventário dos contratos/dados existentes.

### 3.4 Ação, não apenas informação

A saída relevante deve permitir ao vendedor agir: abrir oportunidade, abrir veículo, vincular veículo, contatar cliente, registrar ação ou descartar justificadamente.

## 4. Match Engine v1

### 4.1 Entrada conceitual

- cliente;
- intenção/demanda;
- requisitos e preferências registrados;
- estoque/veículos disponíveis;
- contexto geográfico quando aplicável;
- restrições comerciais reais disponíveis.

### 4.2 Saída conceitual

Para cada combinação relevante:

- veículo candidato;
- score/nível de compatibilidade;
- fatores positivos;
- divergências;
- requisitos críticos atendidos/não atendidos;
- timestamp/versão do cálculo.

### 4.3 Faixas operacionais

A implementação poderá trabalhar com conceitos como:

- Match forte;
- Match possível;
- Sem match.

Os thresholds e pesos não são fixados por esta RFC. Devem ser calibrados a partir do modelo de dados real e testes.

## 5. Recommendation Engine / IA

A recomendação responde a uma pergunta diferente do Match:

> Dado o contexto atual, o que o vendedor deveria fazer agora e por quê?

Sinais potenciais, se disponíveis e confiáveis:

- score e novidade do match;
- estágio da oportunidade;
- próxima ação/follow-up;
- tempo sem contato;
- disponibilidade do veículo;
- faixa de preço e margem;
- temperatura/momentum/confiança existentes;
- histórico operacional;
- risco de perda;
- entrada recente de veículo compatível.

A recomendação deve apontar evidências. Não deve substituir silenciosamente motores existentes.

## 6. Hierarquia operacional

Para evitar fadiga de alertas, a interface deve diferenciar relevância e urgência.

Conceitualmente:

- **Crítico:** oportunidade forte com risco/janela temporal que exige ação imediata;
- **Alta oportunidade:** match forte com ação recomendada;
- **Recomendação:** relevante, sem urgência alta;
- **Informativo:** disponível para consulta, sem interrupção da fila operacional.

A nomenclatura e thresholds finais serão definidos na implementação.

## 7. Central de Operações

Requisito central:

**nenhum match classificado como oportunidade de alta prioridade pode existir somente dentro de Correspondências IA.**

Quando houver dados reais, o sinal deve ser surfaced na operação diária.

### 7.1 Missão do Dia

Pode elevar um match/recomendação a decisão prioritária, mostrando:

- cliente;
- veículo recomendado;
- força do match;
- motivo resumido;
- urgência;
- CTA operacional.

### 7.2 Conselheiro AutoPonte

Funciona como segunda camada de priorização e explicação, ordenando recomendações e direcionando a ação.

### 7.3 Correspondências IA

Permanece como workspace completo para:

- todos os matches;
- filtros;
- explicabilidade;
- descartes;
- histórico;
- análise de alternativas.

Não deve ser o único ponto de descoberta de oportunidade crítica.

## 8. Oportunidades

Os modos definidos no P1 devem suportar os sinais futuros sem exigir novo redesign estrutural.

### Lista

Máxima densidade, com badge compacto de Match e prioridade quando houver dados reais.

### Detalhes

Modo operacional intermediário, apto a mostrar:

- Match;
- `Por que recomendamos`;
- próxima ação;
- CTA.

### Cards

Modo visual, com Match destacado sem replicar todo o workspace.

## 9. Ciclo de vida do alerta

Uma recomendação não pode permanecer eternamente como alerta novo.

Eventos como estes devem provocar atualização/reavaliação:

- vendedor abriu a oportunidade;
- realizou contato;
- vinculou veículo;
- descartou o match com motivo;
- veículo deixou de estar disponível;
- demanda mudou;
- oportunidade avançou/perdeu;
- novo veículo melhor entrou no estoque.

O estado deve ser recalculado para reduzir ruído e fadiga de notificação.

## 10. Métricas futuras

A arquitetura deve permitir medir posteriormente:

- matches gerados;
- matches visualizados;
- tempo até ação;
- matches aceitos/descartados;
- contatos derivados de recomendação;
- oportunidades avançadas;
- propostas/vendas atribuíveis;
- motivos de descarte;
- qualidade/calibração por faixa de score.

Não implementar métricas artificiais antes dos eventos reais estarem definidos.

## 11. Dependências e contratos

Antes de implementar, auditar no repositório os contratos reais de:

- Clientes;
- Potenciais clientes/leads;
- Oportunidades;
- Veículos/Estoque;
- intenção/demanda;
- localização;
- preços/margem;
- Central de Operações;
- Correspondências IA;
- Recommendation Engine existente, se houver;
- ADE Core;
- Business Temperature;
- Opportunity DNA;
- Confidence;
- Explainability;
- Flow Engine.

Regra: reutilizar contratos existentes. Não duplicar entidade ou motor por inferência.

## 12. Faseamento proposto

### Fase 0 — fechamento UX

Corrigir responsividade real do Opportunity Workspace e concluir homologação P1-01 a P1-04.

### Fase 1 — auditoria de dados/contratos

Mapear os campos confiáveis para matching e identificar lacunas.

### Fase 2 — Match Engine v1

Implementar matching determinístico, testes, explicabilidade e versionamento do cálculo.

### Fase 3 — UI de Correspondências

Exibir candidatos, fatores, divergências e ações sem dados fictícios.

### Fase 4 — Recomendações v1

Combinar Match com sinais operacionais reais e produzir próxima ação explicável.

### Fase 5 — Central de Operações

Surface de alta prioridade em Missão do Dia, Conselheiro e indicadores apropriados.

### Fase 6 — aprendizado/calibração

Usar resultados reais para calibrar pesos, thresholds e qualidade das recomendações.

## 13. Não objetivos imediatos

- não substituir ADE Core ou outros motores existentes;
- não fazer IA generativa decidir compatibilidade sem evidência;
- não inventar dados ausentes;
- não introduzir CPF/RG como efeito colateral desta RFC;
- não usar a evolução FIPE/busca por placa como bloqueio do MVP de Matches, salvo dependência técnica comprovada;
- não redesenhar novamente Oportunidades sem necessidade funcional.

## 14. Critérios de aceite do MVP

O MVP estará funcionalmente completo quando:

1. uma demanda real puder ser comparada com estoque real;
2. o sistema produzir ranking explicável;
3. o vendedor puder entender por que um veículo foi recomendado;
4. o vendedor puder agir diretamente a partir do resultado;
5. uma oportunidade de alta prioridade for surfaced na operação, e não escondida;
6. a ação do vendedor alterar o estado/relevância da recomendação;
7. nenhum score ou recomendação depender de placeholder fictício;
8. existirem testes do cálculo e do ciclo principal.

## 15. Decisão pendente

Após concluir o hotfix mobile, realizar auditoria técnica dos contratos atuais e transformar esta RFC em plano de implementação do Match Engine v1, com pesos, campos, thresholds, ownership e persistência definidos sobre evidência do código real.
