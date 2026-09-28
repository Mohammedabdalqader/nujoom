import * as SystemUI from 'expo-system-ui';
import { VariableContextProvider } from 'nativewind';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { sfx } from '@/design/sound';
import { colorOf, palette, themeVariables, type ThemeName } from '@/design/tokens';
import { kv } from '@/lib/kv';

const THEME_KEY = 'settings.theme';

type ThemeContextValue = {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
  /** Resolved colour for places that cannot take a class (icons in SVG, gradients). */
  color: (name: Parameters<typeof colorOf>[1]) => string;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function initialTheme(): ThemeName {
  const saved = kv.get(THEME_KEY);
  // Dark is the street-at-night default (spec §2).
  return saved === 'light' ? 'light' : 'dark';
}

/** Dark/"daylight" theme (D-015): swaps the colour tokens for the whole tree. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(initialTheme);

  useEffect(() => {
    kv.set(THEME_KEY, theme);
    void SystemUI.setBackgroundColorAsync(palette[theme].surface).catch(() => {});
  }, [theme]);

  const setTheme = useCallback((next: ThemeName) => setThemeState(next), []);
  const toggleTheme = useCallback(() => {
    sfx.clipBeep();
    setThemeState((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, toggleTheme, color: (name) => colorOf(theme, name) }),
    [theme, setTheme, toggleTheme],
  );

  return (
    <ThemeContext.Provider value={value}>
      <VariableContextProvider value={theme === 'dark' ? {} : themeVariables('light')}>
        {children}
      </VariableContextProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
