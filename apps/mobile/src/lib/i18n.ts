import { createI18n, DEFAULT_LOCALE, getDirection, isLocale, type Locale } from '@nujoom/i18n';
import { reloadAppAsync } from 'expo';
import { I18nManager, Platform } from 'react-native';

import { kv } from '@/lib/kv';

const LOCALE_KEY = 'settings.locale';
// Guards against a reload loop where the OS refuses the direction change (e.g. Expo Go
// resets RTL preferences on every launch).
const DIRECTION_RELOAD_KEY = 'settings.directionReloadFor';

/** The user's saved choice, else Arabic: the app is Arabic-first whatever the phone's language (D-008). */
export function getInitialLocale(): Locale {
  const stored = kv.get(LOCALE_KEY);
  return isLocale(stored) ? stored : DEFAULT_LOCALE;
}

export const i18n = createI18n(getInitialLocale());

/** Whether the current layout runs right-to-left (web reads the document, native the I18nManager). */
export function isRTL(language: string = i18n.language): boolean {
  if (Platform.OS === 'web') return getDirection(language === 'en' ? 'en' : 'ar') === 'rtl';
  return I18nManager.isRTL;
}

function directionMatches(locale: Locale): boolean {
  return I18nManager.isRTL === (getDirection(locale) === 'rtl');
}

function applyDirection(locale: Locale): void {
  const rtl = getDirection(locale) === 'rtl';
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
}

/**
 * The web preview has no native layout direction: React Native Web lays out rows and start/end
 * styles from the document's `dir`, so set it (and `lang`) directly, without a reload.
 */
function applyWebDirection(locale: Locale): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dir = getDirection(locale);
  document.documentElement.lang = locale;
  // Screens scroll inside their own ScrollView; without this the page grows scrollbars and
  // mobile browsers zoom the whole app out.
  document.documentElement.style.overflow = 'hidden';
}

/**
 * React Native only applies a layout-direction change after a reload. Call once at startup: if the
 * native direction does not match the locale, fix it and reload (once).
 */
export async function ensureLayoutDirection(): Promise<void> {
  const locale = getInitialLocale();
  if (Platform.OS === 'web') {
    applyWebDirection(locale);
    return;
  }
  if (directionMatches(locale)) {
    kv.remove(DIRECTION_RELOAD_KEY);
    return;
  }
  if (kv.get(DIRECTION_RELOAD_KEY) === locale) return; // already tried
  kv.set(DIRECTION_RELOAD_KEY, locale);
  applyDirection(locale);
  await reloadAppAsync('Apply layout direction');
}

/** Switches language, persisting the choice; reloads when the layout direction changes. */
export async function changeLocale(locale: Locale): Promise<void> {
  kv.set(LOCALE_KEY, locale);
  await i18n.changeLanguage(locale);
  if (Platform.OS === 'web') {
    applyWebDirection(locale);
    return;
  }
  if (!directionMatches(locale)) {
    applyDirection(locale);
    kv.set(DIRECTION_RELOAD_KEY, locale);
    await reloadAppAsync('Language changed');
  }
}
