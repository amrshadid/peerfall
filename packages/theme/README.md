# @peerfall/theme

The "Section 2" design tokens as plain values: the day and night prints, typography, spacing,
motion, and colour maths. The app's design system turns them into CSS.

> **Note:** values and pure functions only, no components or styles. See `docs/BRAND.md` for how
> they are used.

## Structure

```
src/
├── palettes/
│   ├── day-print.palette.ts        → DAY_PRINT, the light default
│   └── night-print.palette.ts      → NIGHT_PRINT, the dark theme
├── types/definitions/
│   ├── palette.ts                  → Palette (one key per CSS custom property), HexColor, PrintName
│   └── config.ts                   → ThemeConfig
├── typography/typography.constants.ts → Archivo + IBM Plex Mono: faces, widths, weights, sizes
├── spacing/spacing.constants.ts    → rule widths, radius, icon grid, default UI scale
├── motion/motion.constants.ts      → durations, easing, the reduced-motion duration
├── utils/
│   ├── color/contrast.util.ts      → WCAG contrast ratio and luminance
│   └── css/css-variables.util.ts   → palettes and shared tokens as CSS custom properties
├── theme.ts                        → PRINTS and every token in one object
├── config.ts                       → configureTheme(): default print and default UI scale
└── index.ts                        → Barrel export
```

## Key Features

- **Two prints:** light-first "Day print" and the "Night print" dark theme, with the same tokens.
  Tests hold every pair in BRAND.md's contrast tables to WCAG AA and to its published ratio.
- **One source of truth:** every colour, size and duration the app uses comes from here;
  `paletteVariables` and `sharedVariables` give them as CSS custom properties.

## Dependencies

None.
