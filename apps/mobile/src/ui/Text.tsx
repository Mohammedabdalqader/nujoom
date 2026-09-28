import { Children, isValidElement, type ReactNode } from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import {
  containsArabic,
  fontFile,
  resolveTextClasses,
  VARIANTS,
  type FontFamily,
  type FontWeight,
  type TextVariant,
} from '@/design/typography';

export type TextProps = RNTextProps & {
  /** A type-scale style from the design (family, weight, size, line height, tracking). */
  variant?: TextVariant;
  /** Family when no variant is given. Body copy (jakarta) is the default, as in the prototype. */
  font?: FontFamily;
  className?: string;
  children?: ReactNode;
};

function plainText(node: ReactNode): string {
  let out = '';
  Children.forEach(node, (child) => {
    if (typeof child === 'string' || typeof child === 'number') out += String(child);
    else if (isValidElement<{ children?: ReactNode }>(child))
      out += plainText(child.props.children);
  });
  return out;
}

/**
 * The only text primitive. Resolves the design's family + weight to a bundled font file and
 * drops letter-spacing on Arabic (see design/typography.ts). Colours and sizes are classes.
 */
export function Text({ variant, font, className = '', style, children, ...rest }: TextProps) {
  const arabic = containsArabic(plainText(children));
  const resolved = resolveTextClasses(className, { variant, arabic });
  const family: FontFamily = variant ? VARIANTS[variant].family : (font ?? 'jakarta');
  const weight: FontWeight = resolved.weight ?? (variant ? VARIANTS[variant].weight : 400);
  return (
    <RNText
      {...rest}
      className={resolved.className}
      style={[{ fontFamily: fontFile(family, weight) }, style]}
    >
      {children}
    </RNText>
  );
}
