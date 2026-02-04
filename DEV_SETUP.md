# Dev Setup (JaTango)

## Prereqs

- Node.js (use an LTS version)
- npm
- Android Studio (for Android Emulator)

## Install

```bash
npm ci
```

## Start the backend (Express API)

Runs on `http://0.0.0.0:5000`.

```bash
npm run server:dev
```

## Start the frontend (Expo)

### Web

This starts Metro + Expo Web.

```bash
EXPO_PUBLIC_API_URL=http://localhost:5000 npx expo start --web --host lan --port 8081
```

Open:

- `http://localhost:8081`

### Android (Emulator)

1. Open Android Studio
2. Open **Device Manager**
3. Start an emulator device

Then run Expo and launch Android:

```bash
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000 npx expo start --host lan
```

In the Expo terminal, press:

- `a` to open Android

Notes:

- `10.0.2.2` is the special Android-emulator alias for your Mac host `localhost`.
- If you run the backend on a different machine, replace `10.0.2.2` with that machine’s LAN IP.

## Troubleshooting

## Keep the backend + Expo running (so it stays active)

### Option A: Run both in the background (recommended if you don’t have tmux)

From the repo root:

```bash
npm run server:dev > server.log 2>&1 & disown
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000 npx expo start --android --host lan --port 8082 > expo.log 2>&1 & disown
```

Watch logs:

```bash
tail -f server.log
tail -f expo.log
```

Verify they’re running:

```bash
lsof -nP -iTCP:5000 -sTCP:LISTEN
lsof -nP -iTCP:8082 -sTCP:LISTEN
```

Stop them:

```bash
pkill -f "tsx server/index.ts" || true
pkill -f "expo start" || true
```

If you see `EADDRINUSE` in `server.log`, it usually means the backend is already running on `:5000` and you started it again.

### Option B: tmux (if installed)

Start a persistent session:

```bash
tmux new -s jatango
```

In tmux:

```bash
npm run server:dev
```

Split the window, then start Expo:

```bash
EXPO_PUBLIC_API_URL=http://10.0.2.2:5000 npx expo start --android --host lan --port 8082
```

Detach (leaves it running):

```text
Ctrl+b then d
```

Re-attach later:

```bash
tmux attach -t jatango
```

### adb not found

Expo needs `adb` to install/open the app on the Android emulator.

- Ensure Android SDK Platform-Tools are installed in Android Studio:
  - Android Studio → Settings → Appearance & Behavior → System Settings → Android SDK → **SDK Tools** → check **Android SDK Platform-Tools**

- Then add `platform-tools` to your PATH (typical location):

```bash
export ANDROID_SDK_ROOT="$HOME/Library/Android/sdk"
export PATH="$ANDROID_SDK_ROOT/platform-tools:$PATH"
```

After that, verify:

```bash
adb devices
```
