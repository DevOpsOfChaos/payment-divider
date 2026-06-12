import { StyleSheet, Text, TextInput, View } from "react-native";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable } from "react-native";

import {
  appRepositories,
  getDataSourceMode,
  getSupabaseSessionUserId,
  useLedgerVersion,
} from "../data";
import { isDevSessionAllowed } from "../config/app-env";
import { signInWithPassword, signOut, signUpWithPassword } from "../services/auth";
import { endDevSession, startDevSession } from "../services/dev-session";
import type {
  PaymentControlMock,
  PrivacyNoteMock,
  ProfileIdentityRowMock,
  VisibilityProfileMock,
} from "../mock-data/profile";

function AuthCard() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | undefined>(undefined);
  const sessionUserId = getSupabaseSessionUserId();

  async function run(action: () => Promise<{ message: string }>) {
    setBusy(true);
    try {
      const result = await action();
      setMessage(result.message);
    } finally {
      setBusy(false);
    }
  }

  if (sessionUserId) {
    return (
      <View style={styles.subCard}>
        <Text style={styles.subCardTitle}>{t("auth.account.title")}</Text>
        <Text style={styles.subCardDetail}>{t("auth.account.signedIn")}</Text>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => run(signOut)}
          style={styles.devButton}
        >
          <Text style={styles.devButtonText}>{t("auth.account.signOut")}</Text>
        </Pressable>
        {message ? <Text style={styles.subCardDetail}>{message}</Text> : null}
      </View>
    );
  }

  const isSignUp = mode === "sign-up";
  return (
    <View style={styles.subCard}>
      <Text style={styles.subCardTitle}>
        {isSignUp ? t("auth.signUp.title") : t("auth.signIn.title")}
      </Text>
      <Text style={styles.subCardDetail}>{t("auth.form.hint")}</Text>
      <TextInput
        accessibilityLabel={t("auth.form.email")}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder={t("auth.form.email")}
        style={styles.authInput}
        value={email}
      />
      <TextInput
        accessibilityLabel={t("auth.form.password")}
        autoCapitalize="none"
        onChangeText={setPassword}
        placeholder={t("auth.form.password")}
        secureTextEntry
        style={styles.authInput}
        value={password}
      />
      {isSignUp ? (
        <>
          <TextInput
            accessibilityLabel={t("auth.form.displayName")}
            onChangeText={setDisplayName}
            placeholder={t("auth.form.displayName")}
            style={styles.authInput}
            value={displayName}
          />
          <TextInput
            accessibilityLabel={t("auth.form.usernameOptional")}
            autoCapitalize="none"
            onChangeText={setUsername}
            placeholder={t("auth.form.usernameOptional")}
            style={styles.authInput}
            value={username}
          />
        </>
      ) : null}
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() =>
          run(() =>
            isSignUp
              ? signUpWithPassword(email, password, {
                  displayName,
                  username: username.trim() ? username : undefined,
                })
              : signInWithPassword(email, password),
          )
        }
        style={styles.devButton}
      >
        <Text style={styles.devButtonText}>
          {isSignUp ? t("auth.signUp.action") : t("auth.signIn.action")}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => setMode(isSignUp ? "sign-in" : "sign-up")}
      >
        <Text style={styles.authSwitchText}>
          {isSignUp ? t("auth.switch.toSignIn") : t("auth.switch.toSignUp")}
        </Text>
      </Pressable>
      {message ? <Text style={styles.subCardDetail}>{message}</Text> : null}
    </View>
  );
}

function DevSessionCard() {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | undefined>(undefined);
  const sessionUserId = getSupabaseSessionUserId();

  async function run(action: () => Promise<{ message: string }>) {
    setBusy(true);
    try {
      const result = await action();
      setMessage(result.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.subCard}>
      <Text style={styles.subCardTitle}>{t("devSession.title")}</Text>
      <Text style={styles.subCardDetail}>
        {sessionUserId ? t("devSession.active") : t("devSession.none")}
      </Text>
      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => run(sessionUserId ? endDevSession : startDevSession)}
        style={styles.devButton}
      >
        <Text style={styles.devButtonText}>
          {sessionUserId ? t("devSession.end") : t("devSession.start")}
        </Text>
      </Pressable>
      {sessionUserId ? (
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() =>
            run(() =>
              appRepositories.createGroup({
                name: "Lokale Testgruppe",
                type: "friends",
                defaultCurrency: "EUR",
              }),
            )
          }
          style={styles.devButton}
        >
          <Text style={styles.devButtonText}>{t("devSession.createDemoGroup")}</Text>
        </Pressable>
      ) : null}
      {message ? <Text style={styles.subCardDetail}>{message}</Text> : null}
    </View>
  );
}

function IdentityRow({ label, value }: ProfileIdentityRowMock) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function VisibilityCard({ name, detail, status }: VisibilityProfileMock) {
  return (
    <View style={styles.subCard}>
      <View style={styles.row}>
        <Text style={styles.subCardTitle}>{name}</Text>
        {status ? <Text style={styles.pill}>{status}</Text> : null}
      </View>
      <Text style={styles.subCardDetail}>{detail}</Text>
    </View>
  );
}

function PaymentControlRow({ label, detail }: PaymentControlMock) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{detail}</Text>
    </View>
  );
}

function PrivacyNoteRow({ title, detail }: PrivacyNoteMock) {
  return (
    <View style={styles.noteRow}>
      <Text style={styles.noteTitle}>{title}</Text>
      <Text style={styles.noteDetail}>{detail}</Text>
    </View>
  );
}

export function ProfileScreen() {
  useLedgerVersion();
  const PROFILE = appRepositories.getProfile();
  const isSupabaseLocal = getDataSourceMode() === "supabase-local";

  return (
    <View style={styles.screenCard}>
      <Text style={styles.screenTitle}>{PROFILE.title}</Text>
      <Text style={styles.screenPurpose}>{PROFILE.subtitle}</Text>

      {isSupabaseLocal ? <AuthCard /> : null}
      {isSupabaseLocal && isDevSessionAllowed() ? <DevSessionCard /> : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Identität</Text>
        <View style={styles.sectionCard}>
          {PROFILE.identity.map((entry) => (
            <IdentityRow key={entry.label} {...entry} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sichtbarkeitsprofile</Text>
        <View style={styles.sectionList}>
          {PROFILE.visibilityProfiles.map((profile) => (
            <VisibilityCard key={profile.name} {...profile} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Zahlungsdaten später verwalten</Text>
        <View style={styles.sectionCard}>
          {PROFILE.paymentControls.map((entry) => (
            <PaymentControlRow key={entry.label} {...entry} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Datenschutz</Text>
        <View style={styles.sectionCard}>
          {PROFILE.privacyNotes.map((note) => (
            <PrivacyNoteRow key={note.title} {...note} />
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{PROFILE.groupHintTitle}</Text>
        <View style={styles.highlightCard}>
          <Text style={styles.highlightText}>{PROFILE.groupHintDetail}</Text>
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
  sectionCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#f7f1e7",
    borderWidth: 1,
    borderColor: "#e3d8c9",
    gap: 12,
  },
  subCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#f7f1e7",
    borderWidth: 1,
    borderColor: "#e3d8c9",
    gap: 8,
  },
  highlightCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#efe3d2",
    borderWidth: 1,
    borderColor: "#dec8ae",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#2f2922",
  },
  rowValue: {
    flex: 1,
    textAlign: "right",
    fontSize: 14,
    lineHeight: 20,
    color: "#5b5247",
  },
  subCardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#1f1b16",
  },
  subCardDetail: {
    fontSize: 14,
    lineHeight: 20,
    color: "#5b5247",
  },
  pill: {
    maxWidth: "55%",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: "#fffdf8",
    borderWidth: 1,
    borderColor: "#eadfce",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
    color: "#6f6658",
  },
  noteRow: {
    gap: 4,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1f1b16",
  },
  noteDetail: {
    fontSize: 14,
    lineHeight: 20,
    color: "#5b5247",
  },
  highlightText: {
    fontSize: 14,
    lineHeight: 21,
    color: "#4f463b",
  },
  authInput: {
    borderWidth: 1,
    borderColor: "#ded4c5",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#1f1b16",
    backgroundColor: "#fffdf8",
  },
  authSwitchText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6f6658",
    textAlign: "center",
    marginTop: 6,
  },
  devButton: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: "#1f1b16",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  devButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fffaf0",
  },
});
