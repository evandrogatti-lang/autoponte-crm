-- AutoPonte CRM · Access Control V1
-- Passwords belong exclusively to Supabase Auth, never to this application database.
create table if not exists public.crm_roles (id text primary key, code text not null unique, name text not null, description text not null default '', is_system boolean not null default false, created_at timestamptz not null default now());
create table if not exists public.crm_users (id text primary key, auth_user_id text not null default '', name text not null, email text not null unique, phone text not null default '', role_id text not null references public.crm_roles(id), store_id text not null default '', status text not null default 'invited' check (status in ('invited','active','suspended','inactive')), last_access_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.crm_role_permissions (id text primary key, role_id text not null references public.crm_roles(id) on delete cascade, permission text not null, unique(role_id, permission));
create table if not exists public.crm_audit_logs (id text primary key, actor_user_id text not null default '', actor_email text not null default '', action text not null, entity_type text not null, entity_id text not null default '', detail text not null default '{}', created_at timestamptz not null default now());
create index if not exists crm_users_status_idx on public.crm_users(status);
create index if not exists crm_users_role_idx on public.crm_users(role_id);
create index if not exists crm_audit_logs_created_idx on public.crm_audit_logs(created_at desc);
insert into public.crm_roles (id, code, name, description, is_system) values
  ('role_admin','admin','Administrador','Acesso integral, incluindo usuários e segurança.',true),
  ('role_manager','manager','Gestor','Gestão comercial, aprovações e relatórios.',true),
  ('role_sales','sales','Comercial','Clientes, leads, oportunidades e propostas da sua loja.',true),
  ('role_inventory','inventory','Estoque e avaliação','Estoque, trocas, avaliações e fotos.',true),
  ('role_finance','finance','Financeiro','Custos, margens, comissões e aprovações financeiras.',true),
  ('role_partner','partner','Parceiro','Acesso limitado ao próprio estoque e oportunidades autorizadas.',true)
on conflict (id) do nothing;
insert into public.crm_role_permissions (id, role_id, permission) values
  ('perm_admin_all','role_admin','*'),('perm_manager_dashboard','role_manager','dashboard.view'),('perm_manager_opportunities','role_manager','opportunities.manage'),('perm_manager_reports','role_manager','reports.view'),('perm_sales_clients','role_sales','clients.manage'),('perm_sales_opportunities','role_sales','opportunities.manage_own_store'),('perm_inventory_vehicles','role_inventory','vehicles.manage'),('perm_inventory_trades','role_inventory','trade_ins.manage'),('perm_finance_financial','role_finance','financial.manage'),('perm_partner_inventory','role_partner','partner_inventory.manage_own')
on conflict (role_id, permission) do nothing;
alter table public.crm_roles enable row level security;
alter table public.crm_users enable row level security;
alter table public.crm_role_permissions enable row level security;
alter table public.crm_audit_logs enable row level security;
