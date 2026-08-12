# Controle de acesso V1 — AutoPonte CRM

## Objetivo

Substituir a página meramente informativa de Configurações por uma base real para administração de acessos, sem armazenar senhas no CRM.

## O que foi implementado

- Tabelas `crm_roles`, `crm_users`, `crm_role_permissions` e `crm_audit_logs`.
- Perfis de sistema: Administrador, Gestor, Comercial, Estoque e avaliação, Financeiro e Parceiro.
- API administrativa para listar usuários, criar convite e ativar/suspender acesso.
- Registro de auditoria para convite e alteração de status.
- Primeiro operador autenticado como bootstrap administrativo; os seguintes devem possuir perfil Administrador ativo.
- Tela `/configuracoes` com lista, convite e suspensão/reativação.

## Segurança

- Senhas não são gravadas no banco da aplicação.
- O vínculo entre `crm_users.auth_user_id` e a conta deve ser feito pelo Supabase Auth na etapa seguinte.
- A migração habilita RLS nas tabelas de acesso. Políticas de leitura/escrita devem ser adicionadas junto à ativação do Supabase Auth; enquanto isso, apenas operações servidoras com credencial de serviço devem acessar essas tabelas.

## Ativação

1. Execute `supabase/007_access_control.sql` no SQL Editor do projeto Supabase.
2. Faça deploy do código.
3. Abra `/configuracoes` com o administrador inicial e convide a equipe.
4. Próxima etapa: conectar login, recuperação de senha e sessão do Supabase Auth; então aplicar as permissões a cada módulo.

## Validação realizada

`npm run build` concluído com sucesso em 12 de agosto de 2026.
