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

// supabase-local currently resolves to the mock repositories as well; the
// read adapter lands in a follow-up issue. The mode switch and client
// scaffold exist so the adapter can slot in behind the same interfaces.
export const appRepositories: AppRepositories = mockRepositories;
