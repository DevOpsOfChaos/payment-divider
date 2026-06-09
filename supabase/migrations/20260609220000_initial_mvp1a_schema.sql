create extension if not exists "pgcrypto";

create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) > 0),
  username text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint profiles_username_not_blank check (
    username is null or char_length(trim(username)) > 0
  )
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

create table public.friend_connections (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references public.profiles(id) on delete cascade,
  addressee_user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (
    status in ('pending', 'accepted', 'blocked', 'rejected')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz,
  constraint friend_connections_no_self_friend check (requester_user_id <> addressee_user_id)
);

create trigger friend_connections_set_updated_at
  before update on public.friend_connections
  for each row
  execute function public.set_updated_at();

create unique index friend_connections_unique_pair_idx
  on public.friend_connections (
    least(requester_user_id, addressee_user_id),
    greatest(requester_user_id, addressee_user_id)
  );

create index friend_connections_requester_status_idx
  on public.friend_connections (requester_user_id, status);

create index friend_connections_addressee_status_idx
  on public.friend_connections (addressee_user_id, status);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  type text not null check (
    type in ('friends', 'shared_flat', 'trip', 'couple', 'family', 'other')
  ),
  default_currency_code text not null check (char_length(default_currency_code) = 3),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create index groups_created_by_idx
  on public.groups (created_by);

create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  constraint group_members_left_after_joined check (left_at is null or left_at >= joined_at)
);

create index group_members_group_id_idx
  on public.group_members (group_id);

create index group_members_user_id_idx
  on public.group_members (user_id);

create unique index group_members_active_membership_idx
  on public.group_members (group_id, user_id)
  where left_at is null;

create table public.group_contexts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  type text not null check (
    type in ('general', 'trip', 'event', 'recurring', 'other')
  ),
  start_date date,
  end_date date,
  default_currency_code text check (
    default_currency_code is null or char_length(default_currency_code) = 3
  ),
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint group_contexts_date_range check (end_date is null or start_date is null or end_date >= start_date)
);

create index group_contexts_group_id_idx
  on public.group_contexts (group_id);

create unique index group_contexts_id_group_id_idx
  on public.group_contexts (id, group_id);

create table public.context_members (
  id uuid primary key default gen_random_uuid(),
  context_id uuid not null references public.group_contexts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  default_included boolean not null default true,
  joined_at timestamptz not null default now(),
  unique (context_id, user_id)
);

create index context_members_context_id_idx
  on public.context_members (context_id);

create index context_members_user_id_idx
  on public.context_members (user_id);

create table public.member_availability (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  context_id uuid references public.group_contexts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  unavailable_from date not null,
  unavailable_until date,
  mode text not null check (mode in ('unavailable', 'paused')),
  note text,
  affects_default_selection boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  foreign key (context_id, group_id) references public.group_contexts(id, group_id) on delete cascade,
  constraint member_availability_date_range check (
    unavailable_until is null or unavailable_until >= unavailable_from
  )
);

create index member_availability_group_user_idx
  on public.member_availability (group_id, user_id);

create index member_availability_context_user_idx
  on public.member_availability (context_id, user_id);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  context_id uuid not null references public.group_contexts(id) on delete restrict,
  amount_minor integer not null check (amount_minor > 0),
  currency_code text not null check (char_length(currency_code) = 3),
  paid_by_user_id uuid not null references public.profiles(id) on delete restrict,
  expense_date date not null,
  title text,
  note text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  foreign key (context_id, group_id) references public.group_contexts(id, group_id) on delete restrict
);

create unique index expenses_id_currency_code_idx
  on public.expenses (id, currency_code);

create trigger expenses_set_updated_at
  before update on public.expenses
  for each row
  execute function public.set_updated_at();

create index expenses_group_date_idx
  on public.expenses (group_id, expense_date);

create index expenses_context_date_idx
  on public.expenses (context_id, expense_date);

create index expenses_paid_by_user_id_idx
  on public.expenses (paid_by_user_id);

create table public.expense_shares (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  amount_minor integer not null check (amount_minor >= 0),
  currency_code text not null check (char_length(currency_code) = 3),
  share_type text not null check (share_type in ('equal', 'exact')),
  foreign key (expense_id, currency_code) references public.expenses(id, currency_code) on delete cascade,
  unique (expense_id, user_id)
);

create index expense_shares_expense_id_idx
  on public.expense_shares (expense_id);

create index expense_shares_user_id_idx
  on public.expense_shares (user_id);

create table public.payment_actions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  context_id uuid references public.group_contexts(id) on delete restrict,
  payer_id uuid not null references public.profiles(id) on delete restrict,
  payee_id uuid not null references public.profiles(id) on delete restrict,
  amount_minor integer not null check (amount_minor > 0),
  currency_code text not null check (char_length(currency_code) = 3),
  status text not null default 'suggested' check (
    status in ('suggested', 'marked_paid', 'confirmed', 'rejected')
  ),
  created_at timestamptz not null default now(),
  marked_paid_at timestamptz,
  confirmed_by_payee_at timestamptz,
  rejected_at timestamptz,
  foreign key (context_id, group_id) references public.group_contexts(id, group_id) on delete restrict,
  constraint payment_actions_distinct_parties check (payer_id <> payee_id)
);

create index payment_actions_group_status_idx
  on public.payment_actions (group_id, status);

create index payment_actions_payer_status_idx
  on public.payment_actions (payer_id, status);

create index payment_actions_payee_status_idx
  on public.payment_actions (payee_id, status);

create table public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  context_id uuid references public.group_contexts(id) on delete set null,
  actor_user_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (char_length(trim(event_type)) > 0),
  entity_type text not null check (char_length(trim(entity_type)) > 0),
  entity_id uuid,
  created_at timestamptz not null default now()
);

create index timeline_events_group_created_at_idx
  on public.timeline_events (group_id, created_at desc);

create index timeline_events_context_created_at_idx
  on public.timeline_events (context_id, created_at desc);

create table public.inbox_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  context_id uuid references public.group_contexts(id) on delete cascade,
  type text not null check (char_length(trim(type)) > 0),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  related_entity_type text,
  related_entity_id uuid,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index inbox_items_user_status_created_at_idx
  on public.inbox_items (user_id, status, created_at desc);

create index inbox_items_group_id_idx
  on public.inbox_items (group_id);

alter table public.profiles enable row level security;
alter table public.friend_connections enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_contexts enable row level security;
alter table public.context_members enable row level security;
alter table public.member_availability enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_shares enable row level security;
alter table public.payment_actions enable row level security;
alter table public.timeline_events enable row level security;
alter table public.inbox_items enable row level security;

comment on table public.payment_actions is
  'Ledger-only external settlement status. This table does not initiate payments, connect providers, hold funds, or verify external settlement automatically.';

comment on table public.profiles is
  'Supabase Auth-compatible application profile. RLS enabled, policies intentionally deferred.';

comment on table public.friend_connections is
  'MVP 1A friend graph by profile. RLS enabled, policies intentionally deferred.';

comment on table public.groups is
  'Durable social ledger group. RLS enabled, policies intentionally deferred.';

comment on table public.group_members is
  'Membership and simple role model for groups. RLS enabled, policies intentionally deferred.';

comment on table public.group_contexts is
  'Activity contexts inside a group. RLS enabled, policies intentionally deferred.';

comment on table public.context_members is
  'Default activity participant membership. RLS enabled, policies intentionally deferred.';

comment on table public.member_availability is
  'Participant availability ranges that affect default expense selection only. RLS enabled, policies intentionally deferred.';

comment on table public.expenses is
  'Ledger expenses recorded in integer minor currency units. RLS enabled, policies intentionally deferred.';

comment on table public.expense_shares is
  'Per-user expense shares in integer minor currency units. RLS enabled, policies intentionally deferred.';

comment on table public.timeline_events is
  'Group and activity history events. RLS enabled, policies intentionally deferred.';

comment on table public.inbox_items is
  'Action-oriented user inbox items. RLS enabled, policies intentionally deferred.';
