import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';
import { Rubik_400Regular } from '@expo-google-fonts/rubik/400Regular';
import { Rubik_500Medium } from '@expo-google-fonts/rubik/500Medium';
import { Rubik_600SemiBold } from '@expo-google-fonts/rubik/600SemiBold';
import { Rubik_700Bold } from '@expo-google-fonts/rubik/700Bold';
import { Rubik_800ExtraBold } from '@expo-google-fonts/rubik/800ExtraBold';
import { Rubik_900Black } from '@expo-google-fonts/rubik/900Black';
import { SpaceGrotesk_500Medium } from '@expo-google-fonts/space-grotesk/500Medium';
import { SpaceGrotesk_600SemiBold } from '@expo-google-fonts/space-grotesk/600SemiBold';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk/700Bold';

/**
 * The prototype's three families (D-017):
 * - rubik    headlines ("font-headline-*", "font-['Rubik']"); contains Arabic
 * - jakarta  body copy (the page default)
 * - grotesk  numbers, tags and labels ("font-label-*", "font-['Space_Grotesk']")
 * Arabic text in jakarta/grotesk falls back to the system Arabic font, as it does in the
 * prototype on phones.
 *
 * React Native selects a weight by font file, not by `fontWeight`, so every family/weight
 * pair maps to a loaded file. Missing weights fall back to the nearest one.
 */
import type { FontFamily, FontWeight } from '@/design/fonts';

export type { FontFamily, FontWeight };

const FILES: Record<FontFamily, Partial<Record<FontWeight, string>>> = {
  rubik: {
    400: 'Rubik_400Regular',
    500: 'Rubik_500Medium',
    600: 'Rubik_600SemiBold',
    700: 'Rubik_700Bold',
    800: 'Rubik_800ExtraBold',
    900: 'Rubik_900Black',
  },
  jakarta: {
    400: 'PlusJakartaSans_400Regular',
    500: 'PlusJakartaSans_500Medium',
    600: 'PlusJakartaSans_600SemiBold',
    700: 'PlusJakartaSans_700Bold',
    800: 'PlusJakartaSans_800ExtraBold',
  },
  grotesk: {
    500: 'SpaceGrotesk_500Medium',
    600: 'SpaceGrotesk_600SemiBold',
    700: 'SpaceGrotesk_700Bold',
  },
};

export const FONT_ASSETS = {
  Rubik_400Regular,
  Rubik_500Medium,
  Rubik_600SemiBold,
  Rubik_700Bold,
  Rubik_800ExtraBold,
  Rubik_900Black,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
  MaterialSymbolsOutlined: require('../../assets/fonts/MaterialSymbolsOutlined.ttf'),
  MaterialSymbolsOutlinedFilled: require('../../assets/fonts/MaterialSymbolsOutlinedFilled.ttf'),
};

/** The loaded font file for a family and weight (nearest available weight). */
export function fontFile(family: FontFamily, weight: FontWeight): string {
  const files = FILES[family];
  const exact = files[weight];
  if (exact) return exact;
  const available = (Object.keys(files).map(Number) as FontWeight[]).sort(
    (a, b) => Math.abs(a - weight) - Math.abs(b - weight) || b - a,
  );
  return files[available[0]!]!;
}

export {
  containsArabic,
  resolveTextClasses,
  VARIANTS,
  type TextVariant,
} from '@/design/text-classes';
