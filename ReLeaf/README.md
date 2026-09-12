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
      ReuseIdeaCard.js
    screens/
      HomeScreen.js
      ScanScreen.js
      ResultScreen.js
```

## 4. Point it at your backend

Open `src/api/config.js` and set `API_BASE_URL` to wherever your FastAPI backend is reachable —
your laptop's local IP (e.g. `http://192.168.1.5:8000`) if your phone's on the same WiFi, or your
ngrok URL. See the backend README for how to find this.

## 5. Run it

```bash
npx expo start
```

Scan the QR code with the Expo Go app on your phone (same WiFi network as your laptop), or press `a` for an Android emulator / `i` for iOS simulator if you have one set up.

## What to test first

1. Home screen loads with fonts showing correctly (Space Grotesk headings, Inter body text) — if fonts look like the system default, the font loading hook isn't working; check the console for errors.
2. Tap "Scan an item" → try both "Take photo" and "Choose from gallery".
3. After picking an image, tap "Identify this item" — this calls your backend. If it fails, double check `API_BASE_URL` and that your backend server is actually running and reachable from your phone (same WiFi is the most common gotcha).
4. Confirm the Result screen shows the colored category badge, disposal text, and reuse idea cards scrolling horizontally.
5. Go back to Home — the "items identified so far" counter should now show 1, and should persist even if you close and reopen the app (it's saved via AsyncStorage).

## Later: EAS Build

Once everything above works end-to-end via Expo Go, we'll set up `eas.json` and run
`eas build -p android --profile preview` to produce an installable APK. Don't do this yet —
get the Expo Go version fully working first, since EAS builds take time to compile and you don't
want to be debugging app logic inside that slower loop.
