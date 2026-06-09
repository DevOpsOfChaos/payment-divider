import { StyleSheet, Text, View } from "react-native";

import type { ScreenContent } from "../navigation/tabs";

export function PlaceholderScreen({
  title,
  purpose,
  placeholderLines,
}: ScreenContent) {
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
});
