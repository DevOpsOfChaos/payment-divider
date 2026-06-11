-- Central counterparty/person model (issue #88).
--
-- Claims (and later shared subscriptions) reference reusable counterparties
-- instead of raw per-claim free-text person data. External/free-text persons
-- stay private to their owner. Linking an external person to an app user
-- NEVER exposes existing claims: every claim carries an explicit
-- shared_with_counterparty flag the creator controls per claim.
-- Aliases prepare duplicate detection; merges are never automatic.

create table public.counterparties (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('app_user', 'invited_person', 'external_person')),
  display_name text not null check (char_length(trim(display_name)) > 0),
  normalized_name text not null check (char_length(trim(normalized_name)) > 0),
  linked_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz,
  constraint counterparties_app_user_requires_link check (
    kind <> 'app_user' or linked_user_id is not null
  ),
  constraint counterparties_unlinked_has_no_user check (
    kind = 'app_user' or linked_user_id is null
  ),
  constraint counterparties_no_self_link check (linked_user_id <> owner_user_id)
);

create trigger counterparties_set_updated_at
  before update on public.counterparties
  for each row
  execute function public.set_updated_at();

create index counterparties_owner_idx on public.counterparties (owner_user_id);
create index counterparties_owner_normalized_name_idx
  on public.counterparties (owner_user_id, normalized_name);
create index counterparties_linked_user_idx on public.counterparties (linked_user_id);

create table public.counterparty_aliases (
  id uuid primary key default gen_random_uuid(),
  counterparty_id uuid not null references public.counterparties(id) on delete cascade,
  alias text not null check (char_length(trim(alias)) > 0),
  normalized_alias text not null check (char_length(trim(normalized_alias)) > 0),
  created_at timestamptz not null default now(),
  unique (counterparty_id, normalized_alias)
);

create index counterparty_aliases_counterparty_idx
  on public.counterparty_aliases (counterparty_id);

alter table public.counterparties enable row level security;
alter table public.counterparty_aliases enable row level security;

create function public.is_counterparty_owner(target_counterparty_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.counterparties cp
    where cp.id = target_counterparty_id
      and cp.owner_user_id = auth.uid()
  );
$$;

comment on function public.is_counterparty_owner(uuid) is
  'Returns true when auth.uid() owns the counterparty record.';

-- Counterparty records are the owner''s private address-book entries; even a
-- linked app user does not see the record itself, only claims explicitly
-- shared with them.
create policy counterparties_select_own
  on public.counterparties
  for select
  to authenticated
  using (owner_user_id = auth.uid());

create policy counterparties_insert_own
  on public.counterparties
  for insert
  to authenticated
  with check (owner_user_id = auth.uid());

create policy counterparties_update_own
  on public.counterparties
  for update
  to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

create policy counterparty_aliases_select_own
  on public.counterparty_aliases
  for select
  to authenticated
  using (public.is_counterparty_owner(counterparty_id));

create policy counterparty_aliases_insert_own
  on public.counterparty_aliases
  for insert
  to authenticated
  with check (public.is_counterparty_owner(counterparty_id));

create policy counterparty_aliases_update_own
  on public.counterparty_aliases
  for update
  to authenticated
  using (public.is_counterparty_owner(counterparty_id))
  with check (public.is_counterparty_owner(counterparty_id));

grant select, insert, update on
  public.counterparties,
  public.counterparty_aliases
to authenticated;

-- ------------------------------------------------------------------------
-- Normalize claims onto counterparties.

alter table public.claims
  add column counterparty_id uuid references public.counterparties(id) on delete restrict,
  add column shared_with_counterparty boolean not null default false;

-- Backfill: one counterparty per existing claim (deduplication is a later,
-- user-confirmed step). Previously linked app_user claims were visible to the
-- counterparty, so they migrate as shared.
do $$
declare
  claim_row record;
  new_counterparty_id uuid;
begin
  for claim_row in select * from public.claims loop
    insert into public.counterparties (owner_user_id, kind, display_name, normalized_name, linked_user_id)
    values (
      claim_row.creator_user_id,
      case claim_row.counterparty_type
        when 'free_text_person' then 'external_person'
        else claim_row.counterparty_type
      end,
      claim_row.counterparty_name,
      regexp_replace(lower(trim(claim_row.counterparty_name)), '\s+', ' ', 'g'),
      claim_row.counterparty_user_id
    )
    returning id into new_counterparty_id;

    update public.claims
    set counterparty_id = new_counterparty_id,
        shared_with_counterparty = (claim_row.counterparty_type = 'app_user')
    where id = claim_row.id;
  end loop;
end;
$$;

alter table public.claims
  alter column counterparty_id set not null;

-- Old per-claim counterparty columns and their dependents.
drop policy claims_select_for_participants on public.claims;
drop policy claims_update_for_participants on public.claims;

alter table public.claims
  drop constraint claims_app_user_requires_link,
  drop constraint claims_unlinked_has_no_user,
  drop constraint claims_no_self_claim;

drop index public.claims_counterparty_user_idx;

alter table public.claims
  drop column counterparty_type,
  drop column counterparty_user_id,
  drop column counterparty_name;

create index claims_counterparty_id_idx on public.claims (counterparty_id);

-- Participant = creator, or the linked app user of an explicitly shared claim.
create or replace function public.is_claim_participant(target_claim_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.claims c
    left join public.counterparties cp on cp.id = c.counterparty_id
    where c.id = target_claim_id
      and (
        c.creator_user_id = auth.uid()
        or (
          c.shared_with_counterparty
          and cp.kind = 'app_user'
          and cp.linked_user_id = auth.uid()
        )
      )
  );
$$;

create policy claims_select_for_participants
  on public.claims
  for select
  to authenticated
  using (public.is_claim_participant(id));

create policy claims_update_for_participants
  on public.claims
  for update
  to authenticated
  using (public.is_claim_participant(id))
  with check (public.is_claim_participant(id));

-- The counterparty may still only react via status; the new reference and
-- sharing columns belong to the creator.
create or replace function public.enforce_claim_counterparty_update()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and auth.uid() <> old.creator_user_id then
    if new.creator_user_id <> old.creator_user_id
      or new.direction <> old.direction
      or new.counterparty_id <> old.counterparty_id
      or new.shared_with_counterparty <> old.shared_with_counterparty
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

comment on table public.counterparties is
  'Owner-private person records (app_user, invited_person, external_person). Linking to an app user never auto-exposes existing claims.';

comment on table public.counterparty_aliases is
  'Alias names per counterparty for duplicate suggestions. Merges always require explicit user confirmation and are not implemented here.';
