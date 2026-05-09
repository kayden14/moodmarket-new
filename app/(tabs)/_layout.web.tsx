/**
 * app/(tabs)/_layout.web.tsx
 *
 * Web-only layout — minimal shell.
 * All navigation (topnav, sidebar, mood picker, cart) lives in index.web.tsx
 * and other individual screens. This file only:
 *   1. Injects global CSS resets / font imports
 *   2. Renders the Tabs router with no visible tab bar
 */

import { useEffect } from 'react';
import { Tabs } from 'expo-router';

/* ─────────────────────────────────────────────────────────────────────────
   GLOBAL STYLES (injected once into <head>)
───────────────────────────────────────────────────────────────────────── */

const WEB_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { font-family: 'Sora', sans-serif; height: 100%; overflow: hidden; }

  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: rgba(128,128,128,0.3); border-radius: 6px; }

  /* Remove Expo bottom tab bar on web */
  [data-expo-bottom-tabs],
  div[style*="position: absolute"][style*="bottom: 0"][style*="left: 0"][style*="right: 0"] > div[style*="flex-direction: row"] {
    display: none !important;
  }

  /* Remove bottom padding added for mobile tab bar */
  @media (min-width: 769px) {
    [style*="paddingBottom: 90"],
    [style*="padding-bottom: 90px"],
    [style*="marginBottom: 90"],
    [style*="margin-bottom: 90px"],
    [style*="paddingBottom: 110"],
    [style*="padding-bottom: 110px"] {
      padding-bottom: 24px !important;
      margin-bottom: 0 !important;
    }
  }
`;

function GlobalStyleInjector() {
  useEffect(() => {
    if (document.getElementById('mm-web-global-css')) return;
    const el = document.createElement('style');
    el.id = 'mm-web-global-css';
    el.textContent = WEB_CSS;
    document.head.prepend(el);
  }, []);
  return null;
}

/* ─────────────────────────────────────────────────────────────────────────
   LAYOUT EXPORT
───────────────────────────────────────────────────────────────────────── */

export default function WebTabLayout() {
  return (
    <>
      <GlobalStyleInjector />

      {/*
        Tabs with NO visible tab bar on web.
        Navigation is handled per-screen (index.web.tsx has the full
        topnav + sidebar layout).
      */}
      <Tabs
        tabBar={() => null}
        screenOptions={{
          headerShown: false,
          sceneStyle: { paddingBottom: 0 },
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="cart" />
        <Tabs.Screen name="profile" />
        <Tabs.Screen name="notifications" />  {/* ← NEW */}
      </Tabs>
    </>
  );
}