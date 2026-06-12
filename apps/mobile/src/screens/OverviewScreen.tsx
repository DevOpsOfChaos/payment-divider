import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

import {
  appRepositories,
  useLedgerVersion,
  type BalanceTone,
  type OverviewData,
} from "../data";

type OverviewBalanceRow = OverviewData["receivables"][number];

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

function BalanceRow({ person, amount, source, statusHint }: OverviewBalanceRow) {
  return (
    <View style={styles.listRow}>
      <View style={styles.listRowCopy}>
        <Text style={styles.personName}>{person}</Text>
        <Text style={styles.rowMeta}>{source}</Text>
      </View>
      <View style={styles.amountBlock}>
        <Text style={styles.amountText}>{amount}</Text>
        {statusHint ? <Text style={styles.statusHint}>{statusHint}</Text> : null}
      </View>
    </View>
  );
}

export function OverviewScreen() {
  const { t } = useTranslation();
  useLedgerVersion();
  const overview = appRepositories.getOverview();

  return (
    <View style={styles.screenCard}>
      <Text style={styles.screenTitle}>{t("overview.title")}</Text>
      <Text style={styles.screenPurpose}>{t("overview.purpose")}</Text>

      <View style={styles.balanceCard}>
        <Text style={styles.eyebrow}>{overview.balance.heading}</Text>
        <Text
          style={[styles.balanceAmount, getBalanceStyle(overview.balance.tone)]}
        >
          {overview.balance.amountLabel}
        </Text>
        <Text style={styles.helperText}>{overview.balance.helperText}</Text>
        <Text style={styles.balanceBreakdown}>{overview.balance.breakdown}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("overview.sections.receivables")}</Text>
        <View style={styles.sectionList}>
          {overview.receivables.map((entry) => (
            <BalanceRow key={`${entry.person}-${entry.source}`} {...entry} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("overview.sections.debts")}</Text>
        <View style={styles.sectionList}>
          {overview.debts.map((entry) => (
            <BalanceRow key={`${entry.person}-${entry.source}`} {...entry} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("overview.sections.openActions")}</Text>
        <View style={styles.sectionList}>
          {overview.openActions.map((item) => (
            <View key={item.label} style={styles.infoRow}>
              <Text style={styles.infoLabel}>{item.label}</Text>
              <Text style={styles.infoDetail}>{item.detail}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("overview.sections.recentActivity")}</Text>
        <View style={styles.sectionList}>
          {overview.recentActivity.map((item) => (
            <View key={`${item.actor}-${item.event}-${item.dateLabel}`} style={styles.infoRow}>
              <View style={styles.timelineHeader}>
                <Text style={styles.infoLabel}>
                  {item.actor} {item.event}
                </Text>
                <Text style={styles.timelineDate}>{item.dateLabel}</Text>
              </View>
              <Text style={styles.infoDetail}>{item.source}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("overview.sections.groupAttention")}</Text>
        <View style={styles.sectionList}>
          {overview.groupAttention.map((item) => (
            <View key={`${item.group}-${item.reason}`} style={styles.infoRow}>
              <View style={styles.timelineHeader}>
                <Text style={styles.infoLabel}>{item.group}</Text>
                {item.amountHint ? <Text style={styles.timelineDate}>{item.amountHint}</Text> : null}
              </View>
              <Text style={styles.infoDetail}>{item.reason}</Text>
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
  balanceCard: {
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
  balanceAmount: {
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
  balanceBreakdown: {
    fontSize: 13,
    lineHeight: 20,
    color: "#6f6658",
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f1b16",
  },
  sectionList: {
    gap: 10,
  },
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#f7f1e7",
    borderWidth: 1,
    borderColor: "#eadfce",
  },
  listRowCopy: {
    flex: 1,
    gap: 4,
  },
  personName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2f2922",
  },
  rowMeta: {
    fontSize: 14,
    lineHeight: 20,
    color: "#5b5247",
  },
  amountBlock: {
    alignItems: "flex-end",
    gap: 4,
  },
  amountText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1f1b16",
  },
  statusHint: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: "right",
    color: "#8b3a1a",
  },
  infoRow: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#f7f1e7",
    borderWidth: 1,
    borderColor: "#eadfce",
    gap: 6,
  },
  infoLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2f2922",
  },
  infoDetail: {
    fontSize: 14,
    lineHeight: 20,
    color: "#5b5247",
  },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 12,
  },
  timelineDate: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6f6658",
  },
});
