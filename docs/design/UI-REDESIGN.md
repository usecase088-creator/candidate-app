# UI redesign: making the app feel premium (proposal, 2026-11-21)

Why: the client tested the Android preview build and said the flows work but the app "does not feel premium: broken spacing,
fonts very big in places". Six screen-group audits (frame-by-frame on the iPhone SE recordings plus the code) and a code
inventory agree: the problem is the SYSTEM, not individual screens. Colours and theme stay the website's (navy + brand blue,
Inter); the layout, type ramp, spacing, chrome, feedback and motion change. Website wording stays.

Sources (local, not committed): `scratchpad/research/premium-ui-principles.md` (37-point checklist), `ui-inventory.md`,
`audit/A-auth.md` … `F-profile-notifications.md`. Skills installed in `.claude/skills/` (mobile-design, mobile-design-review,
expo-design-system, expo-animation, refactoring-ui).

## 1. What is wrong, in one page (ranked by how much it costs us)

1. **Two headers on every tab and a fake header on every pushed screen.** TopBar 56 pt + a 24 pt page title; pushed screens
   draw a ghost "← Back…" Button that stretches full width with a centred label (bug: `fullWidth={false}` is a no-op,
   `Button.tsx:95-104`; 15 call sites). Content starts 110-525 pt down. No swipe-back title, no native feel.
2. **Type ramp one step too large and used without a ladder.** `title` 24/700 is used 26 times: page titles, the job role,
   the salary, the Home headline, "Choose one way to apply". Card titles are 16-18 where 16/600 is the norm; the website
   runs on 11-14 px. No app-wide font-scale cap (only 5 of 255 texts are capped), so on an Android phone at 1.15-1.3x
   everything grows unevenly: that is the "fonts very big in places".
3. **Screens built from stacks of 48 pt full-width buttons.** Profile (6-7 buttons), Settings (5, one filled red), Home quick
   links (3), every JobCard ("View Details"), every Gov card ("View / Apply"), builder Back/Next. A JobCard is 300 pt tall:
   1.7 jobs per screen; the Home header fills 61 % of the viewport before the first job.
4. **Primary actions buried.** Apply Now is 2.5-4 screens down inside the salary card; Quick Apply is the last element of
   the chooser; the interview/offer buttons are below the fold on an SE.
5. **No touch feedback.** 3 of 24 pressables react; no ripple, no haptics; Reanimated 4 is installed and unused. Toasts pop
   without animation and cover the bell/tab control.
6. **Card soup.** 1-px #D4DAE1 bordered cards everywhere, cards inside cards, six radii (4/8/10/12/16/20), stat tiles that
   repeat the header meta, uppercase tracked micro-labels wrapping to two lines as section headers.
7. **Palette leaks and double meanings.** A second blue (`checkbox` #3778D7), Tailwind visa colours, #FEF3C7/#FDE68A
   yellow boxes, navy used both as text ink and as fills in lists, brand blue as "success". Status colour means stage, not
   "does this need me".
8. **Forms.** Inputs have no focus state; " *" appended as text; textarea 48 pt tall; validation shown twice; keyboard hides
   the Search field; CTAs scroll away under the keyboard.
9. **Lists.** No truncation (6 `numberOfLines` in 255 texts), no tabular figures, logos fall back to a grey building icon,
   skeletons do not match the rows (layout jumps), filters in a full-screen Modal instead of a sheet.
10. **Leftovers.** Expo template blue #208AEF splash/notification colour, `Alert.alert` confirms, mixed Title Case / sentence
    case, glyph icons (✓ ✕ × ← •) next to real symbols, iOS and Android icon sets that differ.

## 2. The system (decided unless marked "ask")

### Colour
Unchanged website palette (`tokens.ts`). Roles made explicit: `foreground`/`navy` = ink and the single primary button;
`brand` = the one interactive accent (links, selected chips, tabs, focus ring, match %); `brandSoft` = selected/tonal fills.
Add: `separator #E5E9EF`, `placeholder #8A94A6`, `successSoft #E6F6EE` + `successText #1E8E5A` (the website already uses
emerald for application statuses; its `--success` blue stays for the website). Remove `checkbox` (use `brand`) and the raw
Tailwind visa colours (map to the four semantic tint pairs). Splash and notification colour become `navy`/`brand`.

### Type (Inter, as the website; identical on both platforms)
| Variant | Size/line | Weight | Tracking | Max font scale | Use |
| --- | --- | --- | --- | --- | --- |
| display | 28/34 | 700 | -0.5 | 1.4 | auth hero titles only |
| title | 22/28 | 600 | -0.3 | 1.4 | screen titles without a native header, job role |
| heading | 17/22 | 600 | 0 | 1.5 | section headers, panel titles |
| rowTitle | 16/22 | 600 | 0 | 1.5 | list rows, card titles |
| body | 15/20 | 400 | 0 | 2.0 | default text, inputs |
| secondary | 13/18 | 400 | 0 | 2.0 | meta lines |
| label | 14/20 | 500 | 0 | 1.3 | form labels, segmented controls |
| caption | 12/16 | 500 | 0 | 1.3 | pills, badges, timestamps |
| button | 15/20 | 600 | 0 | 1.3 | button labels |
Rules: at most 4 variants per screen; weight and colour de-emphasise, not size; `tabular` prop (`fontVariant`) on money,
counts, dates, OTP; `numberOfLines` on every list text.

### Spacing, radius, borders, shadow
Spacing scale unchanged (4-pt). Screen margin 16 everywhere. Section gap 24, heading-to-content 8, label-to-field 6, rows
12 inside a group, group gap >= 2x in-group gap. Radius family: `sm 8` (small controls), `md 12` (buttons, inputs, cards,
panels), `lg 20` (sheets, iOS) / 28 (sheets, Android), `full` (pills, chips, avatars). Nested radius = outer - padding.
Borders: hairline `separator`; no 1-px dark borders on cards. Surfaces: canvas `background`, cards white with
`shadows.soft` (iOS) or tonal `surface2` (Android), never border + shadow.

### Components (shared, `src/components/ui`)
- `Button`: fix `fullWidth`; sizes `lg 48` / `md 44` / `sm 36`; radius 12; label 15/600; variants `primary` (navy),
  `secondary` (surface2), `ghost`, `destructive`, `destructiveText`; press = scale 0.97 + opacity 0.9 (iOS) / ripple
  (Android); loading keeps width; disabled = muted fill, not opacity. `gradient` only on Create account.
- new `PressableScale`: Reanimated 4 `withSpring(0.97, {damping 15, stiffness 300})`, `android_ripple rgba(10,18,31,0.08)`,
  Reduce Motion = opacity only. Used by rows, cards, chips, icon buttons, the search bar, the bell.
- new `ListRow` / `ListGroup` / `Separator` / `SectionHeader`: 52-72 pt rows, leading icon/logo slot, trailing chevron /
  value / switch, hairline inset 16, iOS grouped radius 12, Android flat.
- new `JobRow` (replaces `JobCard` in Home, Search, Saved): logo 40, role 16/600, hospital 14 + inline verified, meta 13,
  salary 15/600 tabular + match pill; ~116 pt; whole row pressable, bookmark a sibling 44-pt target; no button.
- `Chip`: 32 pt pill, 13/500, tonal idle, `brandSoft` + `brand` selected, pressed state, hitSlop to 44, selection haptic.
- new `Pill` (status/verified/match): 22 pt, 12/600, `tone` from the 4 semantic roles.
- `TextInput`: 48 pt, radius 12, text 15, placeholder token, focus ring 1.5 `brand`, error 1.5 `destructive` + 13-pt
  message, `required` prop, `labelAccessory` slot ("Forgot password?"), textarea min 96. new `SearchField` (44 pt, leading
  icon, trailing clear icon, sticky).
- `OtpInput`: 52 tall, radius 12, 22/600 tabular, `onComplete`. `Checkbox` 22/radius 6 with an `Icon` check. `Stepper` 36-pt
  pill.
- new `LogoTile`/`Avatar`: initials on a deterministic tint from 6 tokens, expo-image placeholder; sizes 40/48/56/88.
- `Toast`: slide + fade 220/180 ms, icon, semantic colours, bottom-anchored above the tab bar on tabs / below the header
  on pushed screens, swipe to dismiss.
- `Skeleton`: shimmer + `JobRowSkeleton`/`ListRowSkeleton` matching real heights. `EmptyState`/`ErrorState`: 64-pt tinted
  icon circle, title 17, one sentence, one self-sized action.
- new `StickyActionBar` (CTA pinned above the bottom inset, hidden while the keyboard is up), `Panel` (tinted by tone, icon
  + 16/600 title, near-black body), `ProgressSegments` + `VerticalTimeline` (applications), `BottomSheet` via Expo Router
  `presentation: 'formSheet'` with detents (no new library unless Android needs it).
- `Icon`: single entry point; glyph characters (✓ ✕ × ← •) removed everywhere.

### Chrome and navigation
- Pushed screens: **native stack headers** (`headerShown: true`, back chevron, 17/600 title, hairline, no shadow); the 15
  ghost "← Back" buttons go. **ask Raj** (navigation structure, CLAUDE.md).
- Tabs: keep Expo Router JS tabs; TopBar slims to 44 pt and carries the tab title (wordmark on Home only) + bell; filled
  icons when focused; 11-pt labels capped 1.3 (unchanged). No second title inside the tab screens.
- Transitions: platform defaults. Sheets for filters and pickers; full-screen only for multi-step tasks.

### Motion and feedback
Press 120 ms, enter 220, exit 180, step 250; ease-out; transform + opacity only; Reduce Motion honoured. Haptics via
`expo-haptics` (Expo SDK; **ask Raj**: new native package): selection on chip/segment change, light impact on save/toggle,
medium on Apply/submit landing, notification success/error on outcomes; never on plain navigation taps.

### States
Skeletons that match rows; `RefreshControl` tinted brand on every list, never driven by background refetch; empty states with
distinct copy for "no results" vs "nothing yet"; errors inline with Retry; `Alert.alert` only for destructive confirms.

## 3. Screen plan (what changes where)

| Group | Main changes |
| --- | --- |
| Home / Saved | 44-pt TopBar; search field first; Govt / International as one row of two tiles; JobRow list (4-5 per screen); rail without the panel; match % as a pill; initials logos; empty state |
| Search / Filters | sticky `SearchField`; results count line; filter **bottom sheet** (2 detents, "Show n roles"); sentence-case section headers; one chip style; Gov/Intl as rows with trailing external-link icon; deadline as a `Pill`; yellow boxes become `EmptyState` |
| Job details / Apply | native header with Save action; role 22 > hospital 15 > one meta line > salary 20 tabular; flat sections with 17/600 headers; stat tiles removed; **sticky Apply bar**; apply methods as icon + title + line rows; questions form craft (focus, required, textarea, single error, return key); dedicated success screen holding the push pre-prompt |
| Applications | card 248 -> ~130 pt: pill + 5-segment bar + optional action row; colour by "needs you / waiting / done / closed"; detail: header, identity <= 88 pt, action panel first, vertical timeline, "View job" row; panels de-coloured; buttons disciplined |
| Profile / Settings / Notifications | Profile hero (avatar 88 + name + completeness ring + 2-3 missing items) and two grouped lists; Settings grouped list with Delete as a red-text row; builder sticky Back/Continue bar and pickers instead of 36-chip radios; notifications as flat 72-pt rows (icon, bold unread, relative time) |
| Auth | designed rhythm (8/24), 28/700 hero titles, 48-pt inputs with focus ring, "Forgot password?" on the label row, 40-pt segmented tab control without the "New" badge, OTP auto-submit, keyboard-safe CTA, animated toast off the controls, success step with a Sign in button; Delete account restructured |

## 4. Order of work (each step: tests first, `npm run check`, simulator/phone check, small commits)

1. **Foundation** (unblocks everything): tokens, `Text` ramp + caps + tabular, `Button` fix/sizes/press, `PressableScale`,
   `ListRow` family, `Chip`, `Pill`, `TextInput` focus/required, `Toast`, `LogoTile`, `SectionHeader`, `EmptyState`; native
   headers on pushed routes + 44-pt TopBar; splash/notification colour. Large-text test suite extended to every variant.
2. **Home, Search, Saved, Gov, Intl** (what the client sees first).
3. **Job details + Apply.**
4. **Applications.**
5. **Profile, Settings, Notifications, Auth.**
6. Maestro flows re-run on Android and the iPhone SE; new preview build (ask); client re-test.

Verification per step: Jest + RNTL (behaviour, a11y labels, font-scale 2 layout), check sheets from the iPhone simulator
workflow and the Android phone at 320 dp / font scale 2 (`docs/store/STAGE-2-REPORT.md` method), the 37-point checklist
scored per screen (target 35/37, no fails on items 1, 6, 7, 9, 13, 14, 21, 26, 28, 33, 34).

## 5. Decisions needed from Raj

1. Native stack headers on pushed screens (navigation structure change; removes the ghost Back buttons). Recommended: yes.
2. `expo-haptics` (Expo SDK package, native; needs a new build, which the redesign needs anyway). Recommended: yes.
3. `react-native-svg` (Expo SDK) for the match ring and the profile completeness ring; otherwise a View-based ring with
   slightly rougher edges. Recommended: yes.
4. Sentence case for all app labels (website is mixed); Maestro flows that assert exact button text are updated with it.
   Recommended: yes, keep website wording for messages and headings.
5. Application status colour means "needs you / waiting / done / closed" instead of "stage" (amends D27 item 4). Recommended: yes.
