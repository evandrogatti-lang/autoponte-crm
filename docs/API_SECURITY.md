# Política de segurança das APIs

## Públicas por desenho

| Rota | Métodos | Proteção funcional |
|---|---|---|
| `/api/fipe` | GET | somente leitura e parâmetros validados |
| `/api/buyer-profiles` | POST | consentimento obrigatório e validação de entrada |
| `/api/trade-in` | POST | consentimento, tipos/quantidade/tamanho de arquivos |
| `/api/consignments` | POST, GET | consentimento e arquivos; leitura exige token aleatório armazenado como hash |

Rate limiting e proteção de borda devem ser configurados na plataforma para as três rotas públicas de escrita. Nenhuma delas pode aceitar identidade, confiança ou autorização fornecida pelo cliente.

## Autenticadas

Consultas internas como casos, veículos, parceiros, cidades, fotos e workspace de oportunidade exigem identidade válida. A ausência de identidade retorna 401.

## Autorizadas

- veículos e lifecycle: `vehicles.manage`;
- oportunidades: `opportunities.manage`;
- casos e operação de vendedores: `seller_operations.manage`;
- evidência VQI: permissão definida por `VQI_EVIDENCE_PERMISSION`;
- usuários e papéis: administrador do sistema;
- parceiros: `vehicles.manage`.

Permissões `*_own`/`*_own_store` não concedem acesso global. Elas só poderão ser usadas quando as queries aplicarem e testarem o escopo por loja/parceiro.

Falha de permissão retorna 403. Dados inválidos retornam 400, conflitos de estado retornam 409 e ausência do recurso retorna 404.

`app/api/_access.ts` é o adaptador padrão para novas rotas. Rotas públicas devem ser adicionadas explicitamente ao teste de política e a este documento.
