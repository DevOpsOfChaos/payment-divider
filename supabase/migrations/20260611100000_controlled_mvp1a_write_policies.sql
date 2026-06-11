-- Controlled MVP 1A write policies.
--
-- Conservative insert/update policies for group creation and ledger record
-- creation. payment_actions stay ledger-only: inserting a row records an
-- intended or claimed external settlement inside the app ledger and never
-- initiates or verifies a payment. Status-transition updates (mark paid,
-- confirm, reject), membership changes beyond creation, availability edits,
-- inbox resolution, and all delete policies are intentionally deferred until
-- the corresponding application flows are designed.
--
-- Helper functions are security definer so policy subqueries do not re-enter
-- row level security on the same tables (no recursive policy evaluation).

create function public.is_group_creator(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.groups g
    where g.id = target_group_id
      and g.created_by = auth.uid()
  );
$$;

create function public.is_group_admin(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
      and gm.role in ('owner', 'admin')
  );
$$;

comment on function public.is_group_creator(uuid) is
  'Returns true when auth.uid() created the target group.';

comment on function public.is_group_admin(uuid) is
  'Returns true when auth.uid() is an active owner or admin member of the target group.';

-- profiles: a user may create exactly their own profile row.
create policy profiles_insert_own
  on public.profiles
  for insert
  to authenticated
  with check (id = auth.uid());

-- groups: a user may create groups they own.
create policy groups_insert_as_creator
  on public.groups
  for insert
  to authenticated
  with check (created_by = auth.uid());

-- group_members: the group creator may add their own initial membership;
-- active owners/admins may add further members.
create policy group_members_insert_self_as_creator
  on public.group_members
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and public.is_group_creator(group_id)
  );

create policy group_members_insert_by_admin
  on public.group_members
  for insert
  to authenticated
  with check (public.is_group_admin(group_id));

-- group_contexts: active members may create activities; owners/admins may
-- update them (rename, dates, archive).
create policy group_contexts_insert_for_group_members
  on public.group_contexts
  for insert
  to authenticated
  with check (public.is_group_member(group_id));

create policy group_contexts_update_by_admin
  on public.group_contexts
  for update
  to authenticated
  using (public.is_group_admin(group_id))
  with check (public.is_group_admin(group_id));

-- expenses: active members may record expenses they author.
create policy expenses_insert_for_group_members
  on public.expenses
  for insert
  to authenticated
  with check (
    public.is_group_member(group_id)
    and created_by = auth.uid()
  );

-- expense_shares: tied to expense visibility (active member of the parent group).
create policy expense_shares_insert_for_group_members
  on public.expense_shares
  for insert
  to authenticated
  with check (public.is_expense_group_member(expense_id));

-- payment_actions: ledger-only suggestion records; the inserting user must be
-- an active group member and one of the two parties. Status transitions are
-- deferred to a dedicated settlement-flow issue.
create policy payment_actions_insert_for_involved_members
  on public.payment_actions
  for insert
  to authenticated
  with check (
    public.is_group_member(group_id)
    and (payer_id = auth.uid() or payee_id = auth.uid())
  );

-- timeline_events: active members may append events they acted in.
create policy timeline_events_insert_for_group_members
  on public.timeline_events
  for insert
  to authenticated
  with check (
    public.is_group_member(group_id)
    and actor_user_id = auth.uid()
  );

-- inbox_items: a user may create items in their own inbox only.
create policy inbox_items_insert_own
  on public.inbox_items
  for insert
  to authenticated
  with check (user_id = auth.uid());
