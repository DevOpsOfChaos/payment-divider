-- Close two 1A write-path gaps found by the shared-alpha audit (#108, #127):
--
--   1. inbox_items: owners could not resolve/dismiss their own items.
--   2. expenses: the deleted_at soft-delete column was unreachable from the
--      client (no update policy at all).
--
-- Both stay narrow: RLS scopes the rows (own inbox items, own created
-- expenses), and triggers pin every other column, following the established
-- immutability pattern (enforce_payment_action_transition,
-- enforce_claim_payment_update). No delete privileges are granted anywhere;
-- a soft delete documents that a ledger entry was withdrawn, it never
-- removes history. Nothing here touches payments, providers or balances
-- beyond excluding soft-deleted expenses, which core already does.

-- ------------------------------------------------------------ inbox_items ---

-- Only the resolution state may change; resolved_at is stamped/cleared by
-- the trigger, never trusted from the client.
create function public.enforce_inbox_item_resolution()
returns trigger
language plpgsql
as $$
begin
  if new.user_id <> old.user_id
    or new.group_id is distinct from old.group_id
    or new.context_id is distinct from old.context_id
    or new.type <> old.type
    or new.related_entity_type is distinct from old.related_entity_type
    or new.related_entity_id is distinct from old.related_entity_id
    or new.created_at <> old.created_at then
    raise exception 'inbox_items: only the resolution status may change';
  end if;

  if new.status in ('resolved', 'dismissed') then
    new.resolved_at := coalesce(new.resolved_at, now());
  elsif new.status = 'open' then
    new.resolved_at := null;
  end if;

  return new;
end;
$$;

comment on function public.enforce_inbox_item_resolution() is
  'Pins all inbox item columns except status; stamps resolved_at on resolved/dismissed and clears it on reopen.';

create trigger inbox_items_enforce_resolution
  before update on public.inbox_items
  for each row
  execute function public.enforce_inbox_item_resolution();

create policy inbox_items_update_own
  on public.inbox_items
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- --------------------------------------------------------------- expenses ---

-- The creator may mark their own expense as withdrawn (deleted_at). The
-- soft delete is one-way: no undo, no re-dating — history stays honest.
-- updated_at is maintained by the existing set_updated_at trigger and is
-- therefore exempt from the comparison.
create function public.enforce_expense_soft_delete_only()
returns trigger
language plpgsql
as $$
begin
  if new.group_id <> old.group_id
    or new.context_id <> old.context_id
    or new.amount_minor <> old.amount_minor
    or new.currency_code <> old.currency_code
    or new.paid_by_user_id <> old.paid_by_user_id
    or new.expense_date <> old.expense_date
    or new.title is distinct from old.title
    or new.note is distinct from old.note
    or new.created_by <> old.created_by
    or new.created_at <> old.created_at then
    raise exception 'expenses: only the soft-delete marker may change';
  end if;

  if new.deleted_at is distinct from old.deleted_at then
    if old.deleted_at is not null or new.deleted_at is null then
      raise exception 'expenses: a soft delete cannot be undone or re-dated';
    end if;
  end if;

  return new;
end;
$$;

comment on function public.enforce_expense_soft_delete_only() is
  'Allows updates on expenses only to set deleted_at once (null -> timestamp); every ledger column stays immutable.';

create trigger expenses_enforce_soft_delete_only
  before update on public.expenses
  for each row
  execute function public.enforce_expense_soft_delete_only();

create policy expenses_update_soft_delete_by_creator
  on public.expenses
  for update
  to authenticated
  using (created_by = auth.uid())
  with check (created_by = auth.uid());
