import { useTranslation } from 'react-i18next';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { GLYPHS, type IconName } from '@/design/icons/glyphs';
import { isRTL } from '@/lib/i18n';

export type IconProps = Omit<RNTextProps, 'children'> & {
  name: IconName;
  size?: number;
  /** Material Symbols FILL=1 (the prototype's `font-variation-settings: 'FILL' 1`). */
  filled?: boolean;
  /**
   * Mirror in left-to-right layouts. The design is drawn for Arabic (RTL), so arrows that point
   * "forward" there must flip in English.
   */
  directional?: boolean;
  className?: string;
};

/** Material Symbols Outlined glyph, coloured with `text-*` classes (D-016). */
export function Icon({
  name,
  size = 24,
  filled,
  directional,
  className = 'text-on-surface',
  style,
  ...rest
}: IconProps) {
  // Subscribing to the language re-renders direction-sensitive icons when it changes: the web
  // preview switches direction without a reload, and a render must not reuse the old direction.
  const { i18n } = useTranslation();
  const flip = directional && !isRTL(i18n.language);
  return (
    <RNText
      {...rest}
      accessible={false}
      importantForAccessibility="no"
      allowFontScaling={false}
      className={className}
      style={[
        {
          fontFamily: filled ? 'MaterialSymbolsOutlinedFilled' : 'MaterialSymbolsOutlined',
          fontSize: size,
          lineHeight: size,
          width: size,
          height: size,
          textAlign: 'center',
          includeFontPadding: false,
        },
        flip ? { transform: [{ scaleX: -1 }] } : null,
        style,
      ]}
    >
      {String.fromCodePoint(GLYPHS[name])}
    </RNText>
  );
}

export type { IconName };
