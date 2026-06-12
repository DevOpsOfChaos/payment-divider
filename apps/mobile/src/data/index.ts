// Single entry point for screen data. Screens depend on these interfaces,
// not on individual mock-data modules; swapping in a real backend later only
// changes the repository implementation behind `appRepositories`.
import { mockRepositories } from "./mock-repositories";
import type { AppRepositories } from "./repositories";

export type {
  AppRepositories,
  OverviewData,
  RecordParticipantOption,
  RecordPersonOption,
  RecordSetupData,
} from "./repositories";
export { formatMoney, getBalanceTone, formatBalanceLabel } from "../mock-data/balance-derived";
export type { BalanceTone } from "../mock-data/groups";
export {
  addDraftExpense,
  clearDraftExpenses,
  confirmPaymentAction,
  getDraftExpenses,
  getDraftExpenseShares,
  markPaymentActionPaid,
  rejectPaymentAction,
} from "./local-ledger";
export type { DraftExpenseInput } from "./local-ledger";
export type {
  SettlementActionKind,
  SettlementItemData,
  SettlementRole,
} from "./repositories";
export { useLedgerVersion } from "./use-local-ledger";

export {
  getDataSourceMode,
  getSupabaseLocalConfigHint,
  type DataSourceMode,
} from "../config/data-source";

import { getDataSourceMode as resolveMode } from "../config/data-source";
import type { ClaimsRepository as ClaimsRepositoryType } from "./claims-repository";
import { mockClaimsRepository } from "./claims-store";
import { supabaseClaimsRepository } from "./supabase-claims";
import { supabaseRepositories } from "./supabase-repositories";

export {
  getSupabaseDataStatusHint,
  getSupabaseSessionUserId,
  reloadSupabaseData,
} from "./supabase-repositories";
export { reloadSupabaseClaims } from "./supabase-claims";
export type {
  AddClaimInput,
  ClaimGroupOption,
  ClaimListItem,
  ClaimsOverviewData,
  ClaimsRepository,
  NewCounterpartyInput,
} from "./claims-repository";

// supabase-local falls back to mock data with a dev hint while unconfigured
// or loading.
export const appRepositories: AppRepositories =
  resolveMode() === "supabase-local" ? supabaseRepositories : mockRepositories;

// Claims (private ledger notes) behind the same mode switch. The supabase
// adapter reads/writes claims, counterparties and claim payments; the person
// balance overview stays derived in the client via core.
export const claimsData: ClaimsRepositoryType =
  resolveMode() === "supabase-local" ? supabaseClaimsRepository : mockClaimsRepository;
