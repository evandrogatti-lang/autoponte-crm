# Mission Control — Slice 2

## Decisões de escopo

- `/crm` consome `commercial_cases`, `case_tasks`, usuários e timeline canônicos.
- A Próxima Ação é selecionada somente por `deriveNextAction`, do contrato de Cases. A interface não deriva nem reordena tarefas.
- A fila apenas classifica a Próxima Ação já derivada na ordem operacional definida para o slice: URGENT, vencida, vence hoje, HIGH, sem Próxima Ação e demais itens relevantes.
- Leituras internas seguem a política vigente de identidade autenticada. Escritas de Cases continuam exigindo `seller_operations.manage`; não existe `seller_operations.read` no modelo atual e este slice não cria nova permissão.
- Se a leitura das estruturas da migration `0022` falhar, `/crm` entrega um estado indisponível seguro, sem fallback para dados demonstrativos ou para `trade_ins`.

## Decisão temporária: Recently Lost

No Slice 2, "Recently Lost" significa Case perdido com `closed_at` nos últimos 14 dias corridos. Essa janela é temporária, está centralizada em `RECENTLY_LOST_DAYS` e deve ser reavaliada com uso operacional real antes de virar política permanente.
