import { StyleSheet, Text, View } from "react-native";

import { GROUPS_MOCK, type BalanceTone } from "../mock-data/groups";

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

export function GroupsScreen() {
  return (
    <View style={styles.screenCard}>
      <Text style={styles.screenTitle}>Gruppen</Text>
      <Text style={styles.screenPurpose}>
        Dauerhafte Gruppen bleiben der soziale Raum. Aktivitäten darunter
        zeigen konkrete Ledger-Kontexte, ohne Zahlungsausführung im App-Flow.
      </Text>

      <View style={styles.groupList}>
        {GROUPS_MOCK.map((group) => (
          <View key={group.name} style={styles.groupCard}>
            <View style={styles.groupHeader}>
              <View style={styles.groupHeaderCopy}>
                <Text style={styles.groupName}>{group.name}</Text>
                <Text style={styles.groupMeta}>
                  {group.contextLabel} · {group.memberCount} Mitglieder
                </Text>
              </View>
              <Text style={[styles.groupBalance, getBalanceStyle(group.balanceTone)]}>
                {group.balanceSummary}
              </Text>
            </View>

            <Text style={styles.helperText}>{group.helperText}</Text>

            <View style={styles.activitiesSection}>
              <Text style={styles.sectionLabel}>Aktivitäten</Text>
              <View style={styles.activitiesList}>
                {group.activities.map((activity) => (
                  <View key={`${group.name}-${activity.name}`} style={styles.activityRow}>
                    <View style={styles.activitySummary}>
                      <Text style={styles.activityName}>{activity.name}</Text>
                      <Text style={styles.activityMeta}>{activity.summary}</Text>
                    </View>
                    {activity.pauseHint ? (
                      <Text style={styles.pauseHint}>{activity.pauseHint}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          </View>
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
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1f1b16",
    marginBottom: 10,
  },
  screenPurpose: {
    fontSize: 16,
    lineHeight: 24,
    color: "#4f463b",
    marginBottom: 20,
  },
  groupList: {
    gap: 16,
  },
  groupCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: "#f7f1e7",
    borderWidth: 1,
    borderColor: "#e3d8c9",
    gap: 14,
  },
  groupHeader: {
    gap: 10,
  },
  groupHeaderCopy: {
    gap: 4,
  },
  groupName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f1b16",
  },
  groupMeta: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "#6f6658",
  },
  groupBalance: {
    fontSize: 16,
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
    fontSize: 14,
    lineHeight: 21,
    color: "#5b5247",
  },
  activitiesSection: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#6f6658",
  },
  activitiesList: {
    gap: 10,
  },
  activityRow: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#fffdf8",
    borderWidth: 1,
    borderColor: "#eadfce",
    gap: 6,
  },
  activitySummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  activityName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#2f2922",
  },
  activityMeta: {
    flex: 1,
    textAlign: "right",
    fontSize: 14,
    lineHeight: 20,
    color: "#4f463b",
  },
  pauseHint: {
    fontSize: 13,
    lineHeight: 18,
    color: "#8b3a1a",
  },
});
