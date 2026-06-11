import { StyleSheet, Text, View } from "react-native";

import { Pressable } from "react-native";

import {
  appRepositories,
  confirmPaymentAction,
  formatMoney,
  markPaymentActionPaid,
  rejectPaymentAction,
  useLedgerVersion,
  type SettlementActionKind,
  type SettlementItemData,
} from "../data";
import type { InboxItemMock } from "../mock-data/inbox";

const SETTLEMENT_ACTION_LABELS: Record<SettlementActionKind, string> = {
  mark_paid: "als extern erledigt markieren",
  confirm: "bestätigen",
  reject: "ablehnen",
};

function runSettlementAction(item: SettlementItemData, kind: SettlementActionKind): void {
  if (kind === "mark_paid") {
    markPaymentActionPaid(item.action);
  } else if (kind === "confirm") {
    confirmPaymentAction(item.action);
  } else {
    rejectPaymentAction(item.action);
  }
}

function SettlementCard({ item }: { item: SettlementItemData }) {
  const direction =
    item.role === "payer"
      ? `Du → ${item.counterpartyName}`
      : `${item.counterpartyName} → Du`;

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemTitle}>Externe Zahlung · {direction}</Text>
        <Text style={styles.sourcePill}>{item.source}</Text>
      </View>

      <Text style={styles.itemDetail}>
        {formatMoney(item.action.amount)} · Ledger-only: Zahlung passiert außerhalb der App.
      </Text>

      <View style={styles.metaBlock}>
        <Text style={styles.metaLabel}>Status</Text>
        <Text style={styles.metaValue}>{item.statusLabel}</Text>
      </View>

      {item.availableActions.map((kind) => (
        <Pressable
          key={kind}
          accessibilityRole="button"
          onPress={() => runSettlementAction(item, kind)}
          style={styles.settlementButton}
        >
          <Text style={styles.settlementButtonText}>{SETTLEMENT_ACTION_LABELS[kind]}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function InboxCard({ title, detail, source, status, actionLabel }: InboxItemMock) {
  return (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.sourcePill}>{source}</Text>
      </View>

      <Text style={styles.itemDetail}>{detail}</Text>

      <View style={styles.metaBlock}>
        <Text style={styles.metaLabel}>Status</Text>
        <Text style={styles.metaValue}>{status}</Text>
      </View>

      <View style={styles.actionRow}>
        <Text style={styles.actionLabel}>Aktion</Text>
        <Text style={styles.actionValue}>{actionLabel}</Text>
      </View>
    </View>
  );
}

export function InboxScreen() {
  useLedgerVersion();
  const INBOX = appRepositories.getInbox();
  const settlementItems = appRepositories.getSettlementItems();

  return (
    <View style={styles.screenCard}>
      <Text style={styles.screenTitle}>{INBOX.title}</Text>
      <Text style={styles.screenPurpose}>{INBOX.subtitle}</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryText}>{INBOX.summary}</Text>
      </View>

      <View style={styles.section}>
        {settlementItems.map((item) => (
          <SettlementCard key={item.action.id} item={item} />
        ))}
        {INBOX.items.map((item) => (
          <InboxCard key={`${item.title}-${item.source}`} {...item} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenCard: {
    backgroundColor: "#fffdf8",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#ded4c5",
    shadowColor: "#1f1b16",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    elevation: 3,
    gap: 18,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1f1b16",
  },
  screenPurpose: {
    fontSize: 16,
    lineHeight: 24,
    color: "#4f463b",
  },
  summaryCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#f7f1e7",
    borderWidth: 1,
    borderColor: "#e3d8c9",
  },
  summaryText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#5b5247",
  },
  section: {
    gap: 12,
  },
  itemCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#f7f1e7",
    borderWidth: 1,
    borderColor: "#e3d8c9",
    gap: 12,
  },
  itemHeader: {
    gap: 10,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f1b16",
  },
  sourcePill: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#fffdf8",
    borderWidth: 1,
    borderColor: "#eadfce",
    fontSize: 12,
    fontWeight: "700",
    color: "#6f6658",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  itemDetail: {
    fontSize: 15,
    lineHeight: 22,
    color: "#2f2922",
  },
  metaBlock: {
    gap: 4,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6f6658",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  metaValue: {
    fontSize: 14,
    lineHeight: 20,
    color: "#8b3a1a",
  },
  actionRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#eadfce",
    gap: 4,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6f6658",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  actionValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f1b16",
  },
  settlementButton: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#1f1b16",
    alignItems: "center",
    justifyContent: "center",
  },
  settlementButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fffaf0",
  },
});
