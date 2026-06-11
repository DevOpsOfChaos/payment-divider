import { StyleSheet, Text, View } from "react-native";

import { appRepositories, useLedgerVersion, type BalanceTone } from "../data";

function getBalanceStyle(tone: BalanceTone) {
  switch (tone) {
    case "positive":
      return styles.balancePositive;
    case "negative":
      return styles.balanceNegative;
    case "settled":
      return styles.balanceSettled;
    default:
      return styles.balanceSettled;
  }
}

export function ActivityDetailScreen() {
  useLedgerVersion();
  const ACTIVITY_DETAIL = appRepositories.getActivityDetail();

  return (
    <View style={styles.screenCard}>
      <Text style={styles.screenTitle}>{ACTIVITY_DETAIL.title}</Text>
      <Text style={styles.screenPurpose}>{ACTIVITY_DETAIL.subtitle}</Text>
      <Text style={styles.periodLabel}>{ACTIVITY_DETAIL.periodLabel}</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.eyebrow}>{ACTIVITY_DETAIL.balanceTitle}</Text>
        <Text
          style={[
            styles.balanceSummary,
            getBalanceStyle(ACTIVITY_DETAIL.balanceTone),
          ]}
        >
          {ACTIVITY_DETAIL.balanceSummary}
        </Text>
        <Text style={styles.helperText}>{ACTIVITY_DETAIL.balanceHint}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {ACTIVITY_DETAIL.activeParticipantsTitle}
        </Text>
        <Text style={styles.sectionHint}>
          {ACTIVITY_DETAIL.activeParticipantsHint}
        </Text>
        <View style={styles.sectionList}>
          {ACTIVITY_DETAIL.activeParticipants.map((participant) => (
            <View key={participant.name} style={styles.listCard}>
              <Text style={styles.rowTitle}>{participant.name}</Text>
              {participant.detail ? (
                <Text style={styles.rowDetail}>{participant.detail}</Text>
              ) : null}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {ACTIVITY_DETAIL.pausedParticipantsTitle}
        </Text>
        <Text style={styles.sectionHint}>
          {ACTIVITY_DETAIL.pausedParticipantsHint}
        </Text>
        <View style={styles.sectionList}>
          {ACTIVITY_DETAIL.pausedParticipants.map((participant) => (
            <View key={participant.name} style={styles.listCard}>
              <Text style={styles.rowTitle}>{participant.name}</Text>
              {participant.detail ? (
                <Text style={styles.warningText}>{participant.detail}</Text>
              ) : null}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{ACTIVITY_DETAIL.expensesTitle}</Text>
        <Text style={styles.sectionHint}>{ACTIVITY_DETAIL.expensesHint}</Text>
        <View style={styles.sectionList}>
          {ACTIVITY_DETAIL.expenses.map((expense) => (
            <View key={expense.label} style={styles.listCard}>
              <View style={styles.rowHeader}>
                <Text style={styles.rowTitle}>{expense.label}</Text>
                <Text style={styles.rowAmount}>{expense.amount}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {ACTIVITY_DETAIL.paymentActionsTitle}
        </Text>
        <Text style={styles.sectionHint}>
          {ACTIVITY_DETAIL.paymentActionsHint}
        </Text>
        <View style={styles.sectionList}>
          {ACTIVITY_DETAIL.paymentActions.map((action) => (
            <View key={`${action.person}-${action.amount}`} style={styles.listCard}>
              <View style={styles.rowHeader}>
                <Text style={styles.rowTitle}>{action.person}</Text>
                <Text style={styles.rowAmount}>{action.amount}</Text>
              </View>
              <Text style={styles.rowDetail}>{action.status}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{ACTIVITY_DETAIL.timelineTitle}</Text>
        <View style={styles.sectionList}>
          {ACTIVITY_DETAIL.timeline.map((item) => (
            <View key={`${item.actor}-${item.event}`} style={styles.listCard}>
              <View style={styles.rowHeader}>
                <Text style={styles.rowTitle}>
                  {item.actor} {item.event}
                </Text>
                {item.dateLabel ? <Text style={styles.dateLabel}>{item.dateLabel}</Text> : null}
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{ACTIVITY_DETAIL.quickActionsTitle}</Text>
        <View style={styles.actionGrid}>
          {ACTIVITY_DETAIL.quickActions.map((action) => (
            <View key={action.label} style={styles.actionPill}>
              <Text style={styles.actionText}>{action.label}</Text>
            </View>
          ))}
        </View>
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
  periodLabel: {
    fontSize: 13,
    lineHeight: 19,
    color: "#6f6658",
  },
  summaryCard: {
    padding: 18,
    borderRadius: 18,
    backgroundColor: "#f7f1e7",
    borderWidth: 1,
    borderColor: "#e3d8c9",
    gap: 8,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.9,
    textTransform: "uppercase",
    color: "#6f6658",
  },
  balanceSummary: {
    fontSize: 26,
    fontWeight: "700",
  },
  balancePositive: {
    color: "#236a4b",
  },
  balanceNegative: {
    color: "#8b3a1a",
  },
  balanceSettled: {
    color: "#4f463b",
  },
  helperText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#4f463b",
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f1b16",
  },
  sectionHint: {
    fontSize: 13,
    lineHeight: 19,
    color: "#5b5247",
  },
  sectionList: {
    gap: 10,
  },
  listCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#f7f1e7",
    borderWidth: 1,
    borderColor: "#eadfce",
    gap: 6,
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 12,
  },
  rowTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#2f2922",
  },
  rowAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f1b16",
  },
  rowDetail: {
    fontSize: 14,
    lineHeight: 20,
    color: "#5b5247",
  },
  warningText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#8b3a1a",
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6f6658",
  },
  actionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  actionPill: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#1f1b16",
  },
  actionText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fffaf0",
  },
});
