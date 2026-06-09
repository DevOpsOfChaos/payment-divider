import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PlaceholderScreen } from "../screens/PlaceholderScreen";
import { TABS, type TabId } from "./tabs";

export function MainTabs() {
  const [activeTabId, setActiveTabId] = useState<TabId>("overview");
  const activeTab = TABS.find((tab) => tab.id === activeTabId) ?? TABS[0];
  const ActiveScreen = activeTab.component;

  return (
    <>
      {ActiveScreen ? <ActiveScreen /> : <PlaceholderScreen {...activeTab.screen} />}

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
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#ded4c5",
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
