import type { PropsWithChildren } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.appShell}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Payment Divider</Text>
          <Text style={styles.headerTitle}>Mock Navigation</Text>
          <Text style={styles.headerCopy}>
            Minimaler Expo-Prototyp für MVP 1A ohne Backend, Auth oder echte
            Ledger-Aktionen.
          </Text>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
});
