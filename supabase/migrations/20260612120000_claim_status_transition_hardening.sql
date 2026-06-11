-- Server-side enforcement of claim status transitions (issue #106).
--
-- Mirrors CLAIM_STATUS_TRANSITIONS in packages/core/src/claims.ts; the
-- parity script scripts/check-claim-transition-parity.ts proves both sides
-- stay identical (it parses the pair list below). Dispute rules from
-- docs/product/claim-dispute-clarification-v0.1.md:
--   * a disputed claim can never jump straight to settled/creditor_confirmed
--   * archived is terminal
--   * only claims shared with the counterparty can be disputed
--   * a dispute/rejection never deletes the claim (no delete policies exist;
--     rejection is only ever a status change)

-- PARITY-PAIRS-BEGIN (parsed by scripts/check-claim-transition-parity.ts)
create function public.is_claim_status_transition_allowed(
  from_status text,
  to_status text
)
returns boolean
language sql
immutable
as $$
  select (from_status || '->' || to_status) = any (array[
    'draft->private_open',
    'draft->linked_open',
    'draft->archived',
    'private_open->linked_open',
    'private_open->partially_paid',
    'private_open->marked_paid',
    'private_open->settled',
    'private_open->archived',
    'linked_open->debtor_acknowledged',
    'linked_open->disputed',
    'linked_open->partially_paid',
    'linked_open->marked_paid',
    'linked_open->archived',
    'debtor_acknowledged->disputed',
    'debtor_acknowledged->partially_paid',
    'debtor_acknowledged->marked_paid',
    'debtor_acknowledged->archived',
    'disputed->linked_open',
    'disputed->debtor_acknowledged',
    'disputed->archived',
    'partially_paid->disputed',
    'partially_paid->marked_paid',
    'partially_paid->creditor_confirmed',
    'partially_paid->settled',
    'partially_paid->archived',
    'marked_paid->disputed',
    'marked_paid->creditor_confirmed',
    'marked_paid->archived',
    'creditor_confirmed->settled',
    'creditor_confirmed->archived',
    'settled->archived'
  ]);
$$;
-- PARITY-PAIRS-END

comment on function public.is_claim_status_transition_allowed(text, text) is
  'Allowed claim status transitions; must stay identical to CLAIM_STATUS_TRANSITIONS in packages/core/src/claims.ts (verified by scripts/check-claim-transition-parity.ts).';

create function public.enforce_claim_status_transition()
returns trigger
language plpgsql
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if not public.is_claim_status_transition_allowed(old.status, new.status) then
    raise exception 'claims: status transition % -> % is not allowed',
      old.status, new.status;
  end if;

  -- A dispute is a clarification request and only possible where the
  -- counterparty can actually see the claim.
  if new.status = 'disputed' and not old.shared_with_counterparty then
    raise exception 'claims: only claims shared with the counterparty can be disputed';
  end if;

  if new.status = 'archived' then
    new.archived_at := coalesce(new.archived_at, now());
  end if;

  return new;
end;
$$;

create trigger claims_enforce_status_transition
  before update on public.claims
  for each row
  execute function public.enforce_claim_status_transition();

comment on function public.enforce_claim_status_transition() is
  'Rejects claim status updates outside the allowed transition table; disputes require a shared claim; archiving stamps archived_at. Runs alongside the per-role column restrictions from enforce_claim_counterparty_update.';

-- Cost-plan participant constraints (overlap exclusion per counterparty and
-- period range) are specified in docs/product/shared-subscriptions-v0.1.md;
-- they land with the recurring-cost schema migration (issue #112), since the
-- cost_plan tables do not exist yet.
