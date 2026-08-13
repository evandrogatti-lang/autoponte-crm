# Missão de amanhã — filtros operacionais e confiabilidade de versão

**Data:** 14/08/2026

## Ordem obrigatória

### 1. Validar em produção a busca pelo formulário em Estoque

- Pesquisar a placa `LT5FA89`.
- Pesquisar por marca e modelo.
- Limpar filtros.
- Abrir a ficha e voltar ao estoque.
- Validar os fluxos em desktop e mobile.

**Critério de saída:** a busca pelo formulário deve gerar uma URL sem parâmetros vazios e retornar os mesmos resultados da URL direta.

### 2. Filtros de Potenciais Clientes

Se a validação de Estoque for aprovada, levantar e implementar filtros usando apenas campos existentes:

- busca;
- cidade;
- interesse;
- etapa;
- prioridade;
- probabilidade;
- valor desejado;
- última atualização.

### 3. Filtros de Parceiros

Depois dos filtros de Potenciais Clientes, levantar e implementar:

- busca;
- estado;
- cidade;
- status;
- tipo;
- integração;
- situação e volume de estoque;
- atualização.

### 4. Exclusões desta etapa

Não implementar Bairro, edição real de entidades, T2B safe-area ou T2C rail de tablet sem etapa específica aprovada.

## Confiabilidade de versão

Planejar a exibição de versão ou commit ativo no CRM e uma futura tela de status operacional. Não implementar nesta etapa sem aprovação específica.
