import { useSyncExternalStore } from "react";

import { getLedgerVersion, subscribeToLocalLedger } from "./local-ledger";

// Re-renders the calling screen whenever local drafts change so that
// repository reads pick up fresh demo balances.
export function useLedgerVersion(): number {
  return useSyncExternalStore(subscribeToLocalLedger, getLedgerVersion);
}
