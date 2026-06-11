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

rollback;
