-- Explicit table privileges for the app role.
--
-- Newer Supabase Postgres images no longer grant broad default privileges on
-- postgres-owned objects in schema public to the API roles. Grant exactly the
-- statement-level privileges our RLS policies are designed to gate: select,
-- insert, and update for authenticated users. No delete (delete policies are
-- deliberately deferred) and nothing for anon — none of our policies target
-- the anon role.

grant select, insert, update on
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
  public.claim_reminders
to authenticated;
