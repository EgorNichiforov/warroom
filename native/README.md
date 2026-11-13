# War Room · Android app

A thin native shell (Capacitor 8) around the War Room web app. It loads the live app from
`https://egornichiforov.github.io/warroom/v5/`, so web updates reach the phone without reinstalling.

Native powers (plugin `WrNative`, `android/app/src/main/java/com/egornichiforov/warroom/`):
- Background recorder: foreground service with the microphone, keeps recording with the screen off.
  Stop from the app or the notification; the file waits until the app summarizes it (meet.js).
- "Share → Summarize in War Room" for audio/video files from other apps (e.g. the Recorder app).
- Home-screen shortcuts: Record a conversation · Start dialing · Log a meal.
- Pause / resume a recording (in the app or from the notification).
- Screen time: reads Android usage access (same data as Digital Wellbeing) → daily per-app totals (screen.js).
- Keeps the screen on during a dial session.

Build: `npm i && npx cap sync android && cd android && ./gradlew assembleRelease`
(needs the Android SDK; signing keys are not in the repo).
