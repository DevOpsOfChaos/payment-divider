-- Fix: claims INSERT ... RETURNING was blocked by RLS (issue #119).
--
-- The previous SELECT/UPDATE policies delegated to is_claim_participant(id),
-- which re-queries public.claims. During INSERT ... RETURNING the freshly
-- inserted row is not visible to that subquery yet (command snapshot), so the
-- RETURNING visibility check failed even for the creator's own row.
--
-- The policies now check the creator inline on the row itself and use a
-- narrow security-definer helper only for the shared-counterparty side
-- (counterparties lookup, no claims self-subquery). Visibility semantics are
-- unchanged: the creator sees their own claims; a linked app user sees
-- exactly the claims explicitly shared with them; outsiders see nothing.
-- is_claim_participant stays in place for the claim child tables, where it
-- inspects already-committed claim rows.

create function public.is_linked_counterparty_user(target_counterparty_id uuid)
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
      and cp.kind = 'app_user'
      and cp.linked_user_id = auth.uid()
  );
$$;

comment on function public.is_linked_counterparty_user(uuid) is
  'Returns true when auth.uid() is the app user linked to the counterparty record. Security definer: counterparty records are owner-private, but claim visibility for shared claims must check the link.';

drop policy claims_select_for_participants on public.claims;
drop policy claims_update_for_participants on public.claims;

create policy claims_select_for_participants
  on public.claims
  for select
  to authenticated
  using (
    creator_user_id = auth.uid()
    or (
      shared_with_counterparty
      and public.is_linked_counterparty_user(counterparty_id)
    )
  );

create policy claims_update_for_participants
  on public.claims
  for update
  to authenticated
  using (
    creator_user_id = auth.uid()
    or (
      shared_with_counterparty
      and public.is_linked_counterparty_user(counterparty_id)
    )
  )
  with check (
    creator_user_id = auth.uid()
    or (
      shared_with_counterparty
      and public.is_linked_counterparty_user(counterparty_id)
    )
  );
