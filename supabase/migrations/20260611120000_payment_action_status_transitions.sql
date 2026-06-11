-- Ledger-only payment action status transitions.
--
-- payment_actions record what users mark or confirm about settlements that
-- happen entirely outside the app. These policies let exactly two ledger
-- transitions happen and nothing else:
--   payer:  suggested    -> marked_paid
--   payee:  marked_paid  -> confirmed | rejected
-- No deletes, no provider fields, no payment execution, no automatic
-- settlement claims. A trigger pins every non-status column so an update can
-- only ever change the status and its corresponding timestamp.

create function public.enforce_payment_action_transition()
returns trigger
language plpgsql
as $$
begin
  if new.group_id <> old.group_id
    or new.context_id is distinct from old.context_id
    or new.payer_id <> old.payer_id
    or new.payee_id <> old.payee_id
    or new.amount_minor <> old.amount_minor
    or new.currency_code <> old.currency_code
    or new.created_at <> old.created_at then
    raise exception 'payment_actions: only status and status timestamps may change';
  end if;

  if old.status = 'suggested' and new.status = 'marked_paid' then
    new.marked_paid_at := coalesce(new.marked_paid_at, now());
  elsif old.status = 'marked_paid' and new.status = 'confirmed' then
    new.confirmed_by_payee_at := coalesce(new.confirmed_by_payee_at, now());
  elsif old.status = 'marked_paid' and new.status = 'rejected' then
    new.rejected_at := coalesce(new.rejected_at, now());
  else
    raise exception 'payment_actions: invalid ledger status transition % -> %',
      old.status, new.status;
  end if;

  return new;
end;
$$;

create trigger payment_actions_enforce_transition
  before update on public.payment_actions
  for each row
  execute function public.enforce_payment_action_transition();

comment on function public.enforce_payment_action_transition() is
  'Restricts payment_actions updates to the two ledger-only status transitions (payer marks paid, payee confirms or rejects) and keeps all other columns immutable.';

-- Payer may mark their own suggested outgoing action as externally settled.
create policy payment_actions_update_mark_paid_by_payer
  on public.payment_actions
  for update
  to authenticated
  using (
    payer_id = auth.uid()
    and status = 'suggested'
    and public.is_group_member(group_id)
  )
  with check (
    payer_id = auth.uid()
    and status = 'marked_paid'
  );

-- Payee may confirm or reject an incoming action that was marked paid.
create policy payment_actions_update_resolve_by_payee
  on public.payment_actions
  for update
  to authenticated
  using (
    payee_id = auth.uid()
    and status = 'marked_paid'
    and public.is_group_member(group_id)
  )
  with check (
    payee_id = auth.uid()
    and status in ('confirmed', 'rejected')
  );
