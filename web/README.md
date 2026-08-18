# Animo — LGU Console (web)

Web module for the LGU monitoring console. Shares the Animo design language with
the Expo app in [`../mobile`](../mobile).

## Stack

React 19 · TypeScript · Vite · React Router · Lucide icons · Plus Jakarta Sans.

## Getting started

```bash
npm install
cp .env.example .env   # same Supabase project as ../mobile
npm run dev            # http://localhost:5173
npm run build          # typecheck + production bundle into dist/
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env` (mirror the mobile
project’s `EXPO_PUBLIC_SUPABASE_*` values). The console reads public tables only;
stub login in `App.tsx` is unchanged.

## Layout

```
src/
  App.tsx                  routes + stubbed auth state
  assets/animo/            logo icon (green PNG + white SVG)
  components/
    animo-mark.tsx         AnimoMark (logo tile) + AnimoLockup (tile + wordmark)
    console-layout.tsx     sidebar shell shared by every console page
    labeled-input.tsx      text field (label / icon / trailing / hint)
  constants/
    animo.ts               design tokens, mirrors mobile/src/constants/animo.ts
    dashboard.ts           placeholder data for all pages
  pages/
    login.tsx              split brand panel + credentials form
    dashboard.tsx          metrics, price benchmark, volatility log
    advisory.tsx           advisory status per barangay
    messages.tsx           trigger alert feed + summary sidebar
    farmers.tsx            farmer registry table
    settings.tsx           profile, security, legal
  styles/global.css        CSS custom properties + shared primitives
```

## Routes

`/login` · `/dashboard` · `/advisory` · `/messages` · `/farmers` · `/settings`

Console routes redirect to `/login` while signed out.

## Logo

Two components in `src/components/animo-mark.tsx`:

- **`AnimoWordmark`** — the full white lockup (farmer icon + drawn ANIMO
  lettering) as one piece of artwork, used on the login brand panel. Give it a
  `height`; the width follows the artwork's 2780 × 775 ratio.
- **`AnimoMark`** — just the icon on a rounded tile, used in the sidebar. It
  picks the asset that suits the background: `tone="green"` (white icon on a
  green tile) for white surfaces, `tone="light"` (green icon on a white tile)
  for the brand green panel.

`wordmark-white.png` was extracted from `icon-white-animo.svg` — that SVG holds
the lockup as an embedded raster inside a square viewBox that crops it, so it
can't be used directly. The extract is trimmed to the artwork bounds with
luminance mapped to alpha, giving a transparent white lockup that sits cleanly
on the green panel.

## Design tokens

`src/constants/animo.ts` and the custom properties in `src/styles/global.css`
both mirror `mobile/src/constants/animo.ts` — brand green `#1A6E1E`, black
`#121212` / `#424242`, white background, Plus Jakarta Sans, Lucide icons. When a
token changes in the mobile app, update all three so the two clients stay in
step. Prefer the `--animo-*` variables over literal hex values in new styles.

## Scaffold notes

- **Auth is stubbed.** `App.tsx` holds `signedIn` in local state; submitting the
  login form flips it and routes to `/dashboard`. Swap for the real session hook
  when the API lands.
- **Dashboard and farmers pages read live Supabase data** via `src/services/lgu-console-service.ts`
  (`marketpricefeed`, `palay_price_history`, `nfa_intervention_window`, `lgu_farmer_registry`).
  PSA sync, NFA toggle, and farmer registration stay disabled until LGU auth exists.
  Other pages still use placeholder data in `src/constants/dashboard.ts`.
- **Farmer-action reporting is deliberately out of scope.** Advance cut, delayed
  harvest and no-action figures — and the panels that summarize them — are
  omitted throughout; advisory tracking covers issuance and delivery only.
- Row-level actions (legal links, security rows, "Markahan lahat bilang nabasa",
  "Baguhin", "Tingnan ang detalye") are rendered but not yet wired.
