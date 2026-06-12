import {
  canTransitionClaimStatus,
  normalizeCounterpartyName,
  type Claim,
  type ClaimEvent,
  type ClaimStatus,
  type EntityId,
} from "@payment-divider/core";
import type { SupabaseClient } from "@supabase/supabase-js";

import type { NewCounterpartyInput } from "../data/claims-repository";
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
  client: SupabaseClient,
  userId: string,
  input: NewCounterpartyInput,
): Promise<{ counterpartyId?: EntityId; error?: string }> {
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
    return { error: `Personensuche fehlgeschlagen: ${selectError.message}` };
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
    return { error: `Person anlegen fehlgeschlagen: ${insertError?.message}` };
  }
  return { counterpartyId: created.id };
}

// Best effort: a rejected history event never rolls back the actual write.
async function appendClaimEvent(
  client: SupabaseClient,
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
  client: SupabaseClient,
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
    return { ok: false, message: `Forderung fehlgeschlagen: ${error?.message}` };
  }

  const eventError = await appendClaimEvent(client, userId, claim.id, "claim_created");
  return {
    ok: true,
    message: eventError
      ? `Forderung lokal in Supabase gespeichert (Timeline übersprungen: ${eventError}).`
      : "Forderung lokal in Supabase gespeichert.",
  };
}

export interface RecordClaimPaymentRowInput {
  claim: Claim;
  amount: number;
  paymentDate: string;
  linked: boolean;
}

export async function recordClaimPayment(
  client: SupabaseClient,
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
    return { ok: false, message: `Teilzahlung fehlgeschlagen: ${error.message}` };
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
      ? `Teilzahlung gespeichert (Timeline übersprungen: ${eventError}).`
      : "Teilzahlung lokal in Supabase gespeichert.",
  };
}

// Validated status change. The client check mirrors core; the database
// trigger from #106 enforces the same transition table server-side, so a
// bypassed client still cannot skip the clarification path.
export async function transitionClaim(
  client: SupabaseClient,
  userId: string,
  claim: Claim,
  to: ClaimStatus,
  eventType: ClaimEvent["eventType"],
): Promise<WriteResult> {
  if (!canTransitionClaimStatus(claim.status, to)) {
    return {
      ok: false,
      message: `Statuswechsel ${claim.status} → ${to} ist nicht erlaubt.`,
    };
  }
  const { data, error } = await client
    .from("claims")
    .update({ status: to })
    .eq("id", claim.id)
    .select("id");
  if (error) {
    return { ok: false, message: `Statuswechsel fehlgeschlagen: ${error.message}` };
  }
  if (!data || data.length === 0) {
    return { ok: false, message: "Statuswechsel nicht erlaubt (RLS)." };
  }

  const eventError = await appendClaimEvent(client, userId, claim.id, eventType);
  return {
    ok: true,
    message: eventError
      ? `Status aktualisiert (Timeline übersprungen: ${eventError}).`
      : "Status lokal in Supabase aktualisiert.",
  };
}
