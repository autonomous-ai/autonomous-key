# NodeXit

> Tap an NFC tag to lock yourself out of distracting apps. Tap it again to unlock.

NodeXit is a self-discipline app blocker that uses a physical NFC tag as the only key. You pick apps to block, scan the tag to lock, scan again to unlock. The physical scan is intentional friction — you can't impulse-bypass yourself by tapping a button.

Built with **React Native + Expo** as a cross-platform app with native modules per platform.

| Platform | Blocking mechanism                                            | Picker UX                       | Custom block screen      |
| -------- | ------------------------------------------------------------- | ------------------------------- | ------------------------ |
| Android  | `AccessibilityService` — overlay over blocked apps            | Real app list with icons        | ✅ Custom (emoji + timer) |
| iOS      | `FamilyControls` + `ManagedSettings.shield` (iOS 16+)         | Apple `FamilyActivityPicker`    | ⚠️ Apple default shield   |

Repo: https://github.com/autonomous-ai/NodeXit

---

## Features

- 🧱 **NFC cube** — any passive NTAG213/215 sticker (~$0.50)
- 🎯 **Modes** — named sets of blocked apps (Deep Work, Sleep, …)
- 🔒 **OS-level blocking** — selected apps cannot be opened until unlock
- ⏱ **Live timer** on Home + Mode detail
- 📊 **30-day stats** — bar chart, per-day breakdown, top blocked apps
- 🔔 **Persistent notification** (Android) — status bar shows active Mode + chronometer
- 📱 **Bottom-tab nav**: Home / Stats / Settings
- 🧠 **Mode detail** screen — preview apps + scan to lock
- 🔁 **Scan-required unpair** — can't remove cube binding without scanning it
- 💾 **Local-first** — no backend, no account, all state in AsyncStorage + native preferences

---

## Quickstart

### Prerequisites

- Node.js 20+, npm 10+
- Watchman (recommended on macOS): `brew install watchman`
- For Android: Android Studio + device, or just EAS Build cloud
- For iOS local build: Xcode 16+, CocoaPods, Apple Developer Program ($99/yr), iPhone with iOS 16+
- For iOS EAS Build: Apple Developer Program only

### Setup

```bash
git clone https://github.com/autonomous-ai/NodeXit
cd NodeXit
npm install
```

### Web preview (UI only, no NFC, no real blocking)

```bash
npx expo start --web
```

Open http://localhost:8081 → use the "DEV: Simulate cube tap" buttons to walk through the flow.

### Android device

EAS cloud (no Android Studio needed):
```bash
eas build --platform android --profile preview
# install APK from the link on the phone
```

Local with Android Studio installed:
```bash
npm run android
```

### iOS Simulator

```bash
npx expo prebuild --platform ios --clean
cd ios && pod install && cd ..
npm run ios
```

On Simulator NFC and `FamilyActivityPicker` are blocked by Apple, so the app auto-falls-back to a mock app list and the DEV simulate cube button.

### iPhone via USB

```bash
# 1. Plug iPhone, trust the Mac
# 2. Settings → Privacy & Security → Developer Mode → ON (iPhone restarts)
# 3. Xcode → Settings → Accounts → sign in Apple ID dev
# 4. Open ios/NodeXit.xcworkspace, set Team in Signing & Capabilities
npm run ios -- --device
```

First launch: Settings → General → VPN & Device Management → Trust developer profile.

### iPhone via EAS Build cloud

```bash
npm install -g eas-cli
eas login
eas build --platform ios --profile preview
# open IPA link in Safari on the iPhone
```

---

## App walkthrough

### 1. Pair cube (one-time)

- Open NodeXit → "Pair your cube" screen
- Tap an NTAG213 sticker to the back of the phone (NFC area)
- Tag UID is stored as the cube key

### 2. Create a Mode

- Home tab → **+ New Mode**
- Enter a name, pick an emoji
- Pick apps:
  - **Android**: full list of installed apps with real icons
  - **iOS**: tap "Pick apps" → Apple's system sheet → tick apps/categories → Done
- Save

### 3. Lock

- Home → tap a Mode card → ModeDetail
- Tap **"Scan cube to lock"** → tap NFC tag → locked
- Home shows big timer; Android also gets a persistent notification

### 4. Try to open a blocked app

- **Android**: custom block screen with Mode name, emoji, and live timer
- **iOS**: Apple's default shield UI (lock icon + "App is Restricted")
- Back/Home buttons cannot bypass

### 5. Unlock

- Open NodeXit → scan cube → all apps accessible again
- Session is recorded in 30-day stats

### 6. Stats

- Stats tab → total focus time, today, 30-day bar chart
- Tap any bar → per-app breakdown for that day
- "Most blocked apps" list with real icons (Android) or placeholder (iOS)

### 7. Unpair

- Settings tab → Unpair cube → confirm → **scan the cube** → unpaired
- You can't unpair without holding the physical cube

---

## Android: first run

1. Install APK. Google Play Protect will warn; tap *Install anyway*.
2. **Restricted settings (Android 13+)**: in-app Settings shows a 3-step wizard:
   1. Open Accessibility → tap the service → see the "Restricted setting" warning, come back
   2. Open Apps list → tap NodeXit → ⋮ menu → "Allow restricted settings"
   3. Open Accessibility → toggle ON → confirm "Allow full control"
3. After this, blocking works. Repeat step 2 each sideload update.

Skip the dance by installing via `adb install -r path/to.apk` instead of opening the link directly — Android marks those as "trusted source".

---

## iOS: first run + Apple constraints

1. Install via TestFlight / EAS link / Xcode-over-USB.
2. Trust developer: Settings → General → VPN & Device Management → Trust.
3. **Screen Time must be ON**: Settings → Screen Time → Turn On Screen Time. Family Controls API only works when Screen Time is enabled.
4. **Family Controls authorization** prompt appears once at first lock. Tap *Allow*.

### Family Controls entitlement gotcha

Apple's `com.apple.developer.family-controls` entitlement, even the *Development* flavor, requires **team approval via Apple's contact form** for newer developer accounts:

https://developer.apple.com/contact/request/family-controls-distribution

Without approval, ad-hoc/TestFlight/App Store builds reject the entitlement. **Xcode + USB development builds can bypass** because Xcode-managed Development profiles can include the capability the same day you tick it on the App ID.

### iOS limitation: app identities are hidden

Apple's `FamilyActivityPicker` returns opaque `ApplicationToken`s, not bundle IDs. NodeXit **cannot show app names or icons** for the selected apps — the JS layer only sees a count. ModeDetail on iOS shows a single "N apps selected via Apple's picker" card. Editing reopens the picker pre-ticked with the previous selection.

By design from Apple.

---

## File map

```
App.tsx                          navigation root with error boundary
index.ts                         Expo entry
app.json                         Expo config — bundle ID, entitlements, icon, plugins
eas.json                         EAS build profiles
assets/
  icon.png                       app icon (orange + brick silhouette)
  adaptive-icon.png              Android adaptive foreground

src/
  types.ts                       Mode, Cube, LockState, Stats, route params
  theme.ts                       colors / radius / spacing
  store.ts                       Zustand + AsyncStorage + 30-day stats
  nfc/nfcService.ts              scanCube / cancelScan / simulateScan
  blocker/blockerService.ts     JS bridge to native blocker (Android + iOS)
  data/installedApps.ts          native + mock app list source
  navigation/MainTabs.tsx        bottom-tab navigator (Home, Stats, Settings)
  components/
    Button.tsx, ModeCard.tsx, ErrorBoundary.tsx
  screens/
    HomeScreen.tsx               Mode list + big timer
    ModeEditorScreen.tsx         name + emoji + app picker
    ModeDetailScreen.tsx         per-Mode detail + scan to lock
    PairCubeScreen.tsx           first NFC pair
    ScanScreen.tsx               lock / unlock / unpair flow
    BlockPreviewScreen.tsx       in-app preview of block UI
    SettingsScreen.tsx           cube info + blocker setup wizard
    StatsScreen.tsx              30-day chart + top apps

modules/installed-apps/          local Expo native module
  android/                         PackageManager-based real app list
  ios/                             FamilyActivityPicker + UserDefaults persistence

modules/blocker/                 local Expo native module
  android/                         AccessibilityService, BlockScreenActivity,
                                   BlockerNotification, BlocklistStore
  ios/                             FamilyControls + ManagedSettings.shield bridge
```

## Lock data flow

```
ScanScreen
  ├─ scanCube() reads NFC UID
  ├─ verify UID === pairedCube.id
  ├─ blocker.applyShield({ appIds, iosSelectionToken, modeName, modeEmoji, lockedAt })
  │   ├─ Android: writes blocklist + meta to SharedPreferences,
  │   │           posts persistent notification with chronometer
  │   └─ iOS:     reads selection from UserDefaults by token,
  │               writes ApplicationTokens into ManagedSettingsStore.shield
  └─ store.lockWithMode(modeId) → JS state updates

When a blocked app is opened:
  Android: BlockerAccessibilityService → BlockScreenActivity (custom UI)
  iOS:     ManagedSettings shows Apple's default shield (lock icon)
```

---

## Hardware

v1 uses a passive NFC tag — no battery, no electronics. Any NTAG213/215/216 sticker or coin works. Stick it on a wood block, coin, whatever. The phone reads the tag's factory-burned UID; that UID is the key.

A smart cube using **ESP32-C3 + PN532** in card-emulation mode (rotating UID for anti-clone, LED feedback on scan) is described in the spec but not built.

---

## Limitations

- **iOS Family Controls entitlement** needs Apple's contact-form approval for sideload distribution paths (TestFlight / Ad-Hoc / App Store). Local Xcode + USB builds can bypass.
- **iOS custom block screen UI** with mode emoji + live timer needs a `ShieldConfigurationDataSource` extension target — Expo prebuild can't generate that automatically. iOS currently uses Apple's default shield.
- **iOS persistent notification with timer** would require a Live Activity (WidgetKit + ActivityKit) extension target — same constraint.
- **Android AccessibilityService permission** can't be auto-granted; users must enable manually.
- **Google Play Protect warning** on first install of any sideloaded app using AccessibilityService.
- **Restricted settings dance** on Android 13+ for sideload installs — wizard guides through it.
- **NFC tag UID can be cloned** by someone with a few seconds of physical access. Fine for personal self-discipline, not security.

---

## Scripts

| Command                  | What it does                                       |
| ------------------------ | -------------------------------------------------- |
| `npm run setup`          | one-shot bootstrap (install + prebuild + pods)     |
| `npm start`              | Metro dev server                                   |
| `npm run android`        | local Android build + install                      |
| `npm run ios`            | local iOS Simulator build + install                |
| `npm run ios -- --device`| local iOS build to USB-connected iPhone            |
| `npm run prebuild`       | regenerate `ios/` and `android/`                   |
| `npm run prebuild:clean` | wipe and regenerate                                |
| `npm run typecheck`      | TypeScript                                         |
| `npm run lint`           | ESLint                                             |
| `npm test`               | Jest                                               |
| `npm run build:android`  | EAS preview APK build                              |
| `npm run clean`          | wipe `node_modules`, `ios`, `android`, `.expo`     |

---

## License

MIT.
