-- Revoke default DELETE grants from the app roles (issue #163).
--
-- The Supabase local stack grants ALL privileges on public schema tables
-- to authenticated and anon by default. Our intent (stated in
-- 20260611143000_grant_app_role_table_privileges.sql) was to limit the
-- authenticated role to select, insert, and update only — no DELETE, and
-- no grants to anon at all. No DELETE RLS policies exist anywhere; the
-- prior state relied on RLS default-deny (no matching policy = no rows
-- affected) rather than an explicit privilege boundary. Explicit revoke
-- is the correct protection: callers now receive a clear
-- insufficient_privilege error on any DELETE attempt rather than a
-- silent zero-row result.
--
-- cost_plans and cost_plan_participants were already revoked in
-- 20260615120000_recurring_cost_plans_schema.sql and are not repeated.

revoke delete on
  public.profiles,
  public.friend_connections,
  public.groups,
  public.group_members,
  public.group_contexts,
  public.context_members,
  public.member_availability,
  public.expenses,
  public.expense_shares,
  public.payment_actions,
  public.timeline_events,
  public.inbox_items,
  public.claims,
  public.claim_payments,
  public.claim_events,
  public.claim_reminders,
  public.counterparties,
  public.counterparty_aliases
from authenticated, anon;
