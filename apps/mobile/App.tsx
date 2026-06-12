import "./src/i18n";
import { StatusBar } from "expo-status-bar";
import { AppShell } from "./src/components/AppShell";
import { MainTabs } from "./src/navigation/MainTabs";

export default function App() {
  return (
    <AppShell>
      <StatusBar style="dark" />
      <MainTabs />
    </AppShell>
  );
}
