# 🛍️ MoodMarket

A Mood-aware or mood-based shopping experience built with **Expo (React Native)** and Supabase. MoodMarket detects or receives your current mood and surfaces products that match how you  feel.

---



## Table of Contents

- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started & Configuration](#getting-started--configuration)
- [Running the App](#running-the-app)
- [Project Structure](#project-structure)
- [Premium Innovation Features](#premium-innovation-features-fyp-highlights)
- [Building the APK (Alternative to EAS)](#building-the-apk-alternative-to-eas)
- [Deployment](#deployment)
- [License](#license)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo SDK 54 + Expo Router v6 |
| Language | TypeScript |
| UI | React Native 0.81, Expo Linear Gradient, Expo Blur |
| Navigation | Expo Router (file-based) + React Navigation |
| Backend / DB | Supabase (Postgres + Auth + Storage) |
| Camera / Vision | Expo Camera, Expo Face Detector |
| Notifications | Expo Notifications |
| State / Storage | AsyncStorage |
| Icons | Lucide React Native, Expo Vector Icons |

---

## Prerequisites

Make sure you have the following installed before you begin:

- **Node.js** v18 or higher — [nodejs.org](https://nodejs.org)
- **Package Manager**: **npm** v9+, **yarn**, or **bun** (a `bun.lock` is included if you prefer Bun)
- **EAS CLI** (Required only for builds) — `npm install -g eas-cli`
- An **Expo account** — [expo.dev](https://expo.dev) (free)
- A **Supabase project** — [supabase.com](https://supabase.com) (free tier available)
- For physical device testing: **Expo Go** app installed on your Android or iOS device

---

## Getting Started & Configuration

### 1. Clone the repository

```bash
git clone https://github.com/your-username/moodmarket.git
cd moodmarket
```

### 2. Install dependencies

Choose your preferred package manager to install the dependencies:

```bash
# Using npm
npm install

# Using bun
bun install
```

### 3. Set up environment variables

Copy the example environment template file to create your local config:

```bash
cp .env.example .env
```

Open `.env` and fill in the required keys:

```env
# ─── Supabase ───────────────────────────────────────────────
# Found in: Supabase Dashboard → Project Settings → API
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key

# ─── AI Engine (Gemini) ─────────────────────────────────────
# Generate a key at https://aistudio.google.com/
EXPO_PUBLIC_GEMINI_API_KEY=your-gemini-api-key

# ─── App Config ─────────────────────────────────────────────
# Used for deep linking and OAuth redirects
EXPO_PUBLIC_APP_SCHEME=moodmarket
```

> [!IMPORTANT]
> All variables exposed to the React Native/Expo client must be prefixed with `EXPO_PUBLIC_`. Variables without this prefix are server-only and will not be bundled.

---

## Running the App

### 1. Start the Dev Server / Metro Bundler

Run the following command in the project root to spin up the bundler:

```bash
# Using npm
npm run dev

# Using bun
bun dev
```

This starts the Expo CLI and displays a QR code in the terminal.

### 2. Run on Your Target Platform

Once the Metro bundler is running, you can launch the app on different platforms:

#### A. Web Browser 🌐
- In the running terminal, press **`w`** to open the web version.
- Alternatively, open your browser and navigate to `http://localhost:8081`.
- *Note: Features like Voice Search (Web Speech API) are best experienced on Chrome or Safari.*

#### B. Physical Device (Expo Go) 📱
- Install the **Expo Go** app on your phone.
- Ensure your computer and your phone are connected to the **same local Wi-Fi network**.
- **iOS**: Scan the QR code using your system camera app, then tap the prompt to open Expo Go.
- **Android**: Open the Expo Go app and use the "Scan QR Code" option.
- **Troubleshooting Connection Issues (Tunneling)**: If you are on a restricted public network (e.g., school/office Wi-Fi) and the app won't load, stop the server and restart with tunnel mode enabled:
  ```bash
  npx expo start --tunnel
  ```
  *(Expo will automatically prompt you to install `@expo/ngrok` if it is not already installed).*

#### C. Android Emulator 🤖
- Open Android Studio and launch a virtual device (AVD).
- Once the emulator is running, press **`a`** in your Metro bundler terminal.
- The Expo Go app will automatically install and open the project inside the emulator.

#### D. iOS Simulator 🍏
- Make sure Xcode is installed on your macOS machine.
- Press **`i`** in the Metro bundler terminal.
- This will launch the iOS Simulator and load the app.

---

## Project Structure

```
moodmarket/
├── app/                    # Expo Router screens (file-based routing)
│   ├── (tabs)/             # Bottom tab navigator screens
│   ├── admin/              # Admin dashboard screens
│   ├── product/            # Product detail screens
│   ├── order/              # Order detail screens
│   ├── _layout.tsx         # Root layout with providers
│   └── index.tsx           # Entry screen
├── components/             # Shared UI components
├── constants/              # Static constants (colours, config)
├── contexts/               # React Context providers (auth, cart, theme)
├── hooks/                  # Custom React hooks
├── services/               # Business logic & API integrations
├── types/                  # TypeScript type definitions
├── utils/                  # Pure utility functions
├── docs/                   # Project documentation
├── assets/                 # Images, fonts, icons
├── supabase/               # Supabase config & edge functions
├── .env                    # Local environment variables (git-ignored)
├── .env.example            # Template for environment variables
├── app.json                # Expo app configuration
├── eas.json                # EAS Build profiles
└── tsconfig.json           # TypeScript configuration
```

---

## 💎 Premium Innovation Features (FYP Highlights)

MoodMarket has been optimized for a premium, immersive experience with several state-of-the-art features:

- **🧠 AI Insight Engine**: Uses Gemini 1.5 Flash to analyze your mood history and provide personalized, empathetic wellness observations.
- **🎨 Mood-Aware Typography**: The entire UI font family (Sora/Lora) dynamically shifts based on your current vibe—serif for calm, sans-serif for energetic.
- **🗣️ Voice-Driven Discovery**: A hands-free "Vibe Search" that interprets natural language (e.g., *"I'm feeling a bit overwhelmed"*) to find matching products.
- **💌 Premium Email System**: Restructured administrative and transactional emails with a modern, high-end design for account actions, vendor approvals, and status updates.
- **📳 Tactile Feedback**: Integrated haptic feedback (`expo-haptics`) for a premium physical response during scanning and shopping.

---

## 🛠️ Building the APK (Alternative to EAS)

If you prefer to build locally without using Expo Application Services (EAS), follow these steps:

### 1. Generate Native Projects
Run the prebuild command to eject the native `android` folder:
```bash
npx expo prebuild --platform android
```

### 2. Manual Build (requires Java & Android SDK)
Navigate to the android directory and run the Gradle assembler:
```bash
cd android
./gradlew assembleRelease
```
The resulting APK will be located at `android/app/build/outputs/apk/release/app-release.apk`.

### 3. Using Android Studio
- Open the `android` folder in Android Studio.
- Wait for Gradle sync to complete.
- Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**.

---

## Deployment

### Android — Google Play Store

To release on the Play Store, build an **App Bundle (AAB)** instead of an APK:

```bash
eas build --platform android --profile production
```

Then submit it:

```bash
eas submit --platform android
```

EAS Submit handles the upload to Google Play automatically. You'll need:
- A [Google Play Developer account](https://play.google.com/console) ($25 one-time fee)
- A service account JSON key configured in EAS ([docs](https://docs.expo.dev/submit/android/))

### Web

```bash
npm run build:web
```

This exports a static web build to the `dist/` folder, which you can deploy to:
- **Vercel** — `vercel --prod`
- **Netlify** — drag and drop the `dist/` folder
- **GitHub Pages** — push `dist/` to a `gh-pages` branch

---

## Recent Updates

- **AI Insight Engine** — Integrated personalized mood history analysis via Gemini.
- **Dynamic Typography** — Global implementation of Sora and Lora font tokens.
- **Voice Discovery** — Web Speech API integration for natural language searching.
- **Premium Admin Emails** — Complete redesign of the transactional email system.
- **Admin panel** — Vendor application approval now uses upsert to prevent duplicate-key errors on re-approvals.
- **Dark / Light mode** — Theme toggle button added to the dashboard header bar.
- **Vendor apply** — Back button now correctly navigates to the consumer store.

---

## License

MIT — see [LICENSE](./LICENSE) for details.