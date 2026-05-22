# Bricks — App Blocker Cube

## Overview
Bricks is a mobile app paired with a physical hardware cube (NFC/Bluetooth tag). The user defines "Modes" — each Mode is a set of apps to block. To activate a Mode, the user taps/scans the cube with their phone. The selected apps are blocked until the cube is scanned again to unlock.

The cube is a deliberate physical friction layer: you can't unblock without physically picking it up and scanning it, which discourages impulsive bypass.

## Core Concepts

### Cube (Hardware)
- Small physical object embedded with an NFC tag (passive, no battery) or BLE beacon.
- Each cube has a unique ID written/paired to the user's account on first setup.
- Acts as the physical "key" — both lock and unlock require scanning it.
- v1: NFC only (cheaper, no battery, instant scan).
- v2 (optional): BLE variant with button + LED feedback.

### Mode
A named configuration containing:
- Name (e.g. "Deep Work", "Sleep", "Study")
- List of blocked apps (chosen from installed apps on device)
- Optional: blocked websites (via Safari content blocker / DNS)
- Optional: schedule hint (suggested time of day)

### Block State
- **Unlocked**: Apps run normally.
- **Locked**: Selected Mode is active; opening a blocked app shows the Block Screen.

## User Flows

### 1. First-time setup
1. User installs app and grants required permissions (Screen Time / Family Controls on iOS, Accessibility + Usage Stats on Android, Notifications, NFC).
2. App prompts user to scan the cube to pair it with their account.
3. App walks user through creating their first Mode.

### 2. Create / edit a Mode
1. Tap **+ New Mode**.
2. Enter name.
3. Select apps to block from a list of installed apps.
4. Save.

### 3. Activate a Mode (lock)
1. Open app, choose a Mode → tap **Arm**.
2. App prompts: *"Scan your cube to lock."*
3. User taps cube to phone (NFC) — Mode becomes active.
4. Blocked apps are now intercepted.

### 4. Hitting a blocked app
1. User opens a blocked app.
2. Block Screen takes over showing:
   - Name of the Mode that's blocking it
   - Message: *"This app is blocked. Scan your cube to unlock."*
   - Time elapsed since lock (optional motivation)
3. User cannot dismiss without scanning the cube.

### 5. Unlock
1. From Block Screen (or main app), user scans the cube.
2. App verifies cube ID matches the paired cube.
3. Mode is deactivated. Apps are accessible again.

## Screens (App UI)

1. **Home** — list of Modes, current state (Locked / Unlocked), big "Scan to lock/unlock" button.
2. **Mode Editor** — name field, app picker, save.
3. **Pair Cube** — onboarding scan flow.
4. **Block Screen** — full-screen takeover when a blocked app is opened.
5. **Settings** — manage paired cubes, permissions, notifications.

## Technical Notes

### iOS
- App blocking requires **Screen Time API / Family Controls** framework (`ManagedSettings`, `DeviceActivity`, `FamilyControls`).
- NFC reading via **Core NFC** (`NFCNDEFReaderSession`).
- Block Screen: use `ManagedSettings` shield configuration — shields a blocked app with a custom view.
- Requires user authorization for Family Controls (one-time).

### Android
- App blocking via **Accessibility Service** — detect foreground app and overlay a Block Screen activity.
- Alternative: `UsageStatsManager` + overlay permission.
- NFC via `android.nfc.NfcAdapter` + foreground dispatch.

### Backend (minimal for v1)
- Optional account system for cube pairing recovery.
- Could be fully local-first; cube ID and Mode definitions stored on device.

### Cube hardware
- v1: NTAG213/215 NFC sticker or molded cube. Unique UID burned at manufacture.
- App stores the paired UID; comparison is local — no network needed for lock/unlock.

## Open Questions
1. Should a single cube support multiple Modes (user picks Mode in app, then scans to confirm), or one cube = one Mode?
2. Emergency unlock — if cube is lost, how does user unblock? (Options: 24h timeout, recovery code, account-based reset.)
3. Per-app vs system-wide block — can blocked apps still send notifications?
4. Block website categories (social, news) via DNS profile?
5. Multi-cube support — one user, multiple cubes for different contexts (home/office)?

## v1 Scope (MVP)
- iOS only (Family Controls gives a cleaner block UX than Android overlays).
- NFC cube, one cube per user.
- Create / edit / delete Modes.
- Scan-to-lock, scan-to-unlock.
- Custom Block Screen for blocked apps.
- Local storage only, no backend.

## Future
- Android version.
- BLE cube with status LED.
- Multiple cubes / Mode-per-cube mapping.
- Stats: time saved, longest lock streak.
- Shared Modes between users (e.g. study groups).
- Schedule-based auto-arm (e.g. lock automatically at bedtime).
