-- Reconcile SQL check-constraint values with the core TypeScript domain unions
-- in packages/core/src/domain-types.ts. The TypeScript unions are the domain
-- source of truth; this follow-up migration aligns the database without
-- editing earlier migrations.
--
-- Mapping of legacy values (tables are empty in fresh setups; updates are
-- defensive for databases that already replayed earlier migrations with data):
--   friend_connections.status: 'rejected'    -> 'declined'
--   groups.type:               'other'       -> 'custom'
--   group_contexts.type:       'recurring'   -> 'custom', 'other' -> 'custom'
--   member_availability.mode:  'unavailable' -> 'paused'
--   expense_shares.share_type: 'exact'       -> 'fixed'
--   group_members.role:        unchanged values, 'owner' added

alter table public.friend_connections
  drop constraint if exists friend_connections_status_check;

update public.friend_connections
  set status = 'declined'
  where status = 'rejected';

alter table public.friend_connections
  add constraint friend_connections_status_check check (
    status in ('pending', 'accepted', 'declined', 'blocked')
  );

alter table public.groups
  drop constraint if exists groups_type_check;

update public.groups
  set type = 'custom'
  where type = 'other';

alter table public.groups
  add constraint groups_type_check check (
    type in ('friends', 'trip', 'shared_flat', 'couple', 'family', 'event', 'custom')
  );

alter table public.group_members
  drop constraint if exists group_members_role_check;

alter table public.group_members
  add constraint group_members_role_check check (
    role in ('owner', 'admin', 'member')
  );

alter table public.group_contexts
  drop constraint if exists group_contexts_type_check;

update public.group_contexts
  set type = 'custom'
  where type in ('recurring', 'other');

alter table public.group_contexts
  add constraint group_contexts_type_check check (
    type in ('general', 'trip', 'event', 'household', 'purchase', 'custom')
  );

alter table public.member_availability
  drop constraint if exists member_availability_mode_check;

update public.member_availability
  set mode = 'paused'
  where mode = 'unavailable';

alter table public.member_availability
  add constraint member_availability_mode_check check (
    mode in ('paused', 'available')
  );

alter table public.expense_shares
  drop constraint if exists expense_shares_share_type_check;

update public.expense_shares
  set share_type = 'fixed'
  where share_type = 'exact';

alter table public.expense_shares
  add constraint expense_shares_share_type_check check (
    share_type in ('equal', 'fixed')
  );
