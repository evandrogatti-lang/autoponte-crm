AUDITORIA UX/UI — AutoPonte CRM
================================

Este documento é o registro canônico cumulativo da Auditoria UX/UI do projeto AutoPonte.
Fonte auxiliar: docs/PATCH_GROUP_2.md (não modificado nem promovido a canônico).

1) Objetivo e escopo
- Objetivo: identificar e corrigir problemas críticos de usabilidade e acessibilidade da fundação de navegação compartilhada (sidebar/topbar/nav móvel) sem alterar regras de negócio.
- Escopo: componentes de navegação compartilhada em `components/crm/CRMAppShell.*`, regras CSS associadas, e comportamentos móveis/ARIA. Exclusões: engines, integrações, banco de dados, persistência e lógica de negócio.

2) Regra crítica
- Regra obrigatória: NÃO alterar regras de negócio, engines, integrações, persistência, ou fluxos transacionais. Correções devem ser estruturais/visuais e reversíveis.

3) Arquitetura e componentes de referência
- Componentes principais auditados:
  - `components/crm/CRMAppShell.tsx` — shell compartilhado (sidebar, topbar, nav, mobile toggle).
  - `components/crm/CRMAppShell.module.css` — estilos base/responsivos ligados ao shell.
  - `components/apdl/index.tsx` — primitives de UI utilizadas.
- Observação: a navegação móvel é construída como um grid de 5 colunas dentro de `<nav className={styles.nav}>` quando `@media (max-width:760px)`.

4) Diagnóstico consolidado
- Sintomas relatados: botão "Mais" invisível/coluna vazia no mobile; quinto slot da grade aparece vazio; em produção o botão estava no DOM mas com largura reduzida (~25px).
- Causa final verificada: o botão `.mobileMoreButton` estava fora de `<nav className={styles.nav}>` (filho de `aside.sidebar`), portanto não fazia parte da grade móvel; isso deixou a quinta coluna vazia e o botão comprimido fora do grid.

5) Patch Group 1 — Acessibilidade (resumo)
- Ações: adição de `aria-hidden` em ícones, `aria-current="page"` em links ativos, focus-visible visível, atalhos/teclado para busca, e melhorias na gestão de foco.
- Arquivos impactados: `components/crm/CRMAppShell.tsx`, `components/apdl/index.tsx`.
- Validações: ESLint focal e `tsc --noEmit` em arquivos modificados passaram.

6) Patch Group 2 — Navegação móvel (resumo)
- Ação principal: mover o botão `mobileMoreButton` para dentro de `<nav className={styles.nav}>` como último filho (5º item na grade móvel). Mantive `mobileMorePanel` fora do `nav`.
- CSS: manter a regra base de ocultação e regra mobile de exibição sem `!important`:
  - `.mobileMoreButton { display: none; }`
  - `@media (max-width: 760px) { .mobileMoreButton { display: flex; } }`
- Objetivo: corrigir posicionamento horizontal/compressão sem alterar o grid nem comportamento.

7) Causa definitiva e solução do botão “Mais”
- Causa: estrutura DOM incorreta — botão fora do container de grade móvel (`nav.nav`).
- Solução: movi o botão para ser um filho direto de `nav.nav`, garantindo que ele participe do grid de 5 colunas no mobile; preservei todos os handlers, refs e ARIA.

8) Arquivos e commits envolvidos
- `components/crm/CRMAppShell.module.css`
  - Commit: `71677e5` — ajuste inicial de CSS (visibilidade base); enviado e sincronizado.
  - Commit: `9877372` — atualização mínima de CSS para manter ocultação base + exibição mobile (mantida ao mover o botão).
- `components/crm/CRMAppShell.tsx`
  - Commit: `9877372` — movimentação estrutural do botão para dentro do `nav`.
- Notas: `docs/PATCH_GROUP_2.md` foi criado como fonte auxiliar.

9) Validações técnicas e visuais
- Lint/TypeScript:
  - ESLint (focal): passou (`LINT_EXIT=0`) nos arquivos alterados.
  - TypeScript (`tsc --noEmit`): passou (`TSC_EXIT=0`) após ajustes.
- Validação visual:
  - Deploy na Vercel: build automático executado e validado em produção.
  - Teste visual: aprovado — botão "Mais" aparece como quinto item, comportamentos (Esc, click-outside, foco) funcionando.

10) Limitações ambientais conhecidas
- Build local: houve falha durante `npm run build` por `EPERM` ao manipular artefatos em `.next` devido a bloqueo do Windows/OneDrive. Classificado como bloqueio ambiental; não foi tratado por alterações de código.

11) Pendências priorizadas (Patch Groups 3–5)
- Group 3 (Prioridade alta): revisar **responsividade fina** do bottom bar em iOS Safari (gestos e safe-area), validar overflow horizontal e gaps na grade quando labels encurtam.
- Group 4 (Prioridade média): testes de acessibilidade automatizados (axe, Lighthouse CI) em páginas gerenciadas e não-gerenciadas; corrigir contrastes residuais.
- Group 5 (Prioridade baixa): unificar variantes de ícone e tokens CSS para reduzir duplicação e facilitar temas futuros.

12) Histórico de atualizações
- 2026-08-05: `DECISAO_TECNICA_VALIDACAO_TYPESCRIPT_2026-08-05.md` (documento de decisão TypeScript).
- 2026-08-06: MAPA_ACAO_PRIORITARIA e planejamento.
- 2026-08-13: Patch Group 1 aplicado e registrado; Patch Group 2 aplicado, commit `9877372` enviado; validações e teste visual aprovados; EPERM local registrado.

Declarações finais
- Confirma-se que nenhuma regra de negócio, engine, integração, persistência ou dado foi alterado durante estes patches.

---
Registro gerado em: 2026-08-13
Autor: gerado por automação assistida (registrado por Evandro Gatti)

13) Status Onda 1A
- Onda 1A concluída: alterações limitadas ao `components/crm/CRMAppShell.tsx` (conversão de anchors internos para `Link` e atualização dos links do painel móvel). Commit associado: `05c7b55`. Status: concluída em produção — validação visual e funcional aprovada.
