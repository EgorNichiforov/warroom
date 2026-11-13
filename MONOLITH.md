# MONOLITH · War Room visual identity (5.13.0)

Status: shipped on branch `monolith`, merged to `v5`, live at `/v5/`.
Scope: visual only. No change to data, sync, XP, ranks, business rules, backend or auth.

## 1. Audit of the 5.12 look (what we replaced)

| Area | 5.12 (Classic) | Problem |
|---|---|---|
| Accent | Neon orange `#ffa51f` on near-black | Shouts on every surface; primary buttons, chips, bars and warnings all compete |
| Status colours | Neon green, red, cyan, purple, pink | Looks like a game HUD, not a command post |
| Radii | 14–20px everywhere, pill chips | Soft, consumer-app feel |
| Type | Barlow Semi Condensed + Inter | Condensed display is loud; no mono for data |
| Icons | Emoji in most card titles and buttons | Emoji render differently per device and break the tone |
| Hierarchy | Every card looks the same weight | Hard to see the one number that matters |
| Hard-coded colours | ~40 `rgba(255,165,31,…)` and px radii in CSS and JS | Impossible to re-theme |

## 2. Art direction

**Monolith**: a machined object. Obsidian and graphite surfaces, a single bronze accent, engraved hairlines, quiet type and tabular numbers. The interface should feel like an instrument panel that has been used for years: calm until something needs you.

Principles:
1. **One accent.** Bronze marks the one thing to act on: primary button, active nav, current section number. Nothing else is bronze.
2. **Status is desaturated.** Sage for done, clay for missed, slate for info. Never neon.
3. **Numbers are the heroes.** Space Grotesk, tabular, large. Labels are small IBM Plex Mono caps.
4. **Restrained geometry.** Radii 4–12px. Hairline borders, a 1px inner engrave highlight.
5. **Words, not emoji,** in UI chrome. Emoji are hidden next to words and greyed when alone. User data (routine names, notes, chat) is never touched.

## 3. Tokens

All colours, radii and fonts are CSS custom properties. Classic keeps its values through `var(--token, classic-fallback)`.

### Obsidian (dark, default)
| Token | Value | Use |
|---|---|---|
| `--bg` | `#0B0E0F` | page |
| `--bg2` | `#111617` | cards |
| `--bg3` | `#171E1E` | controls, inner surfaces |
| `--bg4` | `#202828` | tracks, selected segment |
| `--line` / `--line2` | `#222B2A` / `#303A38` | hairlines / control borders |
| `--text` `--sub` `--muted` `--dim` | `#E9E7DF` `#CFCDC4` `#A0A69E` `#6E7872` | ink scale |
| `--acc` | `#C0915F` bronze | the one accent |
| `--ok` `--bad` `--warn` `--info` | `#93A98B` `#C2766A` `#D0A05D` `#86A0A6` | status |
| rings | company bronze, body sage, mind slate | `--ring-*` |

### Limestone (light)
`--bg #E8E4DA`, `--bg2 #F3F0E9`, `--text #191C1B`, `--acc #87582E` (darker bronze, 5.3:1 on card), status `#4D6A47 / #9A4334 / #466670`.

### Shape and type
- Radii: `--r 10px` cards, `--r2 6px` inputs, buttons 6px, large buttons 8px, modals 12px. `--rad-N` maps every old px radius.
- Fonts (self-hosted, `fonts/`, cached by the service worker, never fetched remotely):
  Space Grotesk 400–700 (display, numbers), IBM Plex Sans 400–700 (body), IBM Plex Mono 400–600 (labels, codes, times).
- RGB channels for alpha: `--acc-rgb`, `--ok-rgb`, `--bad-rgb`, `--info-rgb` → `rgb(var(--acc-rgb) / .3)`.

## 4. Signature motifs
- **Numbered sections.** Every card title on a screen gets `01 │`, `02 │`… in bronze mono (CSS counters).
- **Mission plate** at the top of HQ: today's dials as one big engraved number, D-days to the goal, a 20-segment tick bar, owners and rank.
- **Precision rings.** Thin butt-capped arcs with a tick scale around the dial.
- **Engraved edges.** 1px inner highlight on cards, a bronze 2px inner edge on the active card.
- **Corner brackets** on the "Now" hero.

## 5. Screens
| Screen | Change |
|---|---|
| HQ / Now | Mission plate first; bronze edge on the action card; numbered sections |
| Dial | Phone number in Space Grotesk, fits one line on a 360px phone; outcome buttons quiet; session bar with bronze edge |
| Train / Food / Stats | Precision rings, desaturated bars and heatmap in bronze steps |
| Intel / Plan / Playbook / Ask | Mono labels, numbered sections, quiet chips |
| More | New Appearance card: Obsidian, Limestone, Classic |
| Nav | Mono caps labels, bronze bar over the active tab; sidebar with bronze rule |
| Modals, toast, inputs | 12px sheets, bronze focus ring, scrim with blur |

## 6. Accessibility and platform
- Focus: 2px bronze `:focus-visible` outline everywhere.
- Contrast (WCAG): body text 14.7:1 dark, 15.1:1 light; bronze on cards 6.5:1 dark, 5.3:1 light; muted text 7.3:1 dark, 6.2:1 light; button ink on bronze 6.7:1. The `--dim` tone (4.0:1) is only for non-essential hints.
- `prefers-reduced-motion` disables all animation; `forced-colors` keeps borders.
- Emoji-only buttons keep their glyph (greyed) and stay readable by screen readers.
- Android: the app loads `/v5/` from GitHub Pages, so no APK rebuild is needed. Fonts are local woff2 files in the PWA cache, so offline works.

## 7. Implementation map
- `monolith.css` (loaded last, `id="mono-css"`): tokens, both themes, component restyles.
- `look.js`: `lookGet`, `setAppearance`, `appearanceCard`, `missionPlate`, the emoji quietener (MutationObserver, UI selectors only).
- `v5.css`, inline CSS in `index.html`, `game.js`: hard-coded colours and radii turned into tokens with Classic fallbacks; ring colours read CSS variables.
- Inline head script applies the saved look before first paint (no flash).
- Appearance is stored per device in `localStorage['wr-look']` and is never synced.

## 8. Rollback
1. On a device: More → Appearance → **Classic**. This disables `monolith.css`; the app looks exactly like 5.12.
2. For everyone: set the default in `lookGet()` to `'classic'`, or remove the `mono-css` link. No data migration either way.

## 9. Not done yet (next passes)
- Replace emoji inside user-editable routine and block names with an icon picker (data change, so out of scope here).
- A dedicated distraction-free dial "focus mode" layout during a live session.
- Light-theme pass on the screen-time and calendar week grids (they work, but use the dark grid tints).

## 10. Screenshots
`docs/monolith/`: phone (`m_*`, 390px) and desktop (`d_*`, 1280px) for HQ, Dial, Food, Stats, Intel, More; `light_*` for Limestone. Before/after and Classic shots were checked side by side: Classic matches 5.12 pixel for pixel apart from the version label.
