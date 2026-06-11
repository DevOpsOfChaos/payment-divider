import type { PropsWithChildren } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appShell}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Payment Divider</Text>
          <Text style={styles.headerTitle}>MVP 1A Demo</Text>
          <Text style={styles.headerCopy}>
            Lokale Demo mit Mock-Daten: nichts wird synchronisiert, es gibt kein
            Backend und keine Zahlungsausführung.
          </Text>
          <View style={styles.demoBadgeRow}>
            <Text style={styles.demoBadge}>Nur lokal</Text>
            <Text style={styles.demoBadge}>Nicht synchronisiert</Text>
            <Text style={styles.demoBadge}>Keine Zahlungsausführung</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
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
  demoBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  demoBadge: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6f6658",
    backgroundColor: "#eae3d6",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: "hidden",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
});
