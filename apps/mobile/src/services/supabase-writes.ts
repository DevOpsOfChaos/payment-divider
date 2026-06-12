import { splitExpenseEqually } from "@payment-divider/core";
import type { AppSupabaseClient } from "./supabase-client";

import type {
  CreateExpenseInput,
  CreateGroupInput,
  WriteResult,
} from "../data/repositories";

// Ledger-only writes against the locally running Supabase stack. Every insert
// goes through the conservative RLS write policies; nothing here touches
// payment execution, providers, or payment-method storage.

export async function createGroupWithDefaults(
  client: AppSupabaseClient,
  userId: string,
  input: CreateGroupInput,
): Promise<WriteResult> {
  const { data: group, error: groupError } = await client
    .from("groups")
    .insert({
      name: input.name,
      type: input.type,
      default_currency_code: input.defaultCurrency,
      created_by: userId,
    })
    .select("id")
    .single();
  if (groupError || !group) {
    return { ok: false, message: `Gruppe anlegen fehlgeschlagen: ${groupError?.message}` };
  }

  const { error: memberError } = await client.from("group_members").insert({
    group_id: group.id,
    user_id: userId,
    role: "owner",
  });
  if (memberError) {
    return {
      ok: false,
      message: `Creator-Membership fehlgeschlagen: ${memberError.message}`,
    };
  }

  const { error: contextError } = await client.from("group_contexts").insert({
    group_id: group.id,
    name: "Allgemein",
    type: "general",
    default_currency_code: input.defaultCurrency,
  });
  if (contextError) {
    return {
      ok: false,
      message: `Default-Aktivität fehlgeschlagen: ${contextError.message}`,
    };
  }

  return { ok: true, message: `Gruppe "${input.name}" lokal angelegt.` };
}

export async function createExpenseWithShares(
  client: AppSupabaseClient,
  userId: string,
  input: CreateExpenseInput,
): Promise<WriteResult> {
  const { data: expense, error: expenseError } = await client
    .from("expenses")
    .insert({
      group_id: input.groupId,
      context_id: input.contextId,
      amount_minor: input.amountMinor,
      currency_code: input.currency,
      paid_by_user_id: input.paidByUserId,
      expense_date: input.date,
      title: input.title ?? null,
      created_by: userId,
    })
    .select("id")
    .single();
  if (expenseError || !expense) {
    return { ok: false, message: `Ausgabe fehlgeschlagen: ${expenseError?.message}` };
  }

  const shares = splitExpenseEqually({
    amount: input.amountMinor,
    currency: input.currency,
    participantUserIds: input.participantUserIds,
  });
  const { error: sharesError } = await client.from("expense_shares").insert(
    shares.map((share) => ({
      expense_id: expense.id,
      user_id: share.userId,
      amount_minor: share.amount,
      currency_code: share.currency,
      share_type: "equal",
    })),
  );
  if (sharesError) {
    return { ok: false, message: `Shares fehlgeschlagen: ${sharesError.message}` };
  }

  // Timeline append is best effort: if the policy rejects it, the expense
  // itself still stands.
  const { error: timelineError } = await client.from("timeline_events").insert({
    group_id: input.groupId,
    context_id: input.contextId,
    actor_user_id: userId,
    event_type: "expense_created",
    entity_type: "expense",
    entity_id: expense.id,
  });

  return {
    ok: true,
    message: timelineError
      ? `Ausgabe lokal gespeichert (Timeline übersprungen: ${timelineError.message}).`
      : "Ausgabe lokal in Supabase gespeichert.",
  };
}
