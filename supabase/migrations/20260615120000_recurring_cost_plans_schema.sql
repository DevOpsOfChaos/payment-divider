-- Recurring cost plans schema and RLS (issue #160).
--
-- Models the two tables the core planning logic needs for persistence:
-- cost_plans (the rule) and cost_plan_participants (history-as-records
-- participation). Periods remain deterministically calculated by the
-- core module; period materialization and settlements are follow-up
-- work. No payment execution, banking integration, or dunning/collection
-- is introduced here.

create table public.cost_plans (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  context_id uuid references public.group_contexts(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  name text not null check (char_length(trim(name)) > 0),
  -- Amount in minor currency units (e.g. cents). Participants settle their
  -- share against this amount; changing it affects future periods only.
  amount_minor integer not null check (amount_minor > 0),
  currency_code text not null check (char_length(currency_code) = 3),
  interval_kind text not null check (interval_kind in ('monthly', 'yearly', 'custom_days')),
  -- Required and positive only for interval_kind = 'custom_days'.
  interval_days integer check (interval_days is null or interval_days > 0),
  -- First period start; all period boundaries derive deterministically from
  -- anchor_date + period_index without drift.
  anchor_date date not null,
  -- True when the owner pays the full period up front (e.g. yearly insurance)
  -- and participants settle their share against a single long period.
  prepaid boolean not null default false,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint cost_plans_context_belongs_to_group
    foreign key (context_id, group_id) references public.group_contexts(id, group_id) on delete set null,
  constraint cost_plans_custom_days_requires_interval_days
    check (interval_kind <> 'custom_days' or interval_days is not null),
  constraint cost_plans_archived_at_set_when_archived
    check (status <> 'archived' or archived_at is not null)
);

create trigger cost_plans_set_updated_at
  before update on public.cost_plans
  for each row
  execute function public.set_updated_at();

create index cost_plans_group_id_idx on public.cost_plans (group_id);
create index cost_plans_created_by_idx on public.cost_plans (created_by);
create index cost_plans_context_id_idx on public.cost_plans (context_id) where context_id is not null;

-- Participation is modelled as history records: leaving closes the record via
-- left_at_period_index; re-joining or changing a share starts a new record.
-- The plan owner is implicit and not listed here.
create table public.cost_plan_participants (
  id uuid primary key default gen_random_uuid(),
  cost_plan_id uuid not null references public.cost_plans(id) on delete cascade,
  counterparty_id uuid not null references public.counterparties(id) on delete restrict,
  share_type text not null check (share_type in ('equal', 'fixed')),
  -- Only set when share_type = 'fixed'; must be a non-negative integer minor unit.
  share_value_minor integer check (share_value_minor is null or share_value_minor >= 0),
  joined_at_period_index integer not null check (joined_at_period_index >= 0),
  -- Exclusive upper bound; null means the participant is still active.
  left_at_period_index integer,
  created_at timestamptz not null default now(),
  constraint cost_plan_participants_fixed_requires_value
    check (share_type <> 'fixed' or share_value_minor is not null),
  constraint cost_plan_participants_period_range
    check (left_at_period_index is null or left_at_period_index > joined_at_period_index)
);

create index cost_plan_participants_plan_idx on public.cost_plan_participants (cost_plan_id);
create index cost_plan_participants_counterparty_idx on public.cost_plan_participants (counterparty_id);

alter table public.cost_plans enable row level security;
alter table public.cost_plan_participants enable row level security;

-- Helper: true when auth.uid() is an active member of the group that owns
-- the target plan. Security definer avoids recursive RLS evaluation on
-- cost_plans and group_members.
create function public.is_cost_plan_group_member(target_plan_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.cost_plans cp
    join public.group_members gm on gm.group_id = cp.group_id
    where cp.id = target_plan_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  );
$$;

comment on function public.is_cost_plan_group_member(uuid) is
  'Returns true when auth.uid() is an active member of the group that owns the target cost plan.';

-- cost_plans: group members can read plans for their groups.
create policy cost_plans_select_for_group_members
  on public.cost_plans
  for select
  to authenticated
  using (public.is_group_member(group_id));

-- cost_plans: active group members may create plans they author.
create policy cost_plans_insert_for_group_members
  on public.cost_plans
  for insert
  to authenticated
  with check (
    public.is_group_member(group_id)
    and created_by = auth.uid()
  );

-- cost_plans: the plan creator may update (pause, archive, rename, etc.).
-- group_id and created_by must not change; the trigger pins updated_at.
create policy cost_plans_update_by_creator
  on public.cost_plans
  for update
  to authenticated
  using (created_by = auth.uid() and public.is_group_member(group_id))
  with check (created_by = auth.uid() and public.is_group_member(group_id));

-- cost_plan_participants: readable by active members of the owning group.
create policy cost_plan_participants_select_for_group_members
  on public.cost_plan_participants
  for select
  to authenticated
  using (public.is_cost_plan_group_member(cost_plan_id));

-- cost_plan_participants: active group members may add participants to plans
-- in their group. The counterparty must be owned by the inserting user so
-- they cannot add participants they do not know.
create policy cost_plan_participants_insert_for_group_members
  on public.cost_plan_participants
  for insert
  to authenticated
  with check (
    public.is_cost_plan_group_member(cost_plan_id)
    and public.is_counterparty_owner(counterparty_id)
  );

-- cost_plan_participants: only the counterparty owner may close participation
-- (set left_at_period_index). No other column changes allowed.
create policy cost_plan_participants_update_by_counterparty_owner
  on public.cost_plan_participants
  for update
  to authenticated
  using (public.is_counterparty_owner(counterparty_id))
  with check (public.is_counterparty_owner(counterparty_id));

grant select, insert, update on
  public.cost_plans,
  public.cost_plan_participants
to authenticated;

-- Supabase local-stack defaults may grant DELETE to all roles on public schema
-- tables. Revoke explicitly so no DELETE operation is possible without an
-- explicit RLS policy, matching the intent of the grant migration.
revoke delete on
  public.cost_plans,
  public.cost_plan_participants
from authenticated, anon;

comment on table public.cost_plans is
  'Recurring cost plan rules (shared subscriptions). Periods are calculated deterministically by the core module. Ledger-only: no payment execution or banking integration.';

comment on table public.cost_plan_participants is
  'Participation history for cost plans. History-as-records: leaving sets left_at_period_index; re-joining starts a new record. The plan owner is implicit.';
