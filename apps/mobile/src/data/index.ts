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
  getDraftExpenses,
  getDraftExpenseShares,
} from "./local-ledger";
export type { DraftExpenseInput } from "./local-ledger";
export { useLedgerVersion } from "./use-local-ledger";

export const appRepositories: AppRepositories = mockRepositories;
