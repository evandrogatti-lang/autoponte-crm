alter table public.commercial_cases
  add column if not exists no_next_action_reason text;

create table if not exists public.case_tasks (
  id text primary key,
  case_id text not null references public.commercial_cases(id) on delete cascade,
  action_type text not null check (action_type in ('CONTACT_CUSTOMER','REQUEST_DOCUMENTS','REVIEW_PROPOSAL','SCHEDULE_FOLLOW_UP','MARK_CASE_LOST')),
  owner_id text not null references public.crm_users(id),
  due_at timestamptz not null,
  priority text not null default 'NORMAL' check (priority in ('LOW','NORMAL','HIGH','URGENT')),
  status text not null default 'OPEN' check (status in ('OPEN','DONE','CANCELLED')),
  context text not null default '',
  result text not null default '',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists case_tasks_case_status_next_idx on public.case_tasks(case_id,status,priority,due_at);
create index if not exists case_tasks_owner_status_due_idx on public.case_tasks(owner_id,status,due_at);

update public.commercial_cases
set no_next_action_reason = 'Caso ativo anterior à implantação de Case Actions; próxima ação pendente de definição.'
where status in ('opened','active') and no_next_action_reason is null;
