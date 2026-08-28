# Fronteiras arquiteturais

O AutoPonte permanece um monólito modular. As fronteiras são lógicas e devem ser extraídas por fluxo vertical, sem reorganização massiva.

## Responsabilidades

- `app/**/page.tsx`: autorização de página, composição e apresentação.
- `app/api/**/route.ts`: autenticação/autorização, transporte HTTP e tradução de erros.
- `lib/<domínio>/*-service.ts`: casos de uso, transações e coordenação de domínio.
- `lib/<domínio>/*.ts`: regras puras, estados, validação e cálculos.
- `db/*.ts`: representação de persistência; não contém regra de negócio.

## Slice de referência: lifecycle de veículo

`app/api/vehicles/[id]/lifecycle/route.ts` delega parsing e execução para `lib/vehicles/lifecycle-service.ts`. O serviço coordena readiness, lock transacional, máquina de estados, persistência e evento de auditoria. A rota não importa tabelas Drizzle.

Novas extrações devem seguir o mesmo padrão e preservar contratos HTTP. Não criar repositories genéricos antes de existir mais de um adaptador real.
