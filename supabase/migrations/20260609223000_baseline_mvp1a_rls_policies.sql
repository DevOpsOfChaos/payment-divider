create function public.is_group_member(target_group_id uuid)
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
  );
$$;

create function public.is_context_group_member(target_context_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_contexts gc
    join public.group_members gm
      on gm.group_id = gc.group_id
    where gc.id = target_context_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  );
$$;

create function public.is_expense_group_member(target_expense_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.expenses e
    join public.group_members gm
      on gm.group_id = e.group_id
    where e.id = target_expense_id
      and gm.user_id = auth.uid()
      and gm.left_at is null
  );
$$;

create function public.shares_active_group_with(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members own_membership
    join public.group_members other_membership
      on other_membership.group_id = own_membership.group_id
    where own_membership.user_id = auth.uid()
      and own_membership.left_at is null
      and other_membership.user_id = target_user_id
      and other_membership.left_at is null
  );
$$;

comment on function public.is_group_member(uuid) is
  'Returns true when auth.uid() is an active member of the target group.';

comment on function public.is_context_group_member(uuid) is
  'Returns true when auth.uid() is an active member of the parent group for the target context.';

comment on function public.is_expense_group_member(uuid) is
  'Returns true when auth.uid() is an active member of the parent group for the target expense.';

comment on function public.shares_active_group_with(uuid) is
  'Returns true when auth.uid() and the target user are active members of at least one shared group.';

create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy profiles_select_for_group_members
  on public.profiles
  for select
  to authenticated
  using (public.shares_active_group_with(id));

create policy profiles_update_own
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy friend_connections_select_for_participants
  on public.friend_connections
  for select
  to authenticated
  using (
    requester_user_id = auth.uid()
    or addressee_user_id = auth.uid()
  );

create policy groups_select_for_members
  on public.groups
  for select
  to authenticated
  using (public.is_group_member(id));

create policy group_members_select_for_group_members
  on public.group_members
  for select
  to authenticated
  using (public.is_group_member(group_id));

create policy group_contexts_select_for_group_members
  on public.group_contexts
  for select
  to authenticated
  using (public.is_group_member(group_id));

create policy context_members_select_for_group_members
  on public.context_members
  for select
  to authenticated
  using (public.is_context_group_member(context_id));

create policy member_availability_select_for_group_members
  on public.member_availability
  for select
  to authenticated
  using (public.is_group_member(group_id));

create policy expenses_select_for_group_members
  on public.expenses
  for select
  to authenticated
  using (public.is_group_member(group_id));

create policy expense_shares_select_for_group_members
  on public.expense_shares
  for select
  to authenticated
  using (public.is_expense_group_member(expense_id));

create policy payment_actions_select_for_group_members
  on public.payment_actions
  for select
  to authenticated
  using (public.is_group_member(group_id));

create policy timeline_events_select_for_group_members
  on public.timeline_events
  for select
  to authenticated
  using (public.is_group_member(group_id));

create policy inbox_items_select_own
  on public.inbox_items
  for select
  to authenticated
  using (user_id = auth.uid());
