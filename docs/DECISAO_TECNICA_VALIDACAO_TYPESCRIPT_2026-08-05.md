# AutoPonte — decisão técnica sobre a validação TypeScript

**Data:** 05/08/2026  
**Versão:** Operational Stabilization V1.2.1

## Problema encontrado

A instalação da V1.2 aplicou os arquivos operacionais e concluiu os testes funcionais iniciais, mas foi interrompida na etapa de validação TypeScript.

A configuração de validação incluía `validation-stubs.d.ts`, criado para permitir verificações em um ambiente de preparação sem todas as dependências de tipos instaladas. No projeto local real, entretanto, já existem os tipos oficiais de React, React DOM, Next.js e Drizzle. O stub redeclarava módulos que já possuíam declarações oficiais e podia produzir conflitos de tipos.

## Decisão

1. A validação local e de CI deve usar exclusivamente os tipos oficiais instalados pelo projeto.
2. `validation-stubs.d.ts` não participa mais de nenhuma validação do projeto real.
3. Somente imports de CSS recebem uma declaração auxiliar neutra em `validation-assets.d.ts`.
4. A configuração principal do Next.js continua excluindo arquivos auxiliares de validação.
5. Falhas de TypeScript e build devem ser gravadas em arquivos de log externos ao código-fonte.
6. Backups e logs não podem permanecer dentro da árvore compilada do Next.js.

## Efeito sobre a aplicação

Esta correção não altera tabelas, dados, regras do ADE, oportunidades ou registros existentes. Ela corrige apenas a forma de validar o código que já foi aplicado pela V1.2.

## Critério de aprovação

A estabilização será considerada validada quando ocorrerem, nesta ordem:

- testes operacionais aprovados;
- smoke test de rotas e interface aprovado;
- TypeScript aprovado com tipos oficiais;
- build Next.js limpo aprovado.
