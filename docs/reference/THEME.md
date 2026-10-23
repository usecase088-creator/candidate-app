# Theme reference (candidate website)

Source: `../job/candidates/src/styles.css` @ `conflict-resolution1` / `3fa6885` (Tailwind v4, shadcn tokens).
Hex values were computed with an OKLCH → sRGB script (Björn Ottosson's OKLab matrices, clamped to sRGB,
rounded), not by eye. The script was checked against pure white, black, red, green and blue.

**Light theme only.** `styles.css` has no `.dark` block (D11).

## Colours (`:root`, `styles.css:75-129`)

| Token | Source | Hex |
| --- | --- | --- |
| `--background` | `oklch(0.985 0.005 240)` | `#F7FBFD` |
| `--surface` | `oklch(1 0 0)` | `#FFFFFF` |
| `--surface-2` | `oklch(0.975 0.008 240)` | `#F2F8FC` |
| `--foreground` | `oklch(0.18 0.03 260)` | `#0A121F` |
| `--card` | `oklch(1 0 0)` | `#FFFFFF` |
| `--card-foreground` | `oklch(0.18 0.03 260)` | `#0A121F` |
| `--popover` | `oklch(1 0 0)` | `#FFFFFF` |
| `--popover-foreground` | `oklch(0.18 0.03 260)` | `#0A121F` |
| `--navy` | `oklch(0.21 0.05 265)` | `#0D172F` |
| `--navy-foreground` | `oklch(0.985 0.005 240)` | `#F7FBFD` |
| `--primary` | `oklch(0.21 0.05 265)` | `#0D172F` |
| `--primary-foreground` | `oklch(0.985 0.005 240)` | `#F7FBFD` |
| `--brand` | `oklch(0.55 0.18 262)` | `#326AD9` |
| `--brand-foreground` | `oklch(0.985 0.005 240)` | `#F7FBFD` |
| `--brand-soft` | `oklch(0.95 0.03 255)` | `#E1F0FF` ¹ |
| `--secondary` | `oklch(0.965 0.01 255)` | `#EFF4FA` |
| `--secondary-foreground` | `oklch(0.21 0.05 265)` | `#0D172F` |
| `--muted` | `oklch(0.965 0.01 255)` | `#EFF4FA` |
| `--muted-foreground` | `oklch(0.5 0.03 258)` | `#596475` |
| `--accent` | `oklch(0.95 0.03 255)` | `#E1F0FF` ¹ |
| `--accent-foreground` | `oklch(0.21 0.05 265)` | `#0D172F` |
| `--destructive` | `oklch(0.6 0.21 25)` | `#E23439` |
| `--destructive-foreground` | `oklch(0.985 0.005 240)` | `#F7FBFD` |
| `--success` | `oklch(0.62 0.14 250)` | `#398AD6` ² |
| `--warning` | `oklch(0.75 0.13 75)` | `#DEA143` |
| `--border` | `oklch(0.885 0.012 255)` | `#D4DAE1` |
| `--input` | `oklch(0.885 0.012 255)` | `#D4DAE1` |
| `--ring` | `oklch(0.55 0.18 262)` | `#326AD9` |
| `--chart-1` | `oklch(0.55 0.18 262)` | `#326AD9` |
| `--chart-2` | `oklch(0.65 0.14 258)` | `#568FE3` |
| `--chart-3` | `oklch(0.45 0.15 268)` | `#324CA7` |
| `--chart-4` | `oklch(0.75 0.1 255)` | `#82B1ED` |
| `--chart-5` | `oklch(0.35 0.12 270)` | `#233278` |
| `--sidebar-border` | `oklch(0.92 0.01 255)` | `#E0E5EB` |

Sidebar tokens other than `--sidebar-border` repeat the values above. Not needed in the app.

¹ Slightly outside sRGB; clamped. Visual difference is negligible.
² `--success` is **blue**, not green. Success-looking UI on the site (offer, joined) uses Tailwind `emerald-*` instead.

### Other colours used by candidate screens

| Where | Source | Hex |
| --- | --- | --- |
| Signup button gradient (`.btn-shiny-premium`, `styles.css:351`), 135°, stops 0 / 45 / 80 / 100 % | `oklch(0.22 0.06 265)` → `oklch(0.48 0.18 262)` → `oklch(0.35 0.12 268)` → `oklch(0.22 0.06 265)` | `#0D1936` → `#1D54C1` → `#203378` → `#0D1936` |
| Signup checkbox accent (`auth.tsx`) | `oklch(0.58 0.16 258)` | `#3778D7` |
| Status pills, action cards (`lib/applicationStatus.ts`) | Tailwind v4 palette: `indigo-500/700/900`, `amber-500/600/700/800/900`, `emerald-500/600/700/800/900`, `sky-500/800` at 15 % background / 30 % border | **Take exact values from `tailwindcss/theme.css` when building `src/theme/tokens.ts` (Task 6).** Not copied here from memory. |
| Gov jobs hero / buttons (`gov-jobs.tsx`, inline styles) | `#0f172a`, `#1c3a2e`, `#14532d`, `#15803d`, deadline red `#ef4444`, amber `#d97706`, muted `#94a3b8`, `#475569` | as written |
| International visa badges (`foreign-jobs.tsx`) | Sponsorship `#dcfce7`/`#15803d`, Employer `#dbeafe`/`#1d4ed8`, Depends `#fef9c3`/`#854d0e`, Self `#f3e8ff`/`#6b21a8`, Not Required `#f1f5f9`/`#475569`, TBD `#f1f5f9`/`#94a3b8` | as written (bg / text) |

## Radius (`styles.css:16-22, 76`)

`--radius: 0.75rem` = **12 px** at a 16 px root.

| Token | Formula | px |
| --- | --- | --- |
| `sm` | radius − 4 | 8 |
| `md` | radius − 2 | 10 |
| `lg` | radius | 12 |
| `xl` | radius + 4 | 16 |
| `2xl` | radius + 8 | 20 |
| `3xl` | radius + 12 | 24 |
| `4xl` | radius + 16 | 28 |

Common uses: inputs/buttons `rounded-md` (10), cards `rounded-2xl` (20), auth tabs `rounded-xl` (16), pills `rounded-full`.

## Typography

- Font: **Inter**, weights 400, 500, 600, 700, 800 (Google Fonts, `candidates/index.html:20`). `--font-sans` and
  `--font-display` are both Inter.
- `font-feature-settings: "cv11", "ss01", "ss03"` on body; headings `letter-spacing: -0.02em` (`styles.css:132-151`).
- Common sizes on auth screens: page title 24 px (`text-2xl`, 30 px from `sm`), body 14 px (`text-sm`), labels and
  helper text 12 px (`text-xs`), small badges 10–11 px. Forgot-password title 28 px.
- App: `@expo-google-fonts/inter`. RN does not support `font-feature-settings` the same way; ignore them.

## Shadows (`styles.css:70-72`)

| Token | CSS |
| --- | --- |
| `shadow-soft` | `0 1px 3px rgba(15,23,42,0.06), 0 2px 6px rgba(15,23,42,0.07)` |
| `shadow-card` | `0 1px 3px rgba(15,23,42,0.06), 0 10px 28px -10px rgba(15,23,42,0.12)` |
| `shadow-pop` | `0 10px 40px -10px rgba(11,30,63,0.18)` |

RN: the `boxShadow` style prop (new architecture) accepts these strings. Check how they look on the Android phone in Task 6.

## Notes for the app

1. Light theme only. When the phone is in dark mode the app keeps the light palette (D11); set
   `userInterfaceStyle: "light"` and make sure status bar icons stay dark.
2. Contrast (WCAG, computed): `--brand` on `--background` **4.80:1** and on white 5.00:1 (AA pass);
   `--muted-foreground` on white **5.99:1** (pass); `--primary-foreground` on `--primary` 17:1.
   **`--destructive` text on white is 4.39:1 — fails AA for small text**, and the site uses it for 12 px error
   messages. The app should keep the hue but darken error *text* slightly (needs a DECISIONS entry) or use ≥ 14 pt bold.
3. Gradients (signup button, gov jobs hero) need `expo-linear-gradient` (Expo SDK package) — or a flat
   `--brand`/`--navy` fallback. Decide in Task 6.
4. Lottie animations are used across the site (`/public/*.json`). `lottie-react-native` is a third-party library
   (Expo documents it, but it is not an `expo-*` SDK package) → ask Raj before adding (CLAUDE.md). Fallback: static icons.
5. Gov and international screens use hard-coded inline colours, not tokens. Put them in `src/theme/` as named tokens.
