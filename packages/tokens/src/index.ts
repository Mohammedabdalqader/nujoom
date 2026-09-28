/**
 * Colour tokens (D-015). Every colour the design prototype used maps to one of these names.
 * Dark is the prototype's default; light is its "daylight" mode. The same names exist as
 * Tailwind colours (`bg-surface-container`, `text-on-surface-variant` …) in global.css, and
 * ThemeProvider swaps the values at runtime. The web app (apps/web) mirrors them in its
 * globals.css, also checked by a test.
 *
 * Only two deviations from the prototype, both in light mode for readability (D-015):
 * `secondary` and `error` text, which the prototype left in their dark-mode colours.
 */
export const palette = {
  dark: {
    surface: '#111317',
    'surface-container-lowest': '#0c0e12',
    'surface-container-low': '#1a1c20',
    'surface-container': '#1e2024',
    'surface-container-high': '#282a2e',
    'surface-container-highest': '#333539',
    'surface-bright': '#37393e',
    'on-surface': '#e2e2e8',
    'on-surface-variant': '#d8c3ad',
    outline: '#a08e7a',
    'outline-variant': '#534434',
    muted: '#8d725a',
    border: '#282a2e',
    'border-strong': '#333539',
    primary: '#ffc174',
    'primary-fixed': '#ffddb8',
    'primary-fixed-dim': '#ffb95f',
    secondary: '#4edea3',
    tertiary: '#ffbcb7',
    error: '#ffb4ab',
    'tint-blue': '#141824',
    'tint-blue-strong': '#1a2035',
    'tint-orange': '#241a14',
    'tint-orange-strong': '#35251a',
    'tint-green': '#18231e',
    'tint-red': '#231a1a',
    chrome: 'rgba(17, 19, 23, 0.88)',
    scrim: 'rgba(0, 0, 0, 0.85)',
  },
  light: {
    surface: '#f8fafc',
    'surface-container-lowest': '#f1f5f9',
    'surface-container-low': '#f1f5f9',
    'surface-container': '#ffffff',
    'surface-container-high': '#f1f5f9',
    'surface-container-highest': '#e2e8f0',
    'surface-bright': '#e2e8f0',
    'on-surface': '#0f172a',
    'on-surface-variant': '#475569',
    outline: '#64748b',
    'outline-variant': '#cbd5e1',
    muted: '#64748b',
    border: '#e2e8f0',
    'border-strong': '#cbd5e1',
    primary: '#b45309',
    'primary-fixed': '#78350f',
    'primary-fixed-dim': '#d97706',
    secondary: '#047857',
    tertiary: '#b91c1c',
    error: '#b91c1c',
    'tint-blue': '#eff6ff',
    'tint-blue-strong': '#dbeafe',
    'tint-orange': '#fffbeb',
    'tint-orange-strong': '#fef3c7',
    'tint-green': '#f0fdf4',
    'tint-red': '#fef2f2',
    chrome: 'rgba(255, 255, 255, 0.92)',
    scrim: 'rgba(15, 23, 42, 0.6)',
  },
} as const;

/** Colours that are the same in both themes (brand fills and their "on" colours). */
export const fixed = {
  'primary-container': '#f59e0b',
  'on-primary': '#472a00',
  'on-primary-container': '#613b00',
  'on-primary-fixed': '#2a1700',
  'secondary-container': '#00a572',
  'on-secondary': '#003824',
  'on-secondary-container': '#00311f',
  'secondary-fixed': '#6ffbbe',
  'emerald-dark': '#003816',
  'error-container': '#93000a',
  'on-error-container': '#ffdad6',
  live: '#ef4444',
  whatsapp: '#25d366',
  'whatsapp-dark': '#20ba5a',
  'team-blue': '#3b82f6',
  'team-blue-light': '#60a5fa',
  'team-blue-strong': '#2563eb',
  'team-blue-deep': '#1d4ed8',
  'team-blue-pale': '#93c5fd',
  'team-orange': '#f97316',
  'team-orange-strong': '#ea580c',
  amber: '#fbbf24',
  'amber-pale': '#fcd34d',
  'amber-deep': '#d97706',
  'amber-dark': '#b45309',
  emerald: '#10b981',
  'emerald-deep': '#047857',
  crimson: '#dc2626',
  'crimson-deep': '#991b1b',
  // The FIFA card keeps its onyx-and-gold look in both themes.
  'card-gold': '#2a2215',
  'card-top': '#1c1812',
  'card-mid': '#14161a',
  'card-bottom': '#0c0e12',
} as const;

export type ThemeName = keyof typeof palette;
export type ThemeColor = keyof (typeof palette)['dark'];
export type FixedColor = keyof typeof fixed;

/** CSS variables for VariableContextProvider (`--color-<token>`). */
export function themeVariables(theme: ThemeName): Record<`--${string}`, string> {
  const vars: Record<`--${string}`, string> = {};
  for (const [name, value] of Object.entries(palette[theme])) vars[`--color-${name}`] = value;
  return vars;
}

/** A resolved colour value for places that cannot use classes (icons, gradients, SVG). */
export function colorOf(theme: ThemeName, name: ThemeColor | FixedColor): string {
  return name in fixed ? fixed[name as FixedColor] : palette[theme][name as ThemeColor];
}
