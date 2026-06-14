import "./src/i18n";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppShell } from "./src/components/AppShell";
import { MainTabs } from "./src/navigation/MainTabs";

export default function App() {
  return (
    <SafeAreaProvider>
      <AppShell>
        <StatusBar style="dark" />
        <MainTabs />
      </AppShell>
    </SafeAreaProvider>
  );
}
