import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { ActivityDetailScreen } from "./ActivityDetailScreen";
import { GroupDetailScreen } from "./GroupDetailScreen";
import { appRepositories, useLedgerVersion, type BalanceTone } from "../data";

type GroupViewMode = "list" | "group-detail" | "activity-detail";

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

function ModeButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.modeButton, active && styles.modeButtonActive]}
    >
      <Text style={[styles.modeButtonText, active && styles.modeButtonTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function GroupsScreen() {
  const [viewMode, setViewMode] = useState<GroupViewMode>("list");
  useLedgerVersion();
  const GROUPS = appRepositories.getGroups();

  return (
    <View style={styles.screenStack}>
      <View style={styles.modeSwitcher}>
        <ModeButton
          label="Gruppenliste"
          active={viewMode === "list"}
          onPress={() => setViewMode("list")}
        />
        <ModeButton
          label="Gruppendetail"
          active={viewMode === "group-detail"}
          onPress={() => setViewMode("group-detail")}
        />
        <ModeButton
          label="Aktivitätsdetail"
          active={viewMode === "activity-detail"}
          onPress={() => setViewMode("activity-detail")}
        />
      </View>

      {viewMode === "group-detail" ? <GroupDetailScreen /> : null}
      {viewMode === "activity-detail" ? <ActivityDetailScreen /> : null}

      {viewMode === "list" ? (
        <View style={styles.screenCard}>
          <Text style={styles.screenTitle}>Gruppen</Text>
          <Text style={styles.screenPurpose}>
            Dauerhafte Gruppen bleiben der soziale Raum. Aktivitäten darunter
            zeigen konkrete Ledger-Kontexte, ohne Zahlungsausführung im App-Flow.
          </Text>

          <Text style={styles.switcherHint}>
            Lokaler Mock-Umschalter statt echter Navigation, damit die
            Detail-Screens im MVP-1A-Prototyp sichtbar bleiben.
          </Text>

          <View style={styles.groupList}>
            {GROUPS.map((group) => (
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

                {group.name === "Freundeskreis" ? (
                  <View style={styles.previewActions}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setViewMode("group-detail")}
                      style={styles.previewButton}
                    >
                      <Text style={styles.previewButtonText}>Details ansehen</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => setViewMode("activity-detail")}
                      style={styles.previewButtonSecondary}
                    >
                      <Text style={styles.previewButtonSecondaryText}>
                        Aktivität öffnen
                      </Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screenStack: {
    gap: 14,
  },
  modeSwitcher: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  modeButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#f7f1e7",
    borderWidth: 1,
    borderColor: "#e3d8c9",
  },
  modeButtonActive: {
    backgroundColor: "#1f1b16",
    borderColor: "#1f1b16",
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4f463b",
  },
  modeButtonTextActive: {
    color: "#fffaf0",
  },
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
  switcherHint: {
    fontSize: 13,
    lineHeight: 19,
    color: "#6f6658",
    marginBottom: 16,
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
  previewActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  previewButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#1f1b16",
  },
  previewButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fffaf0",
  },
  previewButtonSecondary: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#fffdf8",
    borderWidth: 1,
    borderColor: "#e3d8c9",
  },
  previewButtonSecondaryText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2f2922",
  },
});
