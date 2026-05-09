/**
 * app/(tabs)/_layout.web.tsx
 *
 * Responsive web-only layout shell.
 * Optimized for:
 *  - Phones
 *  - Tablets
 *  - Laptops
 *  - Desktop screens
 */

import { useEffect } from 'react';
import { Tabs } from 'expo-router';

/* ─────────────────────────────────────────────────────────────────────────
   GLOBAL RESPONSIVE STYLES
───────────────────────────────────────────────────────────────────────── */

const WEB_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');

  /* RESET */
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :root {
    --app-padding: 24px;
    --app-radius: 18px;
    --max-width: 1600px;
  }

  html {
    width: 100%;
    min-height: 100%;
    -webkit-text-size-adjust: 100%;
    scroll-behavior: smooth;
  }

  body {
    width: 100%;
    min-height: 100vh;
    overflow-x: hidden;
    overflow-y: auto;
    font-family: 'Sora', sans-serif;
    background: #fff;
    color: #111;
  }

  #root,
  #__next,
  [data-reactroot] {
    width: 100%;
    min-height: 100vh;
  }

  /* Better media defaults */
  img,
  picture,
  video,
  canvas,
  svg {
    display: block;
    max-width: 100%;
  }

  input,
  button,
  textarea,
  select {
    font: inherit;
  }

  button {
    cursor: pointer;
    border: none;
    background: none;
  }

  a {
    text-decoration: none;
    color: inherit;
  }

  /* Scrollbars */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  ::-webkit-scrollbar-track {
    background: transparent;
  }

  ::-webkit-scrollbar-thumb {
    background: rgba(128,128,128,0.25);
    border-radius: 999px;
  }

  /* Remove Expo bottom tabs on web */
  [data-expo-bottom-tabs],
  div[style*="position: absolute"][style*="bottom: 0"][style*="left: 0"][style*="right: 0"] > div[style*="flex-direction: row"] {
    display: none !important;
  }

  /* Prevent accidental horizontal scrolling */
  body,
  div,
  section,
  main {
    max-width: 100%;
  }

  /* RESPONSIVE CONTAINER HELPERS */
  .app-container {
    width: 100%;
    max-width: var(--max-width);
    margin-inline: auto;
    padding-inline: var(--app-padding);
  }

  .responsive-grid {
    display: grid;
    gap: 20px;
  }

  /* ─────────────────────────────────────────────────────
     LARGE DESKTOPS
  ───────────────────────────────────────────────────── */
  @media (min-width: 1440px) {
    :root {
      --app-padding: 40px;
    }

    html {
      font-size: 16px;
    }
  }

  /* ─────────────────────────────────────────────────────
     LAPTOPS
  ───────────────────────────────────────────────────── */
  @media (max-width: 1439px) {
    :root {
      --app-padding: 28px;
    }

    html {
      font-size: 15.5px;
    }
  }

  /* ─────────────────────────────────────────────────────
     TABLETS
  ───────────────────────────────────────────────────── */
  @media (max-width: 1024px) {
    :root {
      --app-padding: 20px;
      --app-radius: 16px;
    }

    html {
      font-size: 15px;
    }

    body {
      overflow-x: hidden;
    }

    /* Better touch interactions */
    button,
    a {
      min-height: 44px;
    }
  }

  /* ─────────────────────────────────────────────────────
     LARGE PHONES
  ───────────────────────────────────────────────────── */
  @media (max-width: 768px) {
    :root {
      --app-padding: 16px;
      --app-radius: 14px;
    }

    html {
      font-size: 14.5px;
    }

    body {
      overflow-x: hidden;
      overflow-y: auto;
    }

    /* Stack layouts automatically */
    .responsive-grid {
      grid-template-columns: 1fr !important;
    }

    /* Prevent fixed-width overflow */
    * {
      min-width: 0;
    }

    /* Better mobile spacing */
    section,
    main {
      width: 100%;
    }
  }

  /* ─────────────────────────────────────────────────────
     SMALL PHONES
  ───────────────────────────────────────────────────── */
  @media (max-width: 480px) {
    :root {
      --app-padding: 12px;
      --app-radius: 12px;
    }

    html {
      font-size: 14px;
    }

    body {
      overflow-x: hidden;
    }

    /* Improve readability */
    h1 { font-size: 1.8rem; }
    h2 { font-size: 1.5rem; }
    h3 { font-size: 1.2rem; }

    p,
    span,
    button,
    input {
      font-size: 0.95rem;
    }
  }

  /* Remove artificial bottom spacing from Expo */
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

      <Tabs
        tabBar={() => null}
        screenOptions={{
          headerShown: false,
          sceneStyle: {
            paddingBottom: 0,
            width: '100%',
          },
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="cart" />
        <Tabs.Screen name="profile" />
        <Tabs.Screen name="notifications" />
      </Tabs>
    </>
  );
}