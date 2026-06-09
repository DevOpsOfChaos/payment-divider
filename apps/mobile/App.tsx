import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type TabId = "overview" | "groups" | "record" | "inbox" | "profile";

interface ScreenContent {
  title: string;
  purpose: string;
  placeholderLines: string[];
}

interface TabDefinition {
  id: TabId;
  label: string;
  screen: ScreenContent;
}

const TABS: TabDefinition[] = [
  {
    id: "overview",
    label: "Overview",
    screen: {
      title: "Overview",
      purpose: "Personal ledger summary across all groups.",
      placeholderLines: [
        "Du bekommst: 84,50 €",
        "Du schuldest: 12,00 €",
        "Offene Aktionen: 2",
      ],
    },
  },
  {
    id: "groups",
    label: "Groups",
    screen: {
      title: "Groups",
      purpose: "Long-lived social spaces with activities inside them.",
      placeholderLines: ["Freundeskreis", "WG Berlin", "Portugal Reise Crew"],
    },
  },
  {
    id: "record",
    label: "Record",
    screen: {
      title: "Record",
      purpose: "Fast expense entry: amount, group/activity, payer, participants, save.",
      placeholderLines: [
        "Betrag",
        "Gruppe / Aktivität",
        "Teilnehmer",
        "Ausgabe speichern",
      ],
    },
  },
  {
    id: "inbox",
    label: "Inbox",
    screen: {
      title: "Inbox",
      purpose: "Action items only, not raw history.",
      placeholderLines: [
        "Zahlung bestätigen",
        "Einladung annehmen",
        "Später: Sync-Konflikt prüfen",
      ],
    },
  },
  {
    id: "profile",
    label: "Profile",
    screen: {
      title: "Profile",
      purpose: "Personal settings, visibility, and later payment-method controls.",
      placeholderLines: [
        "Anzeigename",
        "Sichtbarkeitsprofile",
        "Zahlungsdaten später verwalten",
      ],
    },
  },
];

function PlaceholderScreen({ title, purpose, placeholderLines }: ScreenContent) {
  return (
    <View style={styles.screenCard}>
      <Text style={styles.screenTitle}>{title}</Text>
      <Text style={styles.screenPurpose}>{purpose}</Text>
      <View style={styles.placeholderList}>
        {placeholderLines.map((line) => (
          <View key={line} style={styles.placeholderRow}>
            <Text style={styles.placeholderBullet}>•</Text>
            <Text style={styles.placeholderText}>{line}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function App() {
  const [activeTabId, setActiveTabId] = useState<TabId>("overview");
  const activeTab = TABS.find((tab) => tab.id === activeTabId) ?? TABS[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.appShell}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Payment Divider</Text>
          <Text style={styles.headerTitle}>Mock Navigation</Text>
          <Text style={styles.headerCopy}>
            Minimaler Expo-Prototyp fur MVP 1A ohne Backend, Auth oder echte
            Ledger-Aktionen.
          </Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <PlaceholderScreen {...activeTab.screen} />
        </ScrollView>

        <View style={styles.tabBar}>
          {TABS.map((tab) => {
            const isActive = tab.id === activeTab.id;

            return (
              <Pressable
                key={tab.id}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
                onPress={() => setActiveTabId(tab.id)}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
              >
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f3efe7",
  },
  appShell: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: "#f3efe7",
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#6f6658",
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: "700",
    color: "#1f1b16",
    marginBottom: 8,
  },
  headerCopy: {
    fontSize: 15,
    lineHeight: 22,
    color: "#4f463b",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
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
  placeholderList: {
    gap: 12,
  },
  placeholderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#f7f1e7",
  },
  placeholderBullet: {
    fontSize: 16,
    lineHeight: 22,
    color: "#b15928",
    marginRight: 10,
  },
  placeholderText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    color: "#2f2922",
  },
  tabBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: "#ded4c5",
    backgroundColor: "#fffaf0",
  },
  tabButton: {
    minWidth: "31%",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#ded4c5",
    backgroundColor: "#f7f1e7",
  },
  tabButtonActive: {
    backgroundColor: "#1f1b16",
    borderColor: "#1f1b16",
  },
  tabLabel: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: "#4f463b",
  },
  tabLabelActive: {
    color: "#fffaf0",
  },
});
