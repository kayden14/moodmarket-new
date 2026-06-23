# 📖 MoodMarket running manual

This document provides complete instructions on how to set up, configure, and run the MoodMarket application on various development environments.

---

## 📋 Prerequisites

Before running the application, make sure you have the following installed:

- **Node.js** v18 or higher — [nodejs.org](https://nodejs.org)
- **Package Manager**: **npm** v9+, **yarn**, or **bun** (a `bun.lock` is included if you prefer Bun)
- **EAS CLI** (Required only for production builds) — `npm install -g eas-cli`
- An **Expo account** — [expo.dev](https://expo.dev) (free)
- A **Supabase project** — [supabase.com](https://supabase.com) (free tier available)
- **Expo Go** app installed on your Android or iOS device (for physical testing)

---

## 🛠️ Step-by-Step Setup

### 1. Install dependencies

Choose your preferred package manager:

```bash
# Using npm
npm install

# Using bun
bun install
```

### 2. Configure environment variables

Copy the template file to create your local environment file:

```bash
cp .env.example .env
```

Open `.env` in your editor and enter your credentials:

```env
# ─── Supabase Configuration ────────────────────────────────
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key

# ─── AI Engine (Gemini API) ────────────────────────────────
# Get your API key at https://aistudio.google.com/
EXPO_PUBLIC_GEMINI_API_KEY=your-gemini-api-key

# ─── App Deep Linking ──────────────────────────────────────
EXPO_PUBLIC_APP_SCHEME=moodmarket
```

> [!IMPORTANT]
> All variables exposed to the React Native/Expo client must be prefixed with `EXPO_PUBLIC_`. Variables without this prefix are server-only and will not be bundled.

---

## 🚀 Running the Development Server

Start the Metro Bundler:

```bash
# Using npm
npm run dev

# Using bun
bun dev
```

This starts the Expo bundler and displays a QR code in the terminal.

---

## 📱 Launching on Different Platforms

### 1. Web Browser 🌐
- In the running terminal, press **`w`** to open the web version.
- Or open your browser and navigate to `http://localhost:8081`.
- *Note: Features like Voice Search (Web Speech API) are best experienced on Chrome or Safari.*

### 2. Physical Device (Expo Go) 📱
- Install the **Expo Go** app on your phone.
- Ensure your computer and your phone are connected to the **same local Wi-Fi network**.
- **iOS**: Scan the QR code using your system camera app, then tap the prompt to open Expo Go.
- **Android**: Open the Expo Go app and use the "Scan QR Code" option.
- **Troubleshooting Connection Issues (Tunneling)**: If you are on a restricted public network (e.g., school/office Wi-Fi) and the app won't load, stop the server and restart with tunnel mode enabled:
  ```bash
  npx expo start --tunnel
  ```
  *(Expo will automatically prompt you to install `@expo/ngrok` if it is not already installed).*

### 3. Android Emulator 🤖
- Open Android Studio and launch a virtual device (AVD).
- Once the emulator is running, press **`a`** in your Metro bundler terminal.
- The Expo Go app will automatically install and open the project inside the emulator.

### 4. iOS Simulator 🍏
- Make sure Xcode is installed on your macOS machine.
- Press **`i`** in the Metro bundler terminal.
- This will launch the iOS Simulator and load the app.
