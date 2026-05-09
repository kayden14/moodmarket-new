# 🏗️ Architecture

This document explains how MoodMarket works under the hood: the data flow, key services, and how the pieces fit together.

---

## High-Level Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Camera    │────▶│ Mood Detect  │────▶│  Recommend  │
│   / Web     │     │  (Gemini AI) │     │   Engine    │
└─────────────┘     └──────────────┘     └──────┬──────┘
                                                 │
                                        ┌────────▼────────┐
                                        │  Product Feed   │
                                        │  (Home Screen)  │
                                        └─────────────────┘
```

1. **User opens camera** (or visits home on web)
2. **Mood detection** analyses the user's face or expression
3. **Recommendation engine** scores products based on the detected mood
4. **Products are ranked** and displayed in the feed

---

## State Management

MoodMarket uses a hybrid approach:

| Layer | Technology | Used For |
|---|---|---|
| Global State | React Context | Auth, Cart, Theme |
| Server State | Supabase | Products, Orders, Profiles |
| Local Storage | AsyncStorage | Dark mode, mood preference |
| Realtime | Supabase subscriptions | Notifications |

### Context Providers

All providers are mounted in `app/_layout.tsx`:

```tsx
<ThemeProvider>
  <AuthProvider>
    <CartProvider>
      { /* screens */ }
    </CartProvider>
  </AuthProvider>
</ThemeProvider>
```

- **ThemeProvider** — Manages `isDark` and `mood`. Persists to AsyncStorage.
- **AuthProvider** — Watches Supabase auth state, exposes `user`, `signIn`, `signOut`.
- **CartProvider** — Holds cart items, syncs with Supabase when user is logged in.

---

## Mood Detection

### Native (`app/_camera_native.tsx`)

1. `useMoodDetection` hook requests camera permission.
2. After a 2.5s delay, it silently captures a photo.
3. The image is compressed via `expo-image-manipulator`.
4. `detectMoodFromImage` sends the image to Google's Gemini Vision API.
5. Gemini returns a JSON mood + confidence score.
6. The hook calls `onMoodDetected(mood)` which updates the theme context.

### Web (`app/camera.tsx`)

Web uses a different flow (face-api.js polling) defined in the web-specific screen files.

### Service File: `services/moodDetection.ts`

- **Model fallback**: Tries `gemini-2.0-flash` → `gemini-2.0-flash-lite` → `gemini-2.5-flash`.
- **Throttling**: Enforces a 1.5s minimum gap between requests to stay under free-tier limits.
- **Retry logic**: Exponential backoff for 429 / 503 errors.
- **Safety filter handling**: Defaults to `calm` if the image is blocked.

---

## Recommendation Engine

`services/recommendations.ts` scores every product using a weighted algorithm:

| Factor | Weight | Description |
|---|---|---|
| Mood match | 0–40 | Tags matching the current mood |
| Tag breadth | 0–10 | Products with more tags score higher |
| Rating | 0–20 | Star rating × 4 |
| Price popularity | 5–15 | Mid-range prices score highest |
| Recency | 0–10 | Newer products get a boost |
| Jitter | 0–3 | Small random variance so lists feel fresh |

**Safe-by-design**: Every function is wrapped in `try/catch` and returns empty arrays on failure. The UI never crashes if recommendations fail.

---

## Notifications

Two notification systems work in parallel:

### 1. Local Notifications (`services/notifications.ts`)

- Uses `expo-notifications` (lazy-loaded to avoid Expo Go crashes).
- Works on native builds only.
- Handles permission requests, Android channels, and push token registration.

### 2. In-App Notifications (`services/notifyUser.ts`)

- Inserts rows into the Supabase `notifications` table.
- Triggers a realtime listener in `app/notifications.tsx` instantly.
- Works on all platforms (Expo Go, native, web).

### 3. Remote Push (`services/push.ts`)

- Calls the Supabase Edge Function `send-notification`.
- Sends push notifications to specific users via Expo Push Service.

---

## Database Schema (Supabase)

Key tables:

| Table | Purpose |
|---|---|
| `profiles` | User info, mood history, push tokens |
| `products` | Product catalog with mood tags |
| `cart_items` | Shopping cart lines |
| `orders` | Completed orders |
| `notifications` | In-app notification inbox |

Row Level Security (RLS) is enabled on all tables. Users can only read/write their own data unless they have the `admin` role.

---

## Platform Splitting

Some screens have platform-specific variants:

| Base | Web Variant | Purpose |
|---|---|---|
| `checkout.tsx` | `checkout.web.tsx` | Web uses Stripe/Paystack web flow |
| `mood-history.tsx` | `mood-history.web.tsx` | Web uses charts library |
| `product/[id].tsx` | `product/[id].web.tsx` | Web layout differences |
| `(tabs)/index.tsx` | `(tabs)/index.web.tsx` | Responsive grid layout |
| `(tabs)/cart.tsx` | `(tabs)/cart.web.tsx` | Web cart layout |
| `(tabs)/profile.tsx` | `(tabs)/profile.web.tsx` | Web profile layout |

Expo Router automatically picks the `.web.tsx` file when running on web.

---

## Auth Flow

1. User signs up / logs in via `AuthContext`.
2. Supabase creates a session and stores the JWT.
3. `safeGetSession()` in `services/supabase.ts` handles invalid refresh tokens gracefully.
4. On auth state change, the `AuthProvider` updates the `user` object.
5. `CartProvider` fetches the user's cart from Supabase.
6. `NotificationService.init()` registers the push token against the user's profile.
