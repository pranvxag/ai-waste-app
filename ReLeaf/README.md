# ReLeaf — Mobile App (Expo)

## 1. Create the Expo project

```bash
npx create-expo-app ReLeaf
cd ReLeaf
```

Say no to TypeScript template if asked (this code is plain JS) — or convert if you prefer, the logic is the same either way.

## 2. Install dependencies

```bash
npx expo install @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context
npx expo install expo-image-picker
npx expo install @react-native-async-storage/async-storage
npx expo install @expo-google-fonts/space-grotesk @expo-google-fonts/inter expo-font
npx expo install @expo/vector-icons
```

## 3. Copy in the provided files

Replace the default `App.js` with the one provided, and copy the entire `src/` folder into your project root, so you end up with:

```
ReLeaf/
  App.js
  src/
    theme/
      theme.js
      useAppFonts.js
    context/
      ScanHistoryContext.js
    api/
      config.js
      predict.js
    utils/
      formatting.js
    components/
      PrimaryButton.js
      SecondaryButton.js
      StepItem.js
      MaterialIdCard.js
    screens/
      HomeScreen.js
      ScanScreen.js
      ResultScreen.js
```

## 4. Point it at your backend

`src/api/config.js`'s `API_BASE_URL` is just the fallback default — the app reads the backend
URL from AsyncStorage first (see `getApiBaseUrl()`/`setApiBaseUrl()` in that file), which you set
from the **Settings tab** inside the app itself (no rebuild needed to switch networks). Editing
`API_BASE_URL` in the source is only useful for changing what a fresh install starts with.
See the backend README for how to find your laptop's local IP or set up an ngrok URL.

## 5. Run it

```bash
npx expo start
```

Scan the QR code with the Expo Go app on your phone (same WiFi network as your laptop), or press `a` for an Android emulator / `i` for iOS simulator if you have one set up.

## What to test first

1. Home screen loads with fonts showing correctly (Space Grotesk headings, Inter body text) — if fonts look like the system default, the font loading hook isn't working; check the console for errors.
2. Tap the camera button in the middle of the tab bar → try both "Take photo" and "Choose from gallery".
3. After picking an image, tap "Identify this item" — this calls your backend. If it fails, double check the Backend URL in the Settings tab and that your backend server is actually running and reachable from your phone (same WiFi is the most common gotcha).
4. Confirm the Result screen shows the colored category badge, disposal text, and reuse idea cards scrolling horizontally.
5. Go back to Home — the "items identified so far" counter should now show 1, and should persist even if you close and reopen the app (it's saved via AsyncStorage).

## Later: EAS Build

Once everything above works end-to-end via Expo Go, we'll set up `eas.json` and run
`eas build -p android --profile preview` to produce an installable APK. Don't do this yet —
get the Expo Go version fully working first, since EAS builds take time to compile and you don't
want to be debugging app logic inside that slower loop.
