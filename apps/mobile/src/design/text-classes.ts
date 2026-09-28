/** Pure text-style helpers (no font assets), so they can be unit-tested. */
import type { FontFamily, FontWeight } from '@/design/fonts';

/**
 * The prototype's type scale (index.css `.text-*` utilities). Sizes are applied as classes so a
 * component can still override them with its own `text-[..]` / `leading-[..]` classes.
 */
export const VARIANTS = {
  'display-hero': {
    family: 'rubik',
    weight: 900,
    className: 'text-[40px] leading-[48px] tracking-[-0.8px]',
  },
  'display-hero-mobile': { family: 'rubik', weight: 900, className: 'text-[32px] leading-[38px]' },
  'headline-lg': { family: 'rubik', weight: 800, className: 'text-[28px] leading-[36px]' },
  'headline-md': { family: 'rubik', weight: 700, className: 'text-[22px] leading-[30px]' },
  'headline-sm': { family: 'rubik', weight: 700, className: 'text-[18px] leading-[26px]' },
  'body-lg': { family: 'jakarta', weight: 500, className: 'text-[16px] leading-[24px]' },
  'body-md': { family: 'jakarta', weight: 400, className: 'text-[14px] leading-[22px]' },
  'body-sm': { family: 'jakarta', weight: 400, className: 'text-[12px] leading-[18px]' },
  'label-numeral-lg': {
    family: 'grotesk',
    weight: 700,
    className: 'text-[24px] leading-[28px] tracking-[-0.24px]',
  },
  'label-numeral-md': { family: 'grotesk', weight: 700, className: 'text-[16px] leading-[20px]' },
  'label-tag': {
    family: 'grotesk',
    weight: 600,
    className: 'text-[11px] leading-[14px] tracking-[0.55px]',
  },
} as const satisfies Record<string, { family: FontFamily; weight: FontWeight; className: string }>;

export type TextVariant = keyof typeof VARIANTS;

const WEIGHT_CLASSES: Record<string, FontWeight> = {
  'font-normal': 400,
  'font-medium': 500,
  'font-semibold': 600,
  'font-bold': 700,
  'font-extrabold': 800,
  'font-black': 900,
};

const ARABIC = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;

export function containsArabic(text: string): boolean {
  return ARABIC.test(text);
}

/**
 * Splits a Text className into what NativeWind should style and what the Text primitive
 * resolves itself: `font-*` weights become a font file, and letter-spacing is dropped for
 * Arabic, where tracking would break the joined script.
 */
export function resolveTextClasses(
  className: string,
  opts: { variant?: TextVariant; arabic: boolean },
): { className: string; weight: FontWeight | null } {
  let weight: FontWeight | null = null;
  const own = className.split(/\s+/).filter(Boolean);
  const kept = own.filter((cls) => {
    const w = WEIGHT_CLASSES[cls];
    if (w) {
      weight = w;
      return false;
    }
    if (opts.arabic && /^tracking-/.test(cls)) return false;
    return true;
  });
  const variantClasses = opts.variant ? VARIANTS[opts.variant].className.split(' ') : [];
  const hasSize = kept.some((c) => /^text-(\[\d|xs$|sm$|base$|lg$|\d?xl$)/.test(c));
  const hasLeading = kept.some((c) => c.startsWith('leading-'));
  const base = variantClasses.filter((c) => {
    if (c.startsWith('text-')) return !hasSize;
    if (c.startsWith('leading-')) return !hasLeading && !hasSize;
    if (c.startsWith('tracking-')) return !opts.arabic;
    return true;
  });
  return { className: [...base, ...kept].join(' '), weight };
}
