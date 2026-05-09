# 👩‍💻 Developer Guide

Conventions and tips for working on MoodMarket.

---

## Import Rules

Use path aliases (configured in `tsconfig.json`) instead of relative paths:

```ts
// ✅ Good
import { supabase } from '@/services/supabase';
import { Product } from '@/types/database';

// ❌ Bad
import { supabase } from '../../../services/supabase';
```

### Allowed Import Directions

```
types/      ──▶  types/
utils/      ──▶  types/, services/
services/   ──▶  types/, utils/, services/
hooks/      ──▶  types/, utils/, services/
components/ ──▶  types/, utils/, services/, hooks/, contexts/
contexts/   ──▶  types/, utils/, services/
app/        ──▶  everything
```

**Never import from `contexts/` or `hooks/` into `services/`** — this prevents circular dependencies.

---

## Adding a New Screen

1. Create the file in `app/` (or a subfolder for nested routes).
2. If the screen needs web-specific behaviour, create a `.web.tsx` variant.
3. Keep data fetching in the screen or delegate to a service.
4. Do NOT put business logic directly in the screen — use `services/`.

Example:
```ts
// app/deals.tsx
import { useEffect, useState } from 'react';
import { supabase } from '@/services/supabase';
import { Product } from '@/types/database';

export default function DealsScreen() {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    supabase.from('products').select('*').eq('on_sale', true)
      .then(({ data }) => setProducts(data ?? []));
  }, []);

  // ... render
}
```

---

## Adding a New Service

1. Create a new file in `services/`.
2. Export plain functions or a namespace object.
3. Import types from `types/`.
4. Add unit tests if the logic is complex.

Example:
```ts
// services/deals.ts
import { Product } from '@/types/database';
import { supabase } from './supabase';

export async function getDeals(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('on_sale', true);

  if (error) {
    console.warn('[deals] Failed:', error.message);
    return [];
  }

  return data ?? [];
}
```

---

## Adding a New Type

1. If the type belongs to an existing domain, add it to the relevant `types/*.ts` file.
2. If it's a new domain, create a new file in `types/`.
3. Export it from the file.
4. Import it where needed using `@/types/filename`.

---

## Environment Variables

Only variables prefixed with `EXPO_PUBLIC_` are exposed to the client bundle.

Required:
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_GEMINI_API_KEY` (for mood detection)

Optional:
- `EXPO_PUBLIC_APP_SCHEME` (deep linking)

---

## Running Checks

Before committing, run:

```bash
# Type check
npm run typecheck

# Lint
npm run lint
```

---

## Common Pitfalls

### `expo-notifications` in Expo Go

`expo-notifications` crashes Expo Go. The app lazy-loads it and gracefully degrades. Do NOT import it at the top level.

### Supabase `getPublicUrl`

`supabase.storage.from('bucket').getPublicUrl(path)` returns `{ data: { publicUrl } }`, not `{ publicUrl }`.

### Platform-specific APIs

Always guard native-only APIs:

```ts
import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  // native-only code
}
```

### MoodKey vs string

Use `MoodKey` from `@/types/mood` instead of raw strings for mood values. This gives you autocomplete and compile-time safety.

---

## Need Help?

- Check `docs/PROJECT_STRUCTURE.md` for where files belong.
- Check `docs/ARCHITECTURE.md` for how features connect.
- Check `README.md` for setup and deployment instructions.
