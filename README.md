# 🛍️ MoodMarket

A Mood-aware or mood-based shopping experience built with **Expo (React Native)** and Supabase. MoodMarket detects or receives your current mood and surfaces products  that match how you feel.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Running the App](#running-the-app)
- [Building the APK (Android)](#building-the-apk-android)
- [Deployment](#deployment)
- [Contributing](#contributing)

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
- **npm** v9+ or **yarn**
- **Expo CLI** — `npm install -g expo-cli`
- **EAS CLI** — `npm install -g eas-cli`
- An **Expo account** — [expo.dev](https://expo.dev) (free)
- A **Supabase account** — [supabase.com](https://supabase.com) (free tier available)
- For physical device testing: **Expo Go** app on Android or iOS

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/moodmarket.git
cd moodmarket
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

See the [Environment Variables](#environment-variables) section below for details on each variable.

### 4. Log in to Expo

```bash
eas login
```

### 5. Start the development server

```bash
npm run dev
```

---

## Environment Variables

Create a `.env` file in the root of the project with the following variables. **Never commit this file to version control.**

```env
# ─── Supabase ───────────────────────────────────────────────
# Found in: Supabase Dashboard → Project Settings → API
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key

# ─── App Config (optional overrides) ────────────────────────
# Used for deep linking and OAuth redirects
EXPO_PUBLIC_APP_SCHEME=moodmarket
```

> **Note:** All variables exposed to the client must be prefixed with `EXPO_PUBLIC_`. Variables without this prefix are server-only and will not be bundled into the app.

### Where to find your Supabase keys

1. Go to [supabase.com](https://supabase.com) and open your project
2. Navigate to **Project Settings → API**
3. Copy the **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
4. Copy the **anon / public** key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### `.env.example`

Commit this file (without real values) so other contributors know what's needed:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
EXPO_PUBLIC_APP_SCHEME=moodmarket
```

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

> 📚 See `docs/PROJECT_STRUCTURE.md` for a detailed breakdown of each folder and where new files should go.

---

## Running the App

### Development server

```bash
npm run dev
```

This starts the Metro bundler. Scan the QR code with **Expo Go** on your phone, or press:
- `a` — open on Android emulator
- `i` — open on iOS simulator
- `w` — open in web browser

### Type checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

---

## Building the APK (Android)

MoodMarket uses **EAS Build** — Expo's managed cloud build service — to produce Android APKs without needing Android Studio or a local Java/Gradle setup.

### Step 1 — Configure EAS

If you haven't already, initialise EAS in the project:

```bash
eas build:configure
```

This creates an `eas.json` file if one doesn't exist. Make sure it includes a `preview` profile for APK output:

```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "android": {
        "buildType": "apk"
      },
      "distribution": "internal"
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

> **APK vs AAB:** Use `apk` for sideloading and direct installs. Use `app-bundle` (AAB) when submitting to the Google Play Store — it's required by Google and produces smaller downloads.

### Step 2 — Add your environment variables to EAS

EAS Build runs in the cloud and doesn't have access to your local `.env` file. Add your secrets via the EAS dashboard or CLI:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://your-project.supabase.co"
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-anon-key"
```

Or manage them at [expo.dev](https://expo.dev) → your project → **Secrets**.

### Step 3 — Trigger the build

```bash
eas build --platform android --profile preview
```

EAS will:
1. Upload your project source code
2. Install dependencies in the cloud
3. Build the APK on Expo's servers
4. Provide a download link when complete (usually 5–15 minutes)

### Step 4 — Download and install the APK

Once the build finishes, EAS prints a download URL. You can also find it at [expo.dev/builds](https://expo.dev/builds).

To install on a connected Android device via ADB:

```bash
adb install moodmarket.apk
```

Or simply open the download link on your Android device and tap **Install** (you may need to enable *Install from unknown sources* in your device settings).

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

### iOS — App Store (future)

```bash
eas build --platform ios --profile production
eas submit --platform ios
```

Requires an Apple Developer account ($99/year).

### Web

```bash
npm run build:web
```

This exports a static web build to the `dist/` folder, which you can deploy to:
- **Vercel** — `vercel --prod`
- **Netlify** — drag and drop the `dist/` folder
- **GitHub Pages** — push `dist/` to a `gh-pages` branch

### Supabase

Your Supabase project is already hosted — no extra deployment step needed. For production, make sure to:

- Enable **Row Level Security (RLS)** on all tables
- Review your **Auth settings** (redirect URLs, OAuth providers)
- Set up **database backups** under Project Settings → Database

---

## Contributing

Contributions are welcome. Please follow the steps below.

### 1. Fork and clone

```bash
git clone https://github.com/your-username/moodmarket.git
cd moodmarket
```

### 2. Create a feature branch

```bash
git checkout -b feature/your-feature-name
```

Branch naming convention:
- `feature/` — new functionality
- `fix/` — bug fixes
- `chore/` — dependency updates, refactors, tooling

### 3. Set up your environment

Follow the [Getting Started](#getting-started) steps and create your own `.env` with a personal Supabase project for development.

### 4. Make your changes

- Keep commits small and focused
- Write clear commit messages: `feat: add mood filter to product grid`
- Run `npm run typecheck` and `npm run lint` before committing

### 5. Open a pull request

Push your branch and open a PR against `main`. Include:
- A short description of what changed and why
- Screenshots or a screen recording if the change is visual
- Any relevant issue numbers

### Code style

- TypeScript strict mode is enabled — avoid `any`
- Use functional components and hooks
- Keep components in `components/`, screens in `app/`
- Environment access should always go through a typed config helper, not `process.env` directly

---

## Recent Updates

- **Admin panel** — Vendor application approval now uses upsert to prevent duplicate-key errors on re-approvals
- **Dark / Light mode** — Theme toggle button added to the dashboard header bar (always visible on all screen sizes)
- **Vendor apply** — Back button now correctly navigates to the consumer store instead of the vendor login page

---

## License

MIT — see [LICENSE](./LICENSE) for details.