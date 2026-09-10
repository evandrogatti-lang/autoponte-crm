# Match Core V1 — Plano de preparação de Tenant Greenfield

**Status:** reconciliado com `TENANT MODEL V1 — APPROVED`; nenhuma migration, instrução SQL, alteração de schema ou mudança runtime está autorizada.
**Base canônica:** `TENANT_MODEL_V1_PROPOSED.md`.
**Princípio:** não existem dados reais a preservar ou migrar. Não projetar backfill, quarentena, classificação de legado ou compatibilidade sem mudança comprovada dessa premissa.

## 1. Objetivo e resultado esperado

Preparar um desenho físico greenfield para a boundary organizacional/autorizativa aprovada, sem abrir acesso cross-tenant e sem antecipar schema, migration, RLS ou runtime.

Ao final de uma execução futura aprovada:

- Tenant, Store, Membership, role assignment e StoreAccess possuem representação física coerente com o contrato aprovado;
- as raízes tenant-scoped recebem Tenant físico e as filhas seguem sua âncora relacional, salvo justificativa estrutural aprovada;
- `VehicleSpecification` é global, técnico e não sensível; `TenantVehicle` é físico, comercial e pertence a exatamente um Tenant;
- novos intakes derivam Tenant no servidor por configuração persistida ou por Auth + membership ativa;
- RLS continua fora do escopo deste documento e requer plano/autorizações próprios;
- nenhuma falha ou rollback futuro pode degradar para acesso cross-tenant.

## 2. Decisões vinculantes

1. Tenant é a boundary de autorização; Store é unidade operacional; Partner é relação comercial.
2. CRM User não recebe `tenant_id` direto como fonte canônica: pertencimento vem de membership.
3. Contexto de Tenant solicitado pelo cliente só é válido após Auth + membership ativa persistida; payload não é autorização.
4. Membership ativa, role assignment, StoreAccess, permission e ownership são verificações separadas.
5. As entidades tenant-scoped V1 são:
   - `buyer_profiles`;
   - `TenantVehicle`;
   - `consignments`;
   - `trade_ins`;
   - `vehicle_matches`;
   - `commercial_cases`;
   - `customers`;
   - `customer_intents` como filha de `commercial_cases`, por herança de Tenant.
6. `tenant_id` não pode ser inferido de `store_id`, `partner_id`, `inventory_scope`, role, owner, e-mail, telefone, cidade ou usuário que executa a migration.
7. Como não há legado real, novos registros entram tenant-aware ou falham fechados; não há fluxo de classificação, backfill ou quarentena nesta fase.
8. Divergência comprovada em runtime futuro resulta em `denied`.
9. Match herda um tenant já validado dos componentes; não escolhe tenant.
10. Aprovação arquitetural não autoriza schema, constraints, policies, RLS, grants, integração ou runtime.

## 3. Fora do escopo

- Executar ou gerar migration SQL definitiva.
- Alterar schema Drizzle/Supabase ou banco.
- Criar tenant por Store ou Partner automaticamente.
- Criar Vehicle, Customer, Match ou `source_vehicle_links`.
- Deduplicar Buyer Profile/Customer.
- Integrar kernel/adapters ao motor legado.
- Habilitar shadow execution, feature flag, UI ou API.
- Corrigir dados de Production durante inventário ou dry-run.
- Autorizar acesso cross-tenant ou bypass administrativo.

## 4. Modelo conceitual mínimo

Este modelo orienta futuro desenho físico, mas não é uma especificação SQL nem autoriza migration.

```ts
type Tenant = {
  id: TenantId;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
};

type TenantMembership = {
  id: string;
  tenantId: TenantId;
  crmUserId: string;
  status: "active" | "inactive" | "revoked";
  createdAt: string;
  updatedAt: string;
};

type TenantRoleAssignment = {
  membershipId: string;
  roleCode: "owner" | "manager" | "seller";
};

type StoreAccess = {
  membershipId: string;
  storeId: string;
};
```

Contratos aprovados que o futuro desenho físico deverá representar:

- Store pertence a exatamente um Tenant; `StoreAccess` só referencia Store do Tenant da Membership.
- `owner` possui acesso implícito às Stores do próprio Tenant; `manager` e `seller` exigem `StoreAccess` em operações vinculadas a Store.
- Administrador da plataforma não é role tenant-scoped, não recebe acesso automático e eventual suporte exige grant explícito futuro.
- `VehicleSpecification` não contém identificadores físicos ou dados comerciais; `TenantVehicle` concentra o veículo físico e a operação comercial tenant-scoped.
- Raízes possuem Tenant físico. Filhas herdam Tenant pela FK da raiz; materialização em filha exige justificativa estrutural. `vehicle_matches` é candidato explícito, condicionado ao contrato final de seus pais tenant-scoped.
- Intake público resolve Tenant/Store no servidor por configuração persistida; intake interno o deriva de Auth + membership ativa. Nenhum payload escolhe autorização.

## 5. Plano greenfield efetivo

### 5.1 Escopo aprovado

- Tenant é a única boundary organizacional e de dados; Store é unidade operacional subordinada.
- Membership ativa comprova pertencimento; roles são assignments tenant-scoped separados; `owner`, `manager` e `seller` não são roles globais.
- `VehicleSpecification` é catálogo técnico global, não sensível e não representa veículo físico; `TenantVehicle` pertence a exatamente um Tenant e é o candidato acionável do Match Core.
- `buyer_profiles`, `trade_ins`, `consignments`, `customers`, `commercial_cases` e `TenantVehicle` são raízes tenant-scoped.
- Filhas herdam Tenant por sua FK âncora. `vehicle_matches` é candidato explícito a Tenant físico + validação relacional, mas seus pais tenant-scoped obrigatórios só serão definidos pelo contrato final da entidade.
- Partner não é Tenant; `store_id`, `partner_id`, e-mail, URL, payload e ownership informal não autorizam acesso.

### 5.2 Novos registros

- Intake público resolve Tenant, tipo de intake e Store opcional por configuração persistida server-side vinculada a exatamente um Tenant.
- O identificador público é apenas routing, inclusive quando opaco e não previsível; não é controle de autorização.
- Intake interno autenticado deriva Tenant de Auth + membership ativa.
- Configuração inexistente, inativa, inconsistente ou incompatível falha fechada.

### 5.3 Limites desta preparação

Este plano não define nomes físicos de tabelas/colunas, FKs, constraints, índices, policies, grants, funções, permissões detalhadas, migrations, runtime ou rollout. Não há dados reais que demandem backfill, quarentena, dual-write, classificação de legado, batch, journal de aplicação ou rollback de dados.

### 5.4 Pré-requisitos antes da primeira migration

1. Proposta física revisável, estritamente derivada deste contrato, para Tenant, Store, Membership, role assignment, StoreAccess, `VehicleSpecification`, `TenantVehicle` e raízes tenant-scoped.
2. Matriz detalhada de ações/permissões por role e definição das ações que exigem Store.
3. Contrato final de `vehicle_matches`, incluindo quais pais tenant-scoped são obrigatórios e se a materialização física de Tenant é justificada.
4. Fechamento de SV-06 a SV-09 para a relação Source→`TenantVehicle`.
5. Limites concretos do catálogo técnico de `VehicleSpecification` e regra de identidade física, sem introduzir identificadores físicos no catálogo global.
6. Desenho do grant excepcional de suporte, se esse recurso for efetivamente necessário.

### 5.5 Dependências futuras separadas

RLS, loaders tenant-first, APIs, runtime, Storage, integrações, homologação e rollout permanecem fora do escopo. Um plano futuro de RLS deve derivar acesso de Auth, membership ativa, role assignment, StoreAccess quando aplicável e âncoras relacionais confiáveis; administrador da plataforma não é bypass e `service_role` nunca representa acesso pessoal/interativo.

## Apêndice A — plano legado arquivado e não normativo

O conteúdo abaixo é mantido somente como histórico documental. Suas premissas de dados legados, classificação, dry-run, backfill, quarentena, batches, journal e rollback de dados **não se aplicam** ao estado atual e não autorizam qualquer ação. O plano efetivo é a seção 5 acima e o `TENANT MODEL V1 — APPROVED`.

### 5. Estados de classificação do backfill

```ts
type TenantBackfillClassification =
  | {
      status: "RESOLVED";
      tenantId: TenantId;
      evidenceIds: readonly string[];
      reasonCodes: readonly TenantBackfillReasonCode[];
    }
  | {
      status: "UNRESOLVED";
      candidateTenantIds: readonly TenantId[];
      reasonCodes: readonly TenantBackfillReasonCode[];
    }
  | {
      status: "CONFLICT";
      candidateTenantIds: readonly TenantId[];
      evidenceIds: readonly string[];
      reasonCodes: readonly TenantBackfillReasonCode[];
    };
```

### RESOLVED

- existe exatamente um Tenant sustentado por origem aprovada e auditável;
- todas as evidências obrigatórias concordam;
- nenhuma regra proibida de inferência foi usada;
- o registro pode receber `tenant_id` somente numa execução futura autorizada.

### UNRESOLVED

- nenhuma evidência aprovada identifica Tenant; ou
- o relacionamento necessário ainda não existe; ou
- há somente store, partner, ownership, contato ou heurística.

Tratamento: `tenant_id = null`, quarentena e ausência de participação em qualquer fluxo tenant-scoped.

### CONFLICT

- evidências aprovadas apontam para mais de um Tenant; ou
- registro relacionado já comprovado pertence a Tenant diferente; ou
- uma relação violaria as invariantes Buyer–Source–Vehicle, Case ou Customer Intent.

Tratamento: `tenant_id = null`, bloqueio, revisão humana e decisão auditada. Nunca escolher “mais recente”, “mais frequente” ou “mais provável”.

### 6. Fontes de evidência permitidas e proibidas

### Permitidas

1. **Atribuição explícita aprovada:** registro de decisão contendo entidade, ID, Tenant, ator, timestamp, justificativa/reason code e origem verificável.
2. **Origem de criação tenant-aware:** para registros novos criados futuramente depois de `TenantContext` validado e persistido no mesmo ato.
3. **Propagação relacional determinística:** somente quando todas as entidades âncora obrigatórias já forem `RESOLVED`, pertencerem ao mesmo Tenant e a regra relacional estiver aprovada abaixo.
4. **Manifesto externo aprovado:** inventário assinado/revisado com IDs exatos, sem usar correspondência por texto ou contato.

### Proibidas como prova suficiente

- `crm_users.store_id`;
- qualquer `partner_id`;
- `vehicles.inventory_scope`;
- seller owner/reviewer;
- role ou permission global;
- cidade, região, nome, e-mail ou telefone;
- placa, FIPE, marca/modelo/ano ou similaridade de veículo;
- Match ou Case legado isoladamente;
- ordem de criação, último usuário ou tenant mais frequente;
- tenant único existente no ambiente;
- fallback configurável ou constante default.

### 7. Regras de classificação por entidade

| Entidade | Como pode chegar a `RESOLVED` | Quando fica `UNRESOLVED` | Quando vira `CONFLICT` |
|---|---|---|---|
| `buyer_profiles` | Atribuição explícita ou origem futura com TenantContext validado | Registros públicos legados sem vínculo autorizativo | Evidências explícitas apontam para tenants diferentes |
| `vehicles` | Atribuição explícita ou criação futura tenant-aware | Apenas inventory scope, partner, owner ou atributos do veículo | Relações aprovadas/manifestos discordam |
| `consignments` | Atribuição explícita ou intake futuro tenant-aware | Intake público legado sem roteamento tenant comprovado | Evidências explícitas discordam |
| `trade_ins` | Atribuição explícita ou intake futuro tenant-aware | Oportunidade legada sem roteamento comprovado | Evidências explícitas discordam |
| `vehicle_matches` | Buyer, Source e Vehicle (quando resolvido) concordam no mesmo Tenant; ou atribuição explícita | Qualquer componente obrigatório unresolved | Qualquer componente resolvido diverge |
| `commercial_cases` | Atribuição explícita; ou todos os anchors presentes e resolvidos (`vehicle`, `customer`, `opportunity`) concordam | Nenhum anchor seguro ou algum anchor obrigatório unresolved | Anchors resolvidos divergem |
| `customers` | Atribuição explícita ou criação futura tenant-aware | Contato/Customer legado sem origem tenant comprovada | Intents/Cases aprovados apontam para tenants diferentes |
| `customer_intents` | Customer, Buyer Profile e Case resolvidos e concordantes | Um componente está unresolved | Componentes resolvidos divergem |

Regras adicionais:

- `vehicle_matches.vehicle_id = null` não impede classificar tenant se Buyer e Source estiverem resolvidos e concordarem, mas o Match continua não acionável por Vehicle unresolved.
- Um vínculo Case/Match legado pode corroborar uma classificação; sozinho não cria tenant para sua contraparte.
- Customer não é deduplicado por contato durante o backfill.
- A propagação nunca atravessa uma aresta cujo significado comercial seja ambíguo.

### 8. Artefatos obrigatórios do dry-run

O dry-run é estritamente read-only e deve produzir artefatos locais protegidos, sem alterar dados.

### 8.1 Manifesto da execução

- `runId` opaco;
- ambiente e conexão lógica, sem segredos;
- commit SHA e versão do classificador;
- instante inicial/final;
- tabelas e filtros analisados;
- contagens de entrada;
- hash do conjunto de IDs por entidade;
- hash da configuração e do catálogo de evidências;
- ator/revisor responsável.

### 8.2 Relatório agregado

Por entidade:

- total lido;
- total já com tenant;
- `RESOLVED`, `UNRESOLVED` e `CONFLICT`;
- percentuais;
- contagem por reason code;
- referências órfãs;
- divergências relacionais;
- duplicidades de membership;
- registros alterados desde o início do snapshot.

### 8.3 Manifesto por registro

- tipo e ID do registro;
- classificação;
- Tenant proposto somente para `RESOLVED`;
- IDs das evidências, nunca PII bruta;
- reason codes ordenados;
- dependências usadas;
- fingerprint dos campos relevantes;
- decisão humana pendente, se houver.

O manifesto deve ser armazenado fora de logs públicos e obedecer ao controle de acesso do ambiente. Não exportar nomes, contatos, documentos ou conteúdo livre quando IDs/reason codes forem suficientes.

### 9. Propriedades obrigatórias do classificador dry-run

- puro sobre snapshots previamente carregados;
- determinístico para mesmas entradas, versão e catálogo;
- idempotente: repetir não altera resultado;
- fail-closed: erro de parse, referência ausente ou evidência incompleta não gera `RESOLVED`;
- sem relógio, UUID ou I/O interno;
- reason codes fechados, estáveis e sem PII;
- não muta entrada;
- não faz update, insert, delete ou lock de escrita;
- não cria tenants ou memberships;
- não avalia score/confidence do Match;
- não resolve Source→Vehicle por similaridade.

### 10. Fases do plano

### Fase 0 — Congelamento e autorização documental

Entregas:

- catálogo final de reason codes do backfill;
- owners humanos da migration, segurança e dados;
- entidade/ambiente em escopo;
- política de evidência e retenção dos manifestos;
- janela, limites de batch e critérios de abort;
- plano de comunicação e incidente.

Não avança sem aprovação de Segurança, Engenharia e responsável pelos dados.

### Fase 1 — Inventário read-only

1. Contar registros por entidade e status.
2. Levantar relações órfãs e cardinalidades reais.
3. Detectar IDs duplicados em manifestos e memberships candidatas.
4. Medir mutabilidade durante uma janela representativa.
5. Confirmar, apenas por inspeção documental/read-only, quais caminhos de conexão precisarão de revisão de segurança futura.
6. Registrar baseline com hashes e timestamp.

Resultado: inventário reproduzível, sem classificação autorizativa.

### Fase 2 — Dry-run do classificador

1. Carregar snapshots consistentes e paginados.
2. Classificar entidades âncora por evidência explícita.
3. Propagar apenas pelas regras determinísticas aprovadas.
4. Executar verificação relacional completa.
5. Produzir relatórios e manifestos.
6. Repetir com as mesmas entradas e comparar igualdade profunda.
7. Submeter `UNRESOLVED` e `CONFLICT` à revisão, sem aplicar correção.

Resultado: proposta de backfill, nunca alteração.

### Fase 3 — Migration estrutural aditiva futura

Ordem conceitual:

1. criar `tenants`;
2. criar `tenant_memberships`;
3. criar índices/constraints internos dessas entidades;
4. adicionar `tenant_id` nullable, sem default, às oito entidades;
5. adicionar FKs e índices compatíveis com rollout gradual;
6. criar estruturas de journal/quarentena aprovadas.

Esta fase exige migration específica, revisão de locks e autorização separada. Não inclui backfill.

### Fase 4 — Cadastro controlado de Tenant e memberships

1. Criar tenants a partir de manifesto explicitamente aprovado.
2. Criar memberships a partir de decisões explícitas.
3. Validar ausência de memberships ativas duplicadas ou contraditórias.
4. Provar que Store/Partner não foram usados como fonte automática.
5. Manter runtime Match V1 desabilitado.

### Fase 5 — Backfill controlado futuro

1. Aplicar somente linhas `RESOLVED` cujo fingerprint ainda coincida com o dry-run.
2. Processar em batches pequenos, ordenados por chave estável.
3. Registrar antes/depois, evidências, versão e run ID no journal.
4. Usar operação condicional: atualizar apenas quando `tenant_id` continua nulo e fingerprint permanece válido.
5. Se o registro mudou, não atualizar; reclassificar.
6. Não tocar em `UNRESOLVED` ou `CONFLICT`.
7. Validar após cada batch e interromper ao primeiro gate violado.

### Fase 6 — Reconciliação e quarentena

1. Reexecutar o classificador contra o estado pós-batch.
2. Comparar relatório esperado versus aplicado.
3. Confirmar que nenhum tenant preexistente foi sobrescrito.
4. Publicar fila restrita de revisão de `UNRESOLVED`/`CONFLICT`.
5. Exigir decisão humana com evidência para mudar a classificação.
6. Repetir dry-run antes de qualquer nova aplicação.

### Fase 7 — Constraints por entidade

`NOT NULL` não é uma decisão global. Cada entidade avança separadamente quando:

- 100% dos registros em escopo operacional estão `RESOLVED`;
- os demais foram excluídos formalmente do escopo ou permanecem em armazenamento/quarentena que não participa do runtime;
- novos writes exigem TenantContext validado;
- relações cross-tenant são impedidas por serviço e verificações de banco aprovadas;
- rollback foi ensaiado.

Se registros legados precisam permanecer na tabela com `tenant_id = null`, não aplicar `NOT NULL`; manter a integração runtime desabilitada e adotar constraint compatível com o modelo de quarentena.

### Fase 8 — Dependências futuras fora deste plano

RLS, loaders tenant-first, runtime e rollout não fazem parte desta migration e não estão autorizados. Mesmo depois de backfill e constraints adequadas, permanecem `BLOCKED / REQUIRES APPROVAL` e exigem plano separado que deverá:

1. especificar a política de isolamento sem assumir que RLS já habilitada seja suficiente;
2. receber aprovação explícita de Segurança e Engenharia;
3. possuir seus próprios testes, gates, rollout e rollback;
4. não reutilizar a aprovação deste plano como autorização de implementação.

### 11. Gates principais

Os gates são estritamente sequenciais e bloqueantes. Existem exatamente sete gates principais; verificações adicionais são subchecks internos e não autorizam avanço isoladamente.

| Gate | Objetivo | Critérios objetivos de entrada | Critérios objetivos de saída | Evidências exigidas | Condições de bloqueio |
|---|---|---|---|---|---|
| `GATE-A` — autorização e escopo | Congelar decisões, responsáveis e limites | TEN-05–TEN-12 aplicáveis aprovadas; ambiente ainda não acessado; oito entidades confirmadas | Owners de Engenharia/Segurança/Dados nomeados; fontes permitidas/proibidas e NO-GO aprovados; autorizações seguintes explicitamente separadas | Registro de decisões, matriz de escopo, responsáveis e checklist assinado | Decisão TBD; ambiente/owner indefinido; tentativa de ampliar escopo ou inferir tenant |
| `GATE-B` — inventário read-only | Produzir baseline íntegra sem writes | `GATE-A` aprovado; acesso read-only autorizado separadamente; procedimento de coleta revisado | Contagens fecham por entidade; órfãos/cardinalidades/mutabilidade conhecidos; hashes e snapshot identificados | Manifesto da execução, contagens, hashes, relatório de órfãos e janela temporal | Qualquer write; ambiente não comprovado; contagem irreconciliável; exposição de PII |
| `GATE-C` — dry-run determinístico | Classificar sem aplicar dados | `GATE-B` aprovado; classificador/reason codes revisados; snapshots congelados | Duas execuções idênticas produzem igualdade profunda; todo registro é `RESOLVED`, `UNRESOLVED` ou `CONFLICT`; zero uso de fonte proibida | Manifestos por registro, hashes comparativos, relatório agregado e versão do classificador | Não determinismo; classificação ausente; fonte proibida; `RESOLVED` sem evidência suficiente |
| `GATE-D` — revisão da proposta de migration | Aprovar desenho físico e reversão, sem executar | `GATE-C` aprovado; percentuais e conflitos conhecidos; decisão explícita sobre journal/quarentena | Plano físico aditivo e reverso revisado; locks, batches, FK, índices, nullable e ausência de default aprovados; nenhuma execução autorizada implicitamente | Design review, análise de lock, plano de batch, rollback ensaiável e aprovação específica pendente/registrada | SQL/migration não revisada; rollback incompleto; default de tenant; risco de lock sem limite; tentativa de incluir RLS/runtime |
| `GATE-E` — ensaio isolado | Validar migration e backfill somente em ambiente isolado autorizado | `GATE-D` aprovado e execução isolada autorizada separadamente; clone identificado; backup/restore comprovados | Migration aditiva, batch piloto, interrupção, retomada, journal e rollback reconciliados; zero `UNRESOLVED/CONFLICT` aplicado | Relatórios antes/depois, journal, tempos/locks, teste de rollback e reconciliação integral | Write fora do manifesto; overwrite; fingerprint divergente; conflito aplicado; rollback não reproduzível |
| `GATE-F` — aplicação controlada | Aplicar somente `RESOLVED` em alvo explicitamente autorizado | `GATE-E` aprovado; autorização do alvo/janela; manifesto atual; critérios de abort ativos | 100% das writes correspondem ao manifesto/journal; zero overwrite; zero conflito; integridade relacional sem cross-tenant; quarentena preservada | Relatório por batch/run, fingerprints, journal, reconciliação e registro de incidentes/rollback | Qualquer NO-GO; mudança desde snapshot; contagens divergentes; relação cross-tenant; journal incompleto |
| `GATE-G` — fechamento da migration | Encerrar a migration sem autorizar runtime | `GATE-F` aprovado; reconciliação final concluída; quarentena inventariada | Resultado e rollback aprovados; constraints somente nas entidades elegíveis; pendências documentadas; RLS, loaders, runtime, UI, shadow e Match→Negociação permanecem `BLOCKED / REQUIRES APPROVAL` | Relatório final por entidade, inventário de quarentena, auditoria, decisão sobre constraints e termo de encerramento | Cobertura inferior ao critério da entidade; quarentena vazando para escopo operacional; tentativa de usar o fechamento como autorização runtime |

Percentuais inferiores a 100% não podem ser arredondados para aprovação nos gates de segurança.

### 12. NO-GO — critérios de parada imediata

Interromper o dry-run ou execução futura quando ocorrer qualquer um:

- tenant atribuído a partir de fonte proibida;
- diferença não explicada entre execuções determinísticas;
- mais de um Tenant candidato aplicado a uma linha;
- tentativa de atualizar `UNRESOLVED` ou `CONFLICT`;
- fingerprint divergente;
- sobrescrita de `tenant_id` já preenchido;
- relação cross-tenant detectada;
- contagem de writes diferente do manifesto;
- journal incompleto;
- erro de FK/constraint/lock acima do limite aprovado;
- aumento inesperado de erros, latência ou indisponibilidade;
- impossibilidade de provar a identidade do ambiente ou do run.

### 13. Estratégia de quarentena

Quarentena é estado operacional, não tenant artificial.

- `tenant_id` permanece `null`.
- Registro não aparece em loaders, ranking, shadow execution real ou UI tenant-scoped.
- Nenhum usuário “administrador” recebe acesso por fallback.
- Revisão usa manifesto restrito, IDs e evidências; decisões ficam auditadas.
- Correção exige nova classificação `RESOLVED`, novo dry-run e fingerprint atual.
- `CONFLICT` tem prioridade sobre `UNRESOLVED` e nunca é corrigido automaticamente.
- Métricas expõem quantidade/idade por entidade e reason code, sem PII.

Opções físicas de quarentena — coluna de status, tabela auxiliar ou registro no journal — ainda exigem decisão no desenho da migration. A opção não pode mover ou apagar dados sem plano específico.

### 14. Journal e idempotência

Cada aplicação futura precisa registrar:

- run ID e versão do classificador;
- entidade e record ID;
- valor anterior e valor aplicado;
- fingerprint esperado;
- evidências e reason codes;
- ator/aprovação;
- timestamps;
- resultado e eventual rollback run ID.

Reexecutar o mesmo run:

- não altera linha já aplicada corretamente;
- não sobrescreve valor diferente;
- não cria auditoria duplicada como se fosse nova decisão;
- reporta divergências para revisão.

O journal deve permitir selecionar exatamente as writes feitas por um run, sem depender de timestamps aproximados.

### 15. Plano de rollback

### Nível 0 — Dry-run

Não há rollback de dados porque não existem writes. Descartar artefatos inválidos, preservar relatório do incidente e corrigir versão/configuração.

### Nível 1 — Ativação lógica

- manter consumidores Match Core desligados;
- em falha, voltar a funcionalidade para indisponível/fail-closed;
- nunca voltar para query sem tenant ou fallback global.

### Nível 2 — Backfill de dados

Reverter apenas valores aplicados pelo run identificado quando:

- o valor anterior registrado era `null`;
- o valor atual ainda é exatamente o valor aplicado pelo run;
- nenhuma dependência posterior autorizada tornou a reversão insegura.

Se a linha mudou depois do run, não sobrescrever: classificar como conflito de rollback e exigir revisão. Rollback também é journaled e idempotente.

### Nível 3 — Constraints

- remover/desabilitar apenas a constraint introduzida pela versão problemática;
- preservar dados e `tenant_id` já validados;
- retornar a nullable + bloqueio lógico, nunca a acesso permissivo;
- executar apenas por migration reversa previamente ensaiada.

### Nível 4 — Dependências futuras de acesso

RLS e runtime não são alterados por este plano. Se uma iniciativa futura afetar essas camadas, ela deverá permanecer desabilitada até possuir aprovação e rollback próprios; indisponibilidade nunca pode ser revertida por acesso permissivo.

### Nível 5 — Estruturas aditivas

Não remover `tenants`, memberships ou colunas enquanto existirem referências, auditoria ou writes dependentes. A preferência é rollback lógico. Remoção física é uma migration destrutiva separada, fora deste plano e sujeita a nova autorização.

### 16. Validação necessária

### Unitária

- classificação positiva, unresolved e conflict;
- fontes proibidas nunca resolvem;
- propagação somente com anchors concordantes;
- reason codes estáveis/deduplicados;
- determinismo, idempotência e ausência de mutação;
- conflitos metamórficos: adicionar evidência divergente nunca mantém `RESOLVED`;
- remover evidência obrigatória nunca melhora classificação.

### Integração em ambiente isolado

- migration aditiva em base vazia e clone representativo;
- compatibilidade temporária com writes antigos, sempre bloqueados do fluxo tenant-scoped;
- batches interrompidos e retomados;
- concorrência: registro alterado após snapshot não é atualizado;
- journal e rollback de run;
- FKs, índices e limites de lock;
- relações cross-tenant rejeitadas.

### Segurança dos dados migrados

- registro com `tenant_id = null` permanece em quarentena;
- Buyer/Source/Vehicle divergentes nunca recebem classificação aplicável;
- relação cross-tenant é detectada na reconciliação;
- membership não é criada sem Tenant/User explícitos e manifesto aprovado;
- nenhum teste desta migration é apresentado como validação de autorização runtime ou RLS.

### Reconciliação

- soma `RESOLVED + UNRESOLVED + CONFLICT = total em escopo` por entidade;
- total aplicado igual a `RESOLVED` elegível e não modificado;
- zero overwrite;
- zero `UNRESOLVED/CONFLICT` aplicado;
- zero relação cross-tenant;
- hashes dos IDs e fingerprints reconciliados.

### 17. Observabilidade mínima futura

- contagem por classificação, entidade e reason code;
- idade da quarentena;
- batches iniciados, concluídos, interrompidos e revertidos;
- divergências de fingerprint;
- tentativas de acesso a tenant ausente/cross-tenant;
- falhas de membership e permission, sem PII;
- latência/locks da migration;
- versão do classificador e da policy em cada evento.

Alertas críticos:

- qualquer write fora do manifesto;
- qualquer cross-tenant detectado;
- qualquer `CONFLICT` aplicado;
- journal incompleto;
- diferença entre contagem aplicada e reconciliada;
- qualquer tentativa de incluir RLS, loader, runtime ou acesso cross-tenant sem plano e aprovação separados.

### 18. Aprovações separadas ainda necessárias

Este plano não autoriza as seguintes decisões/ações:

1. schema físico final de `tenants`, memberships, journal e quarentena;
2. catálogo definitivo de reason codes;
3. origem explícita dos primeiros tenants e memberships;
4. manifestos de atribuição por registro;
5. estratégia física de FK/index/constraint e limites de lock;
6. migration SQL e migration reversa;
7. acesso a qualquer banco/ambiente;
8. execução do dry-run;
9. aplicação do backfill;
10. `NOT NULL`, RLS, loaders ou runtime;
11. shadow execution, UI ou rollout.

Cada etapa exige aprovação explícita depois que seu artefato revisável estiver disponível.

### 19. Checklist de prontidão para desenhar a migration

- [ ] Plano documental aprovado.
- [ ] Owners técnicos, segurança e dados nomeados.
- [ ] Ambientes e tabelas em escopo confirmados.
- [ ] Reason codes aprovados.
- [ ] Modelo físico de journal/quarentena aprovado.
- [ ] Fonte dos Tenants iniciais documentada.
- [ ] Fonte das memberships iniciais documentada.
- [ ] Manifesto de evidências permitidas aprovado.
- [ ] Inventário read-only autorizado e concluído.
- [ ] Dry-run determinístico revisado.
- [ ] Percentuais unresolved/conflict aceitos explicitamente.
- [ ] Plano de locks/batches definido.
- [ ] Migration reversa ensaiada em ambiente isolado.
- [ ] RLS, loaders e runtime registrados como dependências futuras `BLOCKED / REQUIRES APPROVAL`.
- [ ] Critérios de abort e responsáveis de incidente confirmados.

Enquanto qualquer gate aplicável permanecer aberto, o sistema deve continuar sem integração tenant-scoped do Match Core V1.
