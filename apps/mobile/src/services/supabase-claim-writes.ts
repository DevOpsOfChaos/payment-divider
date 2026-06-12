import {
  canTransitionClaimStatus,
  normalizeCounterpartyName,
  snoozeReminder,
  type Claim,
  type ClaimEvent,
  type ClaimReminder,
  type ClaimStatus,
  type EntityId,
} from "@payment-divider/core";
import type { AppSupabaseClient } from "./supabase-client";

import type { NewCounterpartyInput } from "../data/claims-repository";
import { msg, type ServiceMessage } from "../i18n/service-message";
import type { WriteResult } from "../data/repositories";

// Claims writes against the locally running Supabase stack. Claims stay
// ledger notes: amounts and statuses only, no payment execution and no
// payment-method storage. RLS plus the claim triggers (status transition
// table, counterparty status-only rule, immutable payment cores) are the
// authority — this module only avoids round trips for clearly invalid input.

// Reuses an existing counterparty of the owner with the same normalized name
// (creation-time reuse, mirroring the local-demo store); otherwise inserts a
// new private person record.
export async function getOrCreateCounterpartyId(
  client: AppSupabaseClient,
  userId: string,
  input: NewCounterpartyInput,
): Promise<{ counterpartyId?: EntityId; error?: ServiceMessage }> {
  const normalized = normalizeCounterpartyName(input.displayName);
  const { data: existing, error: selectError } = await client
    .from("counterparties")
    .select("id")
    .eq("owner_user_id", userId)
    .eq("normalized_name", normalized)
    .is("archived_at", null)
    .limit(1)
    .maybeSingle();
  if (selectError) {
    return { error: msg("service.claims.personSearchFailed", { detail: selectError.message }) };
  }
  if (existing) {
    return { counterpartyId: existing.id };
  }

  const { data: created, error: insertError } = await client
    .from("counterparties")
    .insert({
      owner_user_id: userId,
      kind: input.kind,
      display_name: input.displayName.trim(),
      normalized_name: normalized,
    })
    .select("id")
    .single();
  if (insertError || !created) {
    return { error: msg("service.claims.personCreateFailedDetail", { detail: String(insertError?.message) }) };
  }
  return { counterpartyId: created.id };
}

// Best effort: a rejected history event never rolls back the actual write.
async function appendClaimEvent(
  client: AppSupabaseClient,
  userId: string,
  claimId: EntityId,
  eventType: ClaimEvent["eventType"],
): Promise<string | undefined> {
  const { error } = await client.from("claim_events").insert({
    claim_id: claimId,
    actor_user_id: userId,
    event_type: eventType,
  });
  return error?.message;
}

export interface CreateClaimRowInput {
  direction: Claim["direction"];
  counterpartyId: EntityId;
  counterpartyKind: string;
  amount: number;
  purpose?: string;
  claimDate: string;
  dueDate?: string;
  groupId?: EntityId;
}

export async function createClaim(
  client: AppSupabaseClient,
  userId: string,
  input: CreateClaimRowInput,
): Promise<WriteResult> {
  // New claims against linked persons are shared by default; claims against
  // unlinked persons stay private (mirrors the local-demo store).
  const linked = input.counterpartyKind === "app_user";
  const { data: claim, error } = await client
    .from("claims")
    .insert({
      creator_user_id: userId,
      direction: input.direction,
      counterparty_id: input.counterpartyId,
      shared_with_counterparty: linked,
      amount_minor: input.amount,
      currency_code: "EUR",
      purpose: input.purpose ?? null,
      claim_date: input.claimDate,
      due_date: input.dueDate ?? null,
      group_id: input.groupId ?? null,
      status: linked ? "linked_open" : "private_open",
    })
    .select("id")
    .single();
  if (error || !claim) {
    return { ok: false, message: msg("service.claims.claimFailed", { detail: String(error?.message) }) };
  }

  const eventError = await appendClaimEvent(client, userId, claim.id, "claim_created");
  return {
    ok: true,
    message: eventError
      ? msg("service.claims.claimSavedTimelineSkipped", { detail: eventError })
      : msg("service.claims.claimSavedSupabase"),
  };
}

export interface RecordClaimPaymentRowInput {
  claim: Claim;
  amount: number;
  paymentDate: string;
  linked: boolean;
}

export async function recordClaimPayment(
  client: AppSupabaseClient,
  userId: string,
  input: RecordClaimPaymentRowInput,
): Promise<WriteResult> {
  // On shared linked claims a payment recorded by the debtor waits for the
  // creditor; the creditor's own records count immediately. Confirmation is a
  // ledger state, never a provider verification.
  const needsConfirmation = input.linked && input.claim.creatorUserId !== userId;
  const { error } = await client.from("claim_payments").insert({
    claim_id: input.claim.id,
    amount_minor: input.amount,
    currency_code: input.claim.currency,
    payment_date: input.paymentDate,
    recorded_by: userId,
    confirmation_status: needsConfirmation ? "pending_confirmation" : "confirmed",
  });
  if (error) {
    return { ok: false, message: msg("service.claims.paymentFailed", { detail: error.message }) };
  }

  const eventError = await appendClaimEvent(
    client,
    userId,
    input.claim.id,
    "payment_recorded",
  );
  return {
    ok: true,
    message: eventError
      ? msg("service.claims.paymentSavedTimelineSkipped", { detail: eventError })
      : msg("service.claims.paymentSavedSupabase"),
  };
}

// Personal reminder rows: self-set metadata only. RLS keeps them owner-only
// (insert/select/update with user_id = auth.uid()); nothing here ever sends
// anything to the other side.

export async function insertClaimReminder(
  client: AppSupabaseClient,
  userId: string,
  claimId: EntityId,
  remindAt: string,
): Promise<WriteResult> {
  const { error } = await client.from("claim_reminders").insert({
    claim_id: claimId,
    user_id: userId,
    remind_at: remindAt,
  });
  if (error) {
    return { ok: false, message: msg("service.claims.reminderFailed", { detail: error.message }) };
  }
  const eventError = await appendClaimEvent(client, userId, claimId, "reminder_set");
  return {
    ok: true,
    message: eventError
      ? msg("service.claims.reminderSetTimelineSkipped", { detail: eventError })
      : msg("service.claims.reminderSet"),
  };
}

// Snooze must move the reminder later — validated via the core helper before
// the row update, so the adapter and the local-demo store reject the same
// inputs.
export async function snoozeClaimReminderRow(
  client: AppSupabaseClient,
  reminder: ClaimReminder,
  remindAt: string,
): Promise<WriteResult> {
  let snoozed: ClaimReminder;
  try {
    snoozed = snoozeReminder(reminder, remindAt);
  } catch (error) {
    return { ok: false, message: msg("service.common.raw", { detail: error instanceof Error ? error.message : String(error) }) };
  }
  const { error } = await client
    .from("claim_reminders")
    .update({ remind_at: snoozed.remindAt, disabled_at: null })
    .eq("id", reminder.id);
  if (error) {
    return { ok: false, message: msg("service.claims.snoozeFailed", { detail: error.message }) };
  }
  return { ok: true, message: msg("service.claims.reminderSnoozed") };
}

export async function disableClaimReminderRow(
  client: AppSupabaseClient,
  userId: string,
  reminder: ClaimReminder,
  disabledAt: string,
): Promise<WriteResult> {
  const { error } = await client
    .from("claim_reminders")
    .update({ disabled_at: disabledAt })
    .eq("id", reminder.id);
  if (error) {
    return { ok: false, message: msg("service.claims.disableFailed", { detail: error.message }) };
  }
  const eventError = await appendClaimEvent(
    client,
    userId,
    reminder.claimId,
    "reminder_cleared",
  );
  return {
    ok: true,
    message: eventError
      ? msg("service.claims.reminderDisabledTimelineSkipped", { detail: eventError })
      : msg("service.claims.reminderDisabled"),
  };
}

// Validated status change. The client check mirrors core; the database
// trigger from #106 enforces the same transition table server-side, so a
// bypassed client still cannot skip the clarification path.
export async function transitionClaim(
  client: AppSupabaseClient,
  userId: string,
  claim: Claim,
  to: ClaimStatus,
  eventType: ClaimEvent["eventType"],
): Promise<WriteResult> {
  if (!canTransitionClaimStatus(claim.status, to)) {
    return {
      ok: false,
      message: msg("service.claims.transitionPairNotAllowed", { from: claim.status, to }),
    };
  }
  const { data, error } = await client
    .from("claims")
    .update({ status: to })
    .eq("id", claim.id)
    .select("id");
  if (error) {
    return { ok: false, message: msg("service.claims.transitionFailed", { detail: error.message }) };
  }
  if (!data || data.length === 0) {
    return { ok: false, message: msg("service.claims.transitionRejectedRls") };
  }

  const eventError = await appendClaimEvent(client, userId, claim.id, eventType);
  return {
    ok: true,
    message: eventError
      ? msg("service.claims.statusUpdatedTimelineSkipped", { detail: eventError })
      : msg("service.claims.statusUpdatedSupabase"),
  };
}
