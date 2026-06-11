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

export function GroupDetailScreen() {
  useLedgerVersion();
  const GROUP_DETAIL = appRepositories.getGroupDetail();

  return (
    <View style={styles.screenCard}>
      <Text style={styles.screenTitle}>{GROUP_DETAIL.title}</Text>
      <Text style={styles.screenPurpose}>{GROUP_DETAIL.subtitle}</Text>

      <View style={styles.summaryCard}>
        <Text style={styles.eyebrow}>{GROUP_DETAIL.balanceTitle}</Text>
        <Text
          style={[
            styles.balanceSummary,
            getBalanceStyle(GROUP_DETAIL.balanceTone),
          ]}
        >
          {GROUP_DETAIL.balanceSummary}
        </Text>
        <Text style={styles.helperText}>{GROUP_DETAIL.balanceHint}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{GROUP_DETAIL.activitiesTitle}</Text>
        <View style={styles.sectionList}>
          {GROUP_DETAIL.activities.map((activity) => (
            <View key={activity.name} style={styles.listCard}>
              <View style={styles.rowHeader}>
                <Text style={styles.rowTitle}>{activity.name}</Text>
                <Text
                  style={[
                    styles.rowAmount,
                    getBalanceStyle(activity.balanceTone),
                  ]}
                >
                  {activity.balanceSummary}
                </Text>
              </View>
              <Text style={styles.rowDetail}>{activity.detail}</Text>
              {activity.pauseHint ? (
                <Text style={styles.warningText}>{activity.pauseHint}</Text>
              ) : null}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{GROUP_DETAIL.membersTitle}</Text>
        <Text style={styles.sectionHint}>{GROUP_DETAIL.membersHint}</Text>
        <View style={styles.sectionList}>
          {GROUP_DETAIL.members.map((member) => (
            <View key={member.name} style={styles.listCard}>
              <View style={styles.rowHeader}>
                <Text style={styles.rowTitle}>{member.name}</Text>
                <Text
                  style={[
                    styles.memberStatus,
                    member.statusTone === "warning" && styles.warningText,
                  ]}
                >
                  {member.status}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{GROUP_DETAIL.timelineTitle}</Text>
        <Text style={styles.sectionHint}>{GROUP_DETAIL.timelineHint}</Text>
        <View style={styles.sectionList}>
          {GROUP_DETAIL.timeline.map((item) => (
            <View key={`${item.actor}-${item.event}-${item.dateLabel}`} style={styles.listCard}>
              <View style={styles.rowHeader}>
                <Text style={styles.rowTitle}>
                  {item.actor} {item.event}
                </Text>
                <Text style={styles.dateLabel}>{item.dateLabel}</Text>
              </View>
              {item.source ? <Text style={styles.rowDetail}>{item.source}</Text> : null}
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{GROUP_DETAIL.quickActionsTitle}</Text>
        <View style={styles.actionGrid}>
          {GROUP_DETAIL.quickActions.map((action) => (
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
    maxWidth: "45%",
    textAlign: "right",
    fontSize: 14,
    fontWeight: "700",
  },
  rowDetail: {
    fontSize: 14,
    lineHeight: 20,
    color: "#5b5247",
  },
  memberStatus: {
    maxWidth: "55%",
    textAlign: "right",
    fontSize: 13,
    lineHeight: 18,
    color: "#4f463b",
  },
  warningText: {
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
