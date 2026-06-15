-- RLS behavior smoke test for the local Supabase stack.
-- Runs in one transaction and rolls back: the local database stays clean.
-- Execute via: corepack pnpm db:rls-test (local stack must be running).
--
-- Covered behavior:
--   1. A member sees their own group; outsiders see nothing.
--   2. Expense insert is allowed for an active group member.
--   3. Expense insert is rejected for a non-member.
--   4. payment_actions: payer may move suggested -> marked_paid,
--      payer may NOT confirm, payee may confirm marked_paid.
--   5. payment_actions: non-status columns are immutable (trigger).
--   6. claims: free-text claims are creator-only; linked claims are visible to
--      the counterparty, who may dispute but not edit amounts; claim payments
--      keep their core fields immutable.
--   7. claims: status transitions are enforced server-side (trigger mirrors
--      CLAIM_STATUS_TRANSITIONS in core): disputed never jumps to settled or
--      creditor_confirmed, unshared claims cannot be disputed, archived is
--      terminal, and a counterparty can never delete a claim.
--   8. claim write paths used by the supabase-local adapter: the counterparty
--      may record a payment only as themselves, claim events only carry the
--      acting user, and reminders stay personal (owner-only visibility,
--      never insertable for someone else; snooze/disable only on own rows).
--   9. 1A side-table write paths (#127): profiles are visible to fellow
--      group members only; inbox items are strictly own (insert/resolve own,
--      foreign updates hit zero rows, non-status columns pinned); expenses
--      support a creator-only one-way soft delete with all ledger columns
--      immutable.

begin;

create function pg_temp.assert(condition boolean, label text)
returns void
language plpgsql
as $$
begin
  if condition then
    raise notice 'PASS: %', label;
  else
    raise exception 'FAIL: %', label;
  end if;
end;
$$;

-- Impersonation helper: switches the connection into the authenticated role
-- with the given user id in the JWT claims, exactly like PostgREST does.
create function pg_temp.impersonate(user_id uuid)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', user_id)::text, true);
  set local role authenticated;
end;
$$;

-- ---------------------------------------------------------------- setup ---
-- Runs as postgres (bypasses RLS, not triggers).

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-00000000000a', 'rls-a@local.test'),
  ('00000000-0000-0000-0000-00000000000b', 'rls-b@local.test'),
  ('00000000-0000-0000-0000-00000000000c', 'rls-c@local.test');

insert into public.profiles (id, display_name, username)
values
  ('00000000-0000-0000-0000-00000000000a', 'User A', 'rls-a'),
  ('00000000-0000-0000-0000-00000000000b', 'User B', 'rls-b'),
  ('00000000-0000-0000-0000-00000000000c', 'User C', 'rls-c');

insert into public.groups (id, name, type, default_currency_code, created_by)
values
  ('00000000-0000-0000-0000-0000000000a1', 'Group AB', 'friends', 'EUR',
   '00000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-0000000000c1', 'Group C', 'friends', 'EUR',
   '00000000-0000-0000-0000-00000000000c');

insert into public.group_members (group_id, user_id, role)
values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000a', 'owner'),
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-00000000000b', 'member'),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000c', 'owner');

insert into public.group_contexts (id, group_id, name, type)
values
  ('00000000-0000-0000-0000-0000000000d1',
   '00000000-0000-0000-0000-0000000000a1', 'Allgemein', 'general');

insert into public.payment_actions (id, group_id, payer_id, payee_id, amount_minor, currency_code, status)
values
  ('00000000-0000-0000-0000-0000000000e1',
   '00000000-0000-0000-0000-0000000000a1',
   '00000000-0000-0000-0000-00000000000a',
   '00000000-0000-0000-0000-00000000000b',
   1500, 'EUR', 'suggested');

-- ----------------------------------------------------- 1. group visibility ---

select pg_temp.impersonate('00000000-0000-0000-0000-00000000000a');
select pg_temp.assert(
  (select count(*) from public.groups) = 1
    and exists (select 1 from public.groups where name = 'Group AB'),
  'member A sees exactly their own group');
reset role;

select pg_temp.impersonate('00000000-0000-0000-0000-00000000000c');
select pg_temp.assert(
  not exists (select 1 from public.groups where name = 'Group AB'),
  'outsider C cannot see Group AB');
reset role;

-- ------------------------------------------------ 2. member expense insert ---

select pg_temp.impersonate('00000000-0000-0000-0000-00000000000b');
insert into public.expenses (id, group_id, context_id, amount_minor, currency_code, paid_by_user_id, expense_date, title, created_by)
values
  ('00000000-0000-0000-0000-0000000000f1',
   '00000000-0000-0000-0000-0000000000a1',
   '00000000-0000-0000-0000-0000000000d1',
   3000, 'EUR', '00000000-0000-0000-0000-00000000000b', '2026-06-11', 'Smoke expense',
   '00000000-0000-0000-0000-00000000000b');
reset role;
select pg_temp.assert(
  exists (select 1 from public.expenses where title = 'Smoke expense'),
  'member B may insert an expense into the shared group');

-- -------------------------------------------- 3. non-member expense insert ---

do $$
begin
  perform pg_temp.impersonate('00000000-0000-0000-0000-00000000000c');
  begin
    insert into public.expenses (group_id, context_id, amount_minor, currency_code, paid_by_user_id, expense_date, created_by)
    values
      ('00000000-0000-0000-0000-0000000000a1',
       '00000000-0000-0000-0000-0000000000d1',
       1000, 'EUR', '00000000-0000-0000-0000-00000000000c', '2026-06-11',
       '00000000-0000-0000-0000-00000000000c');
    raise exception 'FAIL: non-member C could insert an expense';
  exception
    when insufficient_privilege then
      raise notice 'PASS: non-member C cannot insert an expense (42501)';
  end;
  reset role;
end;
$$;
reset role;

-- ------------------------------------ 4. payment action status transitions ---

-- Payer A: suggested -> marked_paid is allowed.
select pg_temp.impersonate('00000000-0000-0000-0000-00000000000a');
with updated as (
  update public.payment_actions
  set status = 'marked_paid'
  where id = '00000000-0000-0000-0000-0000000000e1'
  returning 1
)
select pg_temp.assert(
  (select count(*) from updated) = 1,
  'payer A may mark the suggested action as marked_paid');

-- Payer A: marked_paid -> confirmed must NOT be possible (payee-only).
with updated as (
  update public.payment_actions
  set status = 'confirmed'
  where id = '00000000-0000-0000-0000-0000000000e1'
  returning 1
)
select pg_temp.assert(
  (select count(*) from updated) = 0,
  'payer A cannot confirm their own marked_paid action');
reset role;

-- Payee B: marked_paid -> confirmed is allowed.
select pg_temp.impersonate('00000000-0000-0000-0000-00000000000b');
with updated as (
  update public.payment_actions
  set status = 'confirmed'
  where id = '00000000-0000-0000-0000-0000000000e1'
  returning 1
)
select pg_temp.assert(
  (select count(*) from updated) = 1,
  'payee B may confirm the marked_paid action');
reset role;

select pg_temp.assert(
  (select status from public.payment_actions
   where id = '00000000-0000-0000-0000-0000000000e1') = 'confirmed',
  'payment action ends in status confirmed');

-- ---------------------------------------------- 5. immutable ledger fields ---

do $$
begin
  begin
    update public.payment_actions
    set amount_minor = 9999
    where id = '00000000-0000-0000-0000-0000000000e1';
    raise exception 'FAIL: payment action amount was mutable';
  exception
    when others then
      if sqlerrm like '%only status%' then
        raise notice 'PASS: payment action non-status columns are immutable';
      else
        raise;
      end if;
  end;
end;
$$;

-- ----------------------------------------------------------- 6. claims ---

-- A creates counterparties: an external person, a linked app_user record for
-- B (shared claim), and another linked record whose claim stays unshared.
select pg_temp.impersonate('00000000-0000-0000-0000-00000000000a');
insert into public.counterparties (id, owner_user_id, kind, display_name, normalized_name, linked_user_id)
values
  ('00000000-0000-0000-0000-0000000000b1',
   '00000000-0000-0000-0000-00000000000a', 'external_person', 'Kiosk Karl', 'kiosk karl', null),
  ('00000000-0000-0000-0000-0000000000b2',
   '00000000-0000-0000-0000-00000000000a', 'app_user', 'User B', 'user b',
   '00000000-0000-0000-0000-00000000000b');

insert into public.claims (id, creator_user_id, direction, counterparty_id, shared_with_counterparty, amount_minor, currency_code, claim_date, status)
values
  ('00000000-0000-0000-0000-0000000000a2',
   '00000000-0000-0000-0000-00000000000a',
   'owed_to_me', '00000000-0000-0000-0000-0000000000b1', false,
   700, 'EUR', '2026-06-11', 'private_open'),
  ('00000000-0000-0000-0000-0000000000a3',
   '00000000-0000-0000-0000-00000000000a',
   'owed_to_me', '00000000-0000-0000-0000-0000000000b2', true,
   2000, 'EUR', '2026-06-11', 'linked_open'),
  -- Same linked counterparty, but the creator did NOT share this claim:
  -- simulates an old private note after the person was linked later.
  ('00000000-0000-0000-0000-0000000000a5',
   '00000000-0000-0000-0000-00000000000a',
   'owed_to_me', '00000000-0000-0000-0000-0000000000b2', false,
   900, 'EUR', '2026-06-11', 'private_open');

insert into public.claim_payments (id, claim_id, amount_minor, currency_code, payment_date, recorded_by)
values
  ('00000000-0000-0000-0000-0000000000a4',
   '00000000-0000-0000-0000-0000000000a3',
   500, 'EUR', '2026-06-11', '00000000-0000-0000-0000-00000000000a');

select pg_temp.assert(
  (select count(*) from public.claims) = 3,
  'creator A sees all three own claims');

-- Regression (#119): INSERT ... RETURNING must work for the creator. The
-- adapter creates claims via insert + returning id; the old select policy
-- (claims self-subquery) could not see the new row in the command snapshot.
with inserted as (
  insert into public.claims (creator_user_id, direction, counterparty_id, shared_with_counterparty, amount_minor, currency_code, claim_date, status)
  values
    ('00000000-0000-0000-0000-00000000000a',
     'owed_to_me', '00000000-0000-0000-0000-0000000000b1', false,
     400, 'EUR', '2026-06-12', 'private_open')
  returning id
)
select pg_temp.assert(
  (select count(*) from inserted) = 1,
  'creator A can insert a claim with RETURNING');
reset role;

-- Linked counterparty B sees only the explicitly shared claim: not the
-- free-text claim, and not the unshared claim against the linked record.
select pg_temp.impersonate('00000000-0000-0000-0000-00000000000b');
select pg_temp.assert(
  (select count(*) from public.claims) = 1
    and exists (select 1 from public.claims
                where id = '00000000-0000-0000-0000-0000000000a3'),
  'counterparty B sees only the shared linked claim');

-- Linking never exposes the owner''s counterparty records themselves.
select pg_temp.assert(
  (select count(*) from public.counterparties) = 0,
  'counterparty B cannot see A''s counterparty records');

-- B may dispute the linked claim.
with updated as (
  update public.claims
  set status = 'disputed'
  where id = '00000000-0000-0000-0000-0000000000a3'
  returning 1
)
select pg_temp.assert(
  (select count(*) from updated) = 1,
  'counterparty B may dispute the linked claim');

-- B may not change the claim amount (trigger).
do $$
begin
  begin
    update public.claims
    set amount_minor = 1
    where id = '00000000-0000-0000-0000-0000000000a3';
    raise exception 'FAIL: counterparty could change the claim amount';
  exception
    when others then
      if sqlerrm like '%only change the status%' then
        raise notice 'PASS: counterparty cannot change the claim amount';
      else
        raise;
      end if;
  end;
end;
$$;
reset role;

-- Outsider C sees no claims at all.
select pg_temp.impersonate('00000000-0000-0000-0000-00000000000c');
select pg_temp.assert(
  (select count(*) from public.claims) = 0,
  'outsider C sees no claims');
reset role;

-- Claim payment core fields are immutable (trigger, runs as table owner too).
do $$
begin
  begin
    update public.claim_payments
    set amount_minor = 9999
    where id = '00000000-0000-0000-0000-0000000000a4';
    raise exception 'FAIL: claim payment amount was mutable';
  exception
    when others then
      if sqlerrm like '%confirmation state%' then
        raise notice 'PASS: claim payment core fields are immutable';
      else
        raise;
      end if;
  end;
end;
$$;

-- ------------------------------- claim status transition hardening (#106) ---
-- Claim a3 is 'disputed' at this point (B disputed it above).

-- Creator A: the per-role counterparty trigger does not apply, so these hit
-- the status transition trigger directly.
select pg_temp.impersonate('00000000-0000-0000-0000-00000000000a');

-- Disputed never jumps straight to settled or creditor_confirmed.
do $$
begin
  begin
    update public.claims
    set status = 'settled'
    where id = '00000000-0000-0000-0000-0000000000a3';
    raise exception 'FAIL: disputed claim could be settled directly';
  exception
    when others then
      if sqlerrm like '%is not allowed%' then
        raise notice 'PASS: disputed claim cannot move straight to settled';
      else
        raise;
      end if;
  end;
  begin
    update public.claims
    set status = 'creditor_confirmed'
    where id = '00000000-0000-0000-0000-0000000000a3';
    raise exception 'FAIL: disputed claim could be creditor_confirmed directly';
  exception
    when others then
      if sqlerrm like '%is not allowed%' then
        raise notice 'PASS: disputed claim cannot move straight to creditor_confirmed';
      else
        raise;
      end if;
  end;
end;
$$;

-- Clarification path stays open: disputed -> debtor_acknowledged is allowed
-- (counterparty B takes the claim over after talking it through).
select pg_temp.impersonate('00000000-0000-0000-0000-00000000000b');
with updated as (
  update public.claims
  set status = 'debtor_acknowledged'
  where id = '00000000-0000-0000-0000-0000000000a3'
  returning 1
)
select pg_temp.assert(
  (select count(*) from updated) = 1,
  'disputed claim can be taken over after clarification');
select pg_temp.impersonate('00000000-0000-0000-0000-00000000000a');

-- Unshared claims cannot be disputed: neither from private_open (table) nor
-- from linked_open while still unshared (explicit guard).
do $$
begin
  begin
    update public.claims
    set status = 'disputed'
    where id = '00000000-0000-0000-0000-0000000000a5';
    raise exception 'FAIL: private_open claim could be disputed';
  exception
    when others then
      if sqlerrm like '%is not allowed%' then
        raise notice 'PASS: private_open claim cannot be disputed';
      else
        raise;
      end if;
  end;

  update public.claims
  set status = 'linked_open'
  where id = '00000000-0000-0000-0000-0000000000a5';

  begin
    update public.claims
    set status = 'disputed'
    where id = '00000000-0000-0000-0000-0000000000a5';
    raise exception 'FAIL: unshared linked_open claim could be disputed';
  exception
    when others then
      if sqlerrm like '%can be disputed%' then
        raise notice 'PASS: unshared claim cannot be disputed even when linked_open';
      else
        raise;
      end if;
  end;
end;
$$;

-- Archived is terminal and archiving stamps archived_at.
update public.claims
set status = 'archived'
where id = '00000000-0000-0000-0000-0000000000a5';

select pg_temp.assert(
  (select archived_at is not null from public.claims
   where id = '00000000-0000-0000-0000-0000000000a5'),
  'archiving stamps archived_at');

do $$
begin
  begin
    update public.claims
    set status = 'linked_open'
    where id = '00000000-0000-0000-0000-0000000000a5';
    raise exception 'FAIL: archived claim could be reopened';
  exception
    when others then
      if sqlerrm like '%is not allowed%' then
        raise notice 'PASS: archived is terminal';
      else
        raise;
      end if;
  end;
end;
$$;

-- A dispute/rejection never deletes: the counterparty cannot delete a claim.
-- No DELETE RLS policy exists (intentionally deferred), so RLS default-deny
-- blocks all DELETE operations on claims, returning 0 rows.
select pg_temp.impersonate('00000000-0000-0000-0000-00000000000b');
with deleted as (
  delete from public.claims
  where id = '00000000-0000-0000-0000-0000000000a3'
  returning 1
)
select pg_temp.assert(
  (select count(*) from deleted) = 0,
  'counterparty B cannot delete a claim (RLS default deny, no DELETE policy)');
reset role;

-- ------------------------------------ 8. claim write paths (adapter, #105) ---
-- Claim a3 is shared with linked counterparty B (status debtor_acknowledged).

-- Counterparty B may record a payment as themselves (pending confirmation).
select pg_temp.impersonate('00000000-0000-0000-0000-00000000000b');
insert into public.claim_payments (id, claim_id, amount_minor, currency_code, payment_date, recorded_by, confirmation_status)
values
  ('00000000-0000-0000-0000-0000000000a6',
   '00000000-0000-0000-0000-0000000000a3',
   300, 'EUR', '2026-06-12', '00000000-0000-0000-0000-00000000000b',
   'pending_confirmation');
select pg_temp.assert(
  exists (select 1 from public.claim_payments
          where id = '00000000-0000-0000-0000-0000000000a6'),
  'counterparty B may record a payment on the shared claim');

-- B may not record a payment in someone else''s name.
do $$
begin
  begin
    insert into public.claim_payments (claim_id, amount_minor, currency_code, payment_date, recorded_by)
    values
      ('00000000-0000-0000-0000-0000000000a3',
       100, 'EUR', '2026-06-12', '00000000-0000-0000-0000-00000000000a');
    raise exception 'FAIL: counterparty could record a payment as the creator';
  exception
    when insufficient_privilege then
      raise notice 'PASS: payments can only be recorded as oneself (42501)';
  end;
end;
$$;

-- Claim events carry only the acting user.
insert into public.claim_events (claim_id, actor_user_id, event_type)
values
  ('00000000-0000-0000-0000-0000000000a3',
   '00000000-0000-0000-0000-00000000000b', 'payment_recorded');
do $$
begin
  begin
    insert into public.claim_events (claim_id, actor_user_id, event_type)
    values
      ('00000000-0000-0000-0000-0000000000a3',
       '00000000-0000-0000-0000-00000000000a', 'payment_recorded');
    raise exception 'FAIL: counterparty could write an event as the creator';
  exception
    when insufficient_privilege then
      raise notice 'PASS: claim events can only carry the acting user (42501)';
  end;
end;
$$;

-- Reminders are personal memory aids: each participant sets their own, and
-- nobody can see or create reminders for the other side.
insert into public.claim_reminders (claim_id, user_id, remind_at)
values
  ('00000000-0000-0000-0000-0000000000a3',
   '00000000-0000-0000-0000-00000000000b', '2026-07-01T09:00:00Z');
do $$
begin
  begin
    insert into public.claim_reminders (claim_id, user_id, remind_at)
    values
      ('00000000-0000-0000-0000-0000000000a3',
       '00000000-0000-0000-0000-00000000000a', '2026-07-01T09:00:00Z');
    raise exception 'FAIL: counterparty could create a reminder for the creator';
  exception
    when insufficient_privilege then
      raise notice 'PASS: reminders cannot be created for someone else (42501)';
  end;
end;
$$;
reset role;

select pg_temp.impersonate('00000000-0000-0000-0000-00000000000a');
select pg_temp.assert(
  (select count(*) from public.claim_reminders) = 0,
  'creator A cannot see counterparty B''s reminder');

-- A cannot snooze or disable B's reminder either: RLS yields zero rows.
with updated as (
  update public.claim_reminders
  set remind_at = '2026-08-01T09:00:00Z'
  where user_id = '00000000-0000-0000-0000-00000000000b'
  returning 1
)
select pg_temp.assert(
  (select count(*) from updated) = 0,
  'creator A cannot update counterparty B''s reminder');
reset role;

-- B may snooze (move later) and disable their own reminder.
select pg_temp.impersonate('00000000-0000-0000-0000-00000000000b');
with updated as (
  update public.claim_reminders
  set remind_at = '2026-07-02T09:00:00Z'
  where claim_id = '00000000-0000-0000-0000-0000000000a3'
    and user_id = '00000000-0000-0000-0000-00000000000b'
  returning 1
)
select pg_temp.assert(
  (select count(*) from updated) = 1,
  'counterparty B may snooze their own reminder');

with updated as (
  update public.claim_reminders
  set disabled_at = '2026-07-02T10:00:00Z'
  where claim_id = '00000000-0000-0000-0000-0000000000a3'
    and user_id = '00000000-0000-0000-0000-00000000000b'
  returning 1
)
select pg_temp.assert(
  (select count(*) from updated) = 1,
  'counterparty B may disable their own reminder');
reset role;

-- ------------------------------- 9. 1A side-table write paths (#127) ---

-- Profiles: visible to yourself and fellow group members, nobody else.
-- A and B share Group AB; C is in no shared group with A.
select pg_temp.impersonate('00000000-0000-0000-0000-00000000000b');
select pg_temp.assert(
  exists (select 1 from public.profiles
          where id = '00000000-0000-0000-0000-00000000000a'),
  'fellow group member B sees A''s profile');
reset role;

select pg_temp.impersonate('00000000-0000-0000-0000-00000000000c');
select pg_temp.assert(
  not exists (select 1 from public.profiles
              where id = '00000000-0000-0000-0000-00000000000a'),
  'outsider C cannot see A''s profile');

-- Inbox: strictly own. C creates an own item, cannot create one for A.
insert into public.inbox_items (id, user_id, type)
values
  ('00000000-0000-0000-0000-0000000000c2',
   '00000000-0000-0000-0000-00000000000c', 'confirmation_pending');
do $$
begin
  begin
    insert into public.inbox_items (user_id, type)
    values ('00000000-0000-0000-0000-00000000000a', 'confirmation_pending');
    raise exception 'FAIL: C could create an inbox item for A';
  exception
    when insufficient_privilege then
      raise notice 'PASS: inbox items cannot be created for someone else (42501)';
  end;
end;
$$;

-- Owner may resolve; the trigger stamps resolved_at.
update public.inbox_items
set status = 'resolved'
where id = '00000000-0000-0000-0000-0000000000c2';
select pg_temp.assert(
  (select resolved_at is not null from public.inbox_items
   where id = '00000000-0000-0000-0000-0000000000c2'),
  'owner C may resolve their inbox item and resolved_at is stamped');

-- Non-status columns are pinned by the trigger.
do $$
begin
  begin
    update public.inbox_items
    set type = 'something_else'
    where id = '00000000-0000-0000-0000-0000000000c2';
    raise exception 'FAIL: inbox item type was mutable';
  exception
    when others then
      if sqlerrm like '%resolution status%' then
        raise notice 'PASS: inbox item non-status columns are pinned';
      else
        raise;
      end if;
  end;
end;
$$;
reset role;

-- Foreign inbox items are invisible and not updatable (zero rows).
select pg_temp.impersonate('00000000-0000-0000-0000-00000000000b');
with updated as (
  update public.inbox_items
  set status = 'dismissed'
  where id = '00000000-0000-0000-0000-0000000000c2'
  returning 1
)
select pg_temp.assert(
  (select count(*) from updated) = 0,
  'B cannot resolve C''s inbox item');

-- Expenses: ledger columns stay immutable for everyone, incl. the creator.
-- B created 'Smoke expense' in section 2.
do $$
begin
  begin
    update public.expenses
    set amount_minor = 1
    where id = '00000000-0000-0000-0000-0000000000f1';
    raise exception 'FAIL: expense amount was mutable';
  exception
    when others then
      if sqlerrm like '%soft-delete marker%' then
        raise notice 'PASS: expense ledger columns are immutable';
      else
        raise;
      end if;
  end;
end;
$$;

-- Creator B may soft-delete their own expense exactly once.
update public.expenses
set deleted_at = now()
where id = '00000000-0000-0000-0000-0000000000f1';
select pg_temp.assert(
  (select deleted_at is not null from public.expenses
   where id = '00000000-0000-0000-0000-0000000000f1'),
  'creator B may soft-delete their own expense');

-- Undo is rejected.
do $$
begin
  begin
    update public.expenses
    set deleted_at = null
    where id = '00000000-0000-0000-0000-0000000000f1';
    raise exception 'FAIL: expense soft delete could be undone';
  exception
    when others then
      if sqlerrm like '%cannot be undone%' then
        raise notice 'PASS: expense soft delete is one-way';
      else
        raise;
      end if;
  end;
end;
$$;
reset role;

-- Member A (not the creator) cannot soft-delete B's expense: zero rows.
select pg_temp.impersonate('00000000-0000-0000-0000-00000000000a');
with updated as (
  update public.expenses
  set deleted_at = now()
  where id = '00000000-0000-0000-0000-0000000000f1'
  returning 1
)
select pg_temp.assert(
  (select count(*) from updated) = 0,
  'non-creator A cannot soft-delete B''s expense');
reset role;

-- ---------------------------------- 10. cost_plans and cost_plan_participants ---
-- Uses Group AB (A + B members; C is outsider).
-- A creates a counterparty for B so participant inserts work.

select pg_temp.impersonate('00000000-0000-0000-0000-00000000000a');

insert into public.counterparties (id, owner_user_id, kind, display_name, normalized_name, linked_user_id)
values
  ('00000000-0000-0000-0000-000000000ca1',
   '00000000-0000-0000-0000-00000000000a', 'app_user', 'User B', 'user b',
   '00000000-0000-0000-0000-00000000000b');

-- Active group member A may create a cost plan for Group AB.
insert into public.cost_plans (
  id, group_id, created_by, name,
  amount_minor, currency_code, interval_kind, anchor_date
)
values (
  '00000000-0000-0000-0000-000000000ca2',
  '00000000-0000-0000-0000-0000000000a1',
  '00000000-0000-0000-0000-00000000000a',
  'Streaming',
  1299, 'EUR', 'monthly', '2026-01-01'
);

select pg_temp.assert(
  exists (select 1 from public.cost_plans where id = '00000000-0000-0000-0000-000000000ca2'),
  'creator A may insert a cost plan into their group');

-- A may add B as participant via their counterparty record.
insert into public.cost_plan_participants (
  id, cost_plan_id, counterparty_id,
  share_type, joined_at_period_index
)
values (
  '00000000-0000-0000-0000-000000000ca3',
  '00000000-0000-0000-0000-000000000ca2',
  '00000000-0000-0000-0000-000000000ca1',
  'equal', 0
);

select pg_temp.assert(
  exists (select 1 from public.cost_plan_participants
          where id = '00000000-0000-0000-0000-000000000ca3'),
  'A may add participant B to their cost plan');

reset role;

-- Fellow group member B can read the plan and participant.
select pg_temp.impersonate('00000000-0000-0000-0000-00000000000b');

select pg_temp.assert(
  exists (select 1 from public.cost_plans
          where id = '00000000-0000-0000-0000-000000000ca2'),
  'group member B can read A''s cost plan');

select pg_temp.assert(
  exists (select 1 from public.cost_plan_participants
          where id = '00000000-0000-0000-0000-000000000ca3'),
  'group member B can read cost plan participants');

reset role;

-- Outsider C sees neither plans nor participants.
select pg_temp.impersonate('00000000-0000-0000-0000-00000000000c');

select pg_temp.assert(
  not exists (select 1 from public.cost_plans
              where id = '00000000-0000-0000-0000-000000000ca2'),
  'outsider C cannot read Group AB cost plans');

select pg_temp.assert(
  not exists (select 1 from public.cost_plan_participants
              where id = '00000000-0000-0000-0000-000000000ca3'),
  'outsider C cannot read Group AB cost plan participants');

-- Outsider C cannot insert a plan into Group AB.
do $$
begin
  begin
    insert into public.cost_plans (
      group_id, created_by, name,
      amount_minor, currency_code, interval_kind, anchor_date
    )
    values (
      '00000000-0000-0000-0000-0000000000a1',
      '00000000-0000-0000-0000-00000000000c',
      'Intruder plan',
      999, 'EUR', 'monthly', '2026-01-01'
    );
    raise exception 'FAIL: outsider C could insert a cost plan into Group AB';
  exception
    when insufficient_privilege then
      raise notice 'PASS: outsider C cannot insert a cost plan (42501)';
  end;
end;
$$;

reset role;

rollback;
