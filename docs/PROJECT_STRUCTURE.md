# 📁 Project Structure

This document explains the folder layout and where each type of file lives. Follow these conventions when adding new code.

```
moodmarket/
├── app/                    # Expo Router screens (file-based routing)
│   ├── (tabs)/             # Bottom tab navigator group
│   ├── admin/              # Admin dashboard screens
│   ├── product/            # Product detail screens
│   ├── order/              # Order detail screens
│   ├── _layout.tsx         # Root layout with providers
│   └── index.tsx           # Landing / entry screen
├── components/             # Reusable UI components
├── constants/              # Static constants (colours, config)
├── contexts/               # React Context providers
├── hooks/                  # Custom React hooks
├── services/               # Business logic & external integrations
├── types/                  # TypeScript type definitions
├── utils/                  # Pure utility functions
├── assets/                 # Images, fonts, icons
├── docs/                   # Project documentation
├── supabase/               # Supabase config & edge functions
├── app.json                # Expo app configuration
├── eas.json                # EAS Build profiles
└── tsconfig.json           # TypeScript configuration
```

---

## `app/` — Screens & Routing

Expo Router uses the filesystem as the route table.

| Path | Route |
|---|---|
| `app/(tabs)/index.tsx` | `/(tabs)` — Home feed |
| `app/(tabs)/cart.tsx` | `/(tabs)/cart` — Shopping cart |
| `app/(tabs)/profile.tsx` | `/(tabs)/profile` — User profile |
| `app/product/[id].tsx` | `/product/123` — Product detail |
| `app/camera.tsx` | `/camera` — Mood scanner |
| `app/checkout.tsx` | `/checkout` — Checkout flow |

**Rules:**
- Keep screens focused on UI and user flow.
- Extract heavy logic into `services/` or `hooks/`.
- Use `.web.tsx` suffix for web-specific screen variants.

---

## `components/` — Reusable UI

Shared presentational components used by multiple screens.

Examples:
- `ThemeToggle.tsx` — Dark/light mode button
- `projectRecommendation.web.tsx` — Web-specific recommendation card

**Rules:**
- Components should be pure and receive data via props.
- Do NOT fetch data directly from components — pass it in.

---

## `constants/` — Static Values

App-wide constants that never change at runtime.

- `colors.ts` — Raw colour tokens

---

## `contexts/` — Global State

React Context providers for state that many screens need access to.

| File | Purpose |
|---|---|
| `AuthContext.tsx` | User session, login, logout |
| `CartContext.tsx` | Shopping cart items |
| `ThemeContext.tsx` | Dark mode + mood palette |

**Rules:**
- Keep context providers thin — delegate async work to `services/`.
- Type definitions for context data belong in `types/`, not here.

---

## `hooks/` — Custom React Hooks

Self-contained reusable logic that uses React lifecycle features.

| File | Purpose |
|---|---|
| `useFrameworkReady.ts` | Waits for Expo framework readiness |
| `useMoodDetection.ts` | Passive camera mood detection |

**Rules:**
- Hooks may call `services/` but should not define business logic inline.
- Name hooks `useCamelCase`.

---

## `services/` — Business Logic & APIs

This is where the "work" happens: API calls, AI inference, notifications, etc.

| File | Purpose |
|---|---|
| `supabase.ts` | Supabase client + auth recovery |
| `moodDetection.ts` | Gemini vision API for mood scanning |
| `recommendations.ts` | Product scoring & recommendation engine |
| `notifications.ts` | Local push + browser notifications |
| `notifyUser.ts` | In-app notification insertions |
| `push.ts` | Remote push via Supabase Edge Functions |

**Rules:**
- Services are plain TypeScript — no JSX.
- Services may import from `types/`, `utils/`, and other `services/`.
- Avoid importing from `contexts/` or `hooks/` to prevent circular dependencies.

---

## `types/` — Type Definitions

Centralised TypeScript types and interfaces.

| File | Exports |
|---|---|
| `database.ts` | `Profile`, `Product`, `CartItem`, `Order`, `Mood` |
| `mood.ts` | `MoodKey`, `MoodPalette`, `MoodDetectionResult` |
| `theme.ts` | `BaseTheme`, `AppTheme` |
| `recommendations.ts` | `ScoredProduct` |

**Rules:**
- Types must not import from `services/`, `contexts/`, or `hooks/`.
- Types may import from other `types/` files.
- If you add a new domain entity, create a new file here.

---

## `utils/` — Pure Helpers

Stateless helper functions.

| File | Purpose |
|---|---|
| `images.ts` | Resolve product image URLs (Supabase storage or fallback) |

**Rules:**
- Utilities should have no side effects.
- Utilities may import from `types/` and `services/`.

---

## `supabase/` — Backend Config

- `config.toml` — Supabase CLI configuration
- `functions/` — Edge Functions (e.g. `detect-mood`)
- `migrations/` — Database schema migrations

---

## Quick Reference: Where Does My New File Go?

| If you are adding… | Put it in |
|---|---|
| A new screen | `app/` |
| A reusable UI piece | `components/` |
| A new API client or algorithm | `services/` |
| A new type/interface | `types/` |
| A new React hook | `hooks/` |
| A new context provider | `contexts/` |
| A static constant | `constants/` |
| A pure helper function | `utils/` |
