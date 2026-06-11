-- Private claims / personal IOU notes (docs/product/private-claims-v0.1.md).
--
-- Claims are ledger notes between a creator and one counterparty. They never
-- initiate payments, never store payment details, and never change group
-- balances. Free-text and invited counterparties stay visible to the creator
-- only; linked app users see exactly the claims they are part of.

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  creator_user_id uuid not null references public.profiles(id) on delete cascade,
  direction text not null check (direction in ('owed_to_me', 'owed_by_me')),
  counterparty_type text not null check (
    counterparty_type in ('app_user', 'invited_person', 'free_text_person')
  ),
  counterparty_user_id uuid references public.profiles(id) on delete set null,
  counterparty_name text not null check (char_length(trim(counterparty_name)) > 0),
  amount_minor integer not null check (amount_minor > 0),
  currency_code text not null check (char_length(currency_code) = 3),
  purpose text,
  claim_date date not null,
  due_date date,
  group_id uuid references public.groups(id) on delete set null,
  context_id uuid references public.group_contexts(id) on delete set null,
  status text not null default 'private_open' check (
    status in (
      'draft', 'private_open', 'linked_open', 'debtor_acknowledged', 'disputed',
      'partially_paid', 'marked_paid', 'creditor_confirmed', 'settled', 'archived'
    )
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint claims_app_user_requires_link check (
    counterparty_type <> 'app_user' or counterparty_user_id is not null
  ),
  constraint claims_unlinked_has_no_user check (
    counterparty_type = 'app_user' or counterparty_user_id is null
  ),
  constraint claims_no_self_claim check (counterparty_user_id <> creator_user_id)
);

create trigger claims_set_updated_at
  before update on public.claims
  for each row
  execute function public.set_updated_at();

create index claims_creator_status_idx on public.claims (creator_user_id, status);
create index claims_counterparty_user_idx on public.claims (counterparty_user_id);
create index claims_group_id_idx on public.claims (group_id);

create table public.claim_payments (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims(id) on delete cascade,
  amount_minor integer not null check (amount_minor > 0),
  currency_code text not null check (char_length(currency_code) = 3),
  payment_date date not null,
  note text,
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  confirmation_status text not null default 'recorded' check (
    confirmation_status in ('recorded', 'pending_confirmation', 'confirmed', 'rejected')
  ),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  rejected_at timestamptz
);

create index claim_payments_claim_id_idx on public.claim_payments (claim_id);

create table public.claim_events (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (char_length(trim(event_type)) > 0),
  created_at timestamptz not null default now()
);

create index claim_events_claim_created_idx on public.claim_events (claim_id, created_at desc);

create table public.claim_reminders (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  remind_at timestamptz not null,
  note text,
  created_at timestamptz not null default now(),
  disabled_at timestamptz
);

create index claim_reminders_user_idx on public.claim_reminders (user_id, remind_at);
create index claim_reminders_claim_idx on public.claim_reminders (claim_id);

alter table public.claims enable row level security;
alter table public.claim_payments enable row level security;
alter table public.claim_events enable row level security;
alter table public.claim_reminders enable row level security;

-- Helper functions (security definer: policy subqueries must not re-enter RLS).

create function public.is_claim_participant(target_claim_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.claims c
    where c.id = target_claim_id
      and (
        c.creator_user_id = auth.uid()
        or (c.counterparty_type = 'app_user' and c.counterparty_user_id = auth.uid())
      )
  );
$$;

create function public.is_claim_creator(target_claim_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.claims c
    where c.id = target_claim_id
      and c.creator_user_id = auth.uid()
  );
$$;

comment on function public.is_claim_participant(uuid) is
  'Returns true when auth.uid() is the creator or the linked app-user counterparty of the claim.';

comment on function public.is_claim_creator(uuid) is
  'Returns true when auth.uid() created the claim.';

-- The linked counterparty may only react to a claim (acknowledge, dispute,
-- clarify, mark paid); every other column stays the creator''s.

create function public.enforce_claim_counterparty_update()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and auth.uid() <> old.creator_user_id then
    if new.creator_user_id <> old.creator_user_id
      or new.direction <> old.direction
      or new.counterparty_type <> old.counterparty_type
      or new.counterparty_user_id is distinct from old.counterparty_user_id
      or new.counterparty_name <> old.counterparty_name
      or new.amount_minor <> old.amount_minor
      or new.currency_code <> old.currency_code
      or new.purpose is distinct from old.purpose
      or new.claim_date <> old.claim_date
      or new.due_date is distinct from old.due_date
      or new.group_id is distinct from old.group_id
      or new.context_id is distinct from old.context_id
      or new.created_at <> old.created_at
      or new.archived_at is distinct from old.archived_at then
      raise exception 'claims: counterparty may only change the status';
    end if;
    if new.status not in ('debtor_acknowledged', 'disputed', 'linked_open', 'marked_paid') then
      raise exception 'claims: counterparty may only acknowledge, dispute, clarify, or mark paid';
    end if;
  end if;
  return new;
end;
$$;

create trigger claims_enforce_counterparty_update
  before update on public.claims
  for each row
  execute function public.enforce_claim_counterparty_update();

-- Claim payment rows are immutable except for their confirmation state.

create function public.enforce_claim_payment_update()
returns trigger
language plpgsql
as $$
begin
  if new.claim_id <> old.claim_id
    or new.amount_minor <> old.amount_minor
    or new.currency_code <> old.currency_code
    or new.payment_date <> old.payment_date
    or new.recorded_by <> old.recorded_by
    or new.created_at <> old.created_at then
    raise exception 'claim_payments: only the confirmation state may change';
  end if;
  if new.confirmation_status = 'confirmed' then
    new.confirmed_at := coalesce(new.confirmed_at, now());
  elsif new.confirmation_status = 'rejected' then
    new.rejected_at := coalesce(new.rejected_at, now());
  end if;
  return new;
end;
$$;

create trigger claim_payments_enforce_update
  before update on public.claim_payments
  for each row
  execute function public.enforce_claim_payment_update();

-- Policies.

create policy claims_select_for_participants
  on public.claims
  for select
  to authenticated
  using (
    creator_user_id = auth.uid()
    or (counterparty_type = 'app_user' and counterparty_user_id = auth.uid())
  );

create policy claims_insert_own
  on public.claims
  for insert
  to authenticated
  with check (creator_user_id = auth.uid());

create policy claims_update_for_participants
  on public.claims
  for update
  to authenticated
  using (
    creator_user_id = auth.uid()
    or (counterparty_type = 'app_user' and counterparty_user_id = auth.uid())
  )
  with check (
    creator_user_id = auth.uid()
    or (counterparty_type = 'app_user' and counterparty_user_id = auth.uid())
  );

create policy claim_payments_select_for_participants
  on public.claim_payments
  for select
  to authenticated
  using (public.is_claim_participant(claim_id));

create policy claim_payments_insert_for_participants
  on public.claim_payments
  for insert
  to authenticated
  with check (
    public.is_claim_participant(claim_id)
    and recorded_by = auth.uid()
  );

create policy claim_payments_update_for_participants
  on public.claim_payments
  for update
  to authenticated
  using (public.is_claim_participant(claim_id))
  with check (public.is_claim_participant(claim_id));

create policy claim_events_select_for_participants
  on public.claim_events
  for select
  to authenticated
  using (public.is_claim_participant(claim_id));

create policy claim_events_insert_for_participants
  on public.claim_events
  for insert
  to authenticated
  with check (
    public.is_claim_participant(claim_id)
    and actor_user_id = auth.uid()
  );

create policy claim_reminders_select_own
  on public.claim_reminders
  for select
  to authenticated
  using (user_id = auth.uid());

create policy claim_reminders_insert_own
  on public.claim_reminders
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_claim_participant(claim_id)
  );

create policy claim_reminders_update_own
  on public.claim_reminders
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

comment on table public.claims is
  'Private ledger notes between a creator and one counterparty. No payment execution, no payment details, no effect on group balances.';

comment on table public.claim_payments is
  'Partial payments recorded against a claim. Confirmation is a ledger state, never a provider verification.';

comment on table public.claim_events is
  'History of claim lifecycle events.';

comment on table public.claim_reminders is
  'Self-set per-user reminder metadata. Reminders are personal and never sent on behalf of the other side.';
