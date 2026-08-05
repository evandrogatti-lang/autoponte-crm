# Sprint Operational Layer V1 — Opportunity Workspace

## Resultado

- Cards do Mission Control e etapas do Flow Engine abrem oportunidades reais.
- Workspace individual com cliente, veículo desejado, troca, FIPE, faixa de avaliação, margem, etapa e inteligência ADE.
- Ações operacionais: alterar etapa, registrar contato, adicionar observação e definir próxima ação.
- Persistência transacional no PostgreSQL/Supabase.
- Histórico em `opportunity_events` com ator, data, descrição e snapshot da inteligência.
- Recálculo automático de probabilidade, confiança, temperatura, momentum, prioridade e recomendação após cada ação.
- Revalidação automática de `/crm`, `/oportunidades` e do workspace alterado.
- Fallbacks e feeds demonstrativos removidos do Mission Control.
- Negócio perdido recebe 0%; somente `closed` recebe 100%; oportunidades abertas continuam limitadas a 97%.

## Banco

Execute `supabase/002_opportunity_workspace.sql` antes de publicar o código. A migração é idempotente e cria o histórico inicial para registros existentes sem inventar interações comerciais.

## Validação

```bash
npm run test:ade
npm run test:operational
npm run build
```

O instalador do patch executa esses comandos e interrompe caso qualquer etapa falhe.
