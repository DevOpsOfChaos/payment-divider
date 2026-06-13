# Demo Script & Mobile QA

Local demo and manual device QA. The app is ledger-only: no payment
execution, no banking, no payment-method storage.

## Start

```powershell
corepack pnpm install
corepack pnpm --filter @payment-divider/mobile start
```

Open in Expo Go (QR code) or press `w` for web preview.

## Walkthrough (5–10 minutes)

1. **Overview** — personal net balance derived from the core ledger functions, receivables/debts, open actions, recent activity.
2. **Groups** — three mock groups (Freundeskreis, WG Berlin, Portugal Reise Crew) with activity balances rolled up from the same ledger data.
3. **Group detail** — switch the view mode inside the Groups tab: activities, members incl. paused member, timeline, quick actions.
4. **Activity detail** — Amsterdam 2026: activity-scoped balance, active vs. paused participants, expenses, ledger-only payment actions.
5. **Record (core of the demo)** — enter an amount in German format (`42,80`), optional title, tap a payer, toggle participants. Max is paused for the date and not preselected, but can be manually included. The equal-split preview updates live via `splitExpenseEqually`. Saving creates a local-only draft listed below the button.
6. **Inbox (second demo highlight)** — interactive ledger-only settlement: mark your own suggested payment as externally settled ("als extern erledigt markieren"), or confirm/reject an incoming marked payment. Balances on Overview/Groups update live; rejecting reopens the balance. All local, nothing is executed.
7. **Profile** — identity rows and visibility-profile concept; payment details are placeholders for MVP 1B.

## Talking points

- Balances on every screen come from one shared core package (`@payment-divider/core`), tested with 19 unit tests.
- Payment actions are ledger-only records; the app never moves money.
- Participant pauses change default selection only, never history or balances.
- Drafts and settlement states are session-only in-memory ledger state: closing the app discards them — persistence and backend wiring are later issues.
- Drafts entered in Record immediately change the Overview, group, and activity balances and appear in the timelines as "Demo-Draft".

## QA checklist: claims, person balance, reminders (1B/1C)

Run on a real device or emulator (Expo Go is acceptable here: no native
features involved; it is still not a production-near development build).
Cover both data modes where noted. Expected behavior per step:

Setup `supabase-local` on an Android emulator: `supabase start`, then
`apps/mobile/.env` with `EXPO_PUBLIC_DATA_SOURCE=supabase-local`,
`EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` plus
`adb reverse tcp:54321 tcp:54321` (10.0.2.2 may be blocked), and the
publishable key printed by `supabase start`. Start the dev session via
Profil tab. Without a session the screen falls back to local-demo data
with a dev hint.

1. **Claims tab opens** (both modes) — person overview, claim form, open
   claims render; in supabase-local the status hint names the data source.
2. **Create external claim** ("Neue Person" + "Extern") — claim appears as
   "privat · nicht geteilt", person becomes a reusable chip.
3. **Counterparty reuse** — create a second claim typing the same name
   (different casing): no duplicate person chip; person overview aggregates
   both claims into one row.
4. **Create invited claim** ("Einladung (später verknüpfen)") — badge
   "Einladung", stays private.
5. **Create linked claim** (existing App-Kontakt chip, e.g. Anna in
   local-demo) — badge "App-Kontakt", optional group shows its name.
6. **Partial payment** — expand claim, record e.g. `1,00`: remaining drops,
   badges "teilweise bezahlt" + "x von y bezahlt", payment listed with
   confirmation state, timeline gets `payment_recorded`.
7. **Acknowledge/dispute** (incoming shared claim; local-demo has "Lukas
   fordert") — "ablehnen · Klärung nötig" sets badge "Klärung nötig";
   "bestätigen" afterwards moves it back to open (debtor takes it over);
   action buttons disappear once acknowledged.
8. **Person overview** — expand a row: gross positions stay visible
   (private claims and group balances with group names), net is only the
   summary line.
9. **History** — archive/settle a claim: it leaves the open set and net,
   appears under "Verlauf (n abgeschlossen)" in the person row and under
   "Abgeschlossen" in the claims list.
10. **Reminder set** — "morgen erinnern": reminder shows date/time, marked
    "(nur für dich)", timeline gets `reminder_set`.
11. **Reminder snooze** — "später erinnern (+1 Tag)": time moves one day
    later.
12. **Reminder disable** — "nicht mehr erinnern": reminder gone, "morgen
    erinnern" available again, timeline gets `reminder_cleared`.
13. **Archive** — "archivieren": claim moves to "Abgeschlossen"; in
    supabase-local the server trigger stamps `archived_at`.
14. **supabase-local end-to-end** — steps 1, 2, 6, 10–13 against the local
    stack with an active dev session; data survives an app reload (unlike
    local-demo).

## QA run 2026-06-12 (executed)

- **Platform**: Android emulator (AVD Pixel 7, Android 15 / API 35,
  x86_64), Expo Go 56, Windows host. Driven via adb; screenshots reviewed
  per step. Expo Go, not a development build — not production-near.
- **Modes**: local-demo (full checklist) and supabase-local (dev session,
  create external claim, partial payment, reminder set/snooze/disable,
  archive, person overview incl. history, mock fallback without session).
- **Result**: all checklist steps pass; amounts, badges, transitions,
  timelines and reminder times behaved as specified above.
- **Findings**:
  - SafeAreaView deprecation warning on start → #122 (migrate to
    react-native-safe-area-context).
  - Cosmetic: history label always "erledigt" (even archived), sessionless
    supabase-local shows a raw load error instead of a "keine Session"
    hint, claim card collapses after each supabase write → #123.
  - Accepted: local-demo state is session-only by design; leaving the Expo
    Go experience discards it (documented talking point above).

## QA run 2026-06-13 (executed) — i18n / ServiceMessage regression pass

After #142 (i18n extraction #144/#145 + ServiceMessage rendering #146) all
UI copy renders through i18next; this run verified the visual regression
surface on a real emulator.

- **Platform**: Android emulator (AVD `qa35`, Pixel 7, Android 15 / API 35,
  x86_64, headless), Expo Go 56, Windows host, adb-driven with reviewed
  screenshots (`.qa-shots/qa147-*`, local only). Expo Go, not a development
  build — not production-near.
- **Modes**: local-demo (full UI sweep) and supabase-local (auth paths,
  dev session, session persistence; local stack running, `adb reverse`).
- **Passed**:
  - App start without any raw i18n key visible; no `claims.xxx`-style
    leakage anywhere across the run.
  - Tab bar labels, shell header/badges, Overview sections (all five).
  - Groups: mode switcher, title/purpose/switcher hint, `{{n}} Mitglieder`
    interpolation, activities label, preview buttons; group/activity detail
    modes render (data-driven).
  - Record: labels + placeholders, validation error ("Betrag muss größer
    als 0 sein."), split preview, save button (local-demo variant), save
    feedback via ServiceMessage ("Demo-Draft lokal gespeichert · nicht
    synchronisiert."), drafts incl. `{{name}}` byline ("Bezahlt von Manu ·
    fließt in die Demo-Salden ein") and default title "Ausgabe".
  - Claims: title/purpose, person section (net labels, open-for/from-you,
    expanded positions with "Gruppensaldo …"/"· Forderung" suffixes),
    lifecycle + counterparty badges, "privat · nicht geteilt",
    `paidOf` interpolation ("15,00 € von 45,00 € bezahlt"), `fällig {{date}}`,
    form labels/chips/placeholders, acknowledge/dispute buttons,
    partial-payment input + button, reminder section ("morgen erinnern"),
    timeline title, archive button.
  - Inbox: settlement cards with both directions ("Du → Max",
    "Anna → Du"), ledger-only line, status/action labels and all three
    action buttons.
  - Profile: AuthCard sign-in and sign-up views (all fields), translated
    auth error via ServiceMessage with detail interpolation ("Anmeldung
    nicht möglich: Invalid login credentials"), DevSessionCard (visible —
    `EXPO_PUBLIC_APP_ENV=local`), dev-session start feedback ("Lokale
    Dev-Session aktiv."), account card after session, sign-out feedback
    ("Abgemeldet.").
  - AsyncStorage session persistence: `am force-stop` + relaunch keeps the
    session; data loads RLS-scoped without re-login ("supabase-local ·
    lokale Daten geladen").
- **Not exercised**: nested ServiceMessage detail (auth wrapping a profile
  bootstrap failure — not easily triggerable from the UI; covered by unit
  tests), real sign-up from the emulator UI (sign-up view rendered; the
  full flow is covered by the 9/9 auth-flow smoke against the local stack),
  shared-alpha build variant (`EXPO_PUBLIC_APP_ENV=shared-alpha` hiding the
  dev card — covered by unit tests).
- **Findings**: no new issues. Known items reconfirmed: SafeAreaView
  deprecation toast (#122); sessionless supabase-local shows the raw
  `permission denied` load hint (anon role has no grants — already tracked
  in #123).
