import { Fragment } from 'react';

import { Text, type TextProps } from '@/ui/Text';

type RichTextProps = TextProps & {
  /** A translated string that may contain `<b>…</b>` highlights. */
  children: string;
  /** Classes for the highlighted parts. */
  boldClassName?: string;
};

/** Renders translations like "بنتيجة <b>5 - 3</b>" with the highlight styled as in the design. */
export function RichText({ children, boldClassName = 'font-bold', ...rest }: RichTextProps) {
  const parts = children.split(/(<b>.*?<\/b>)/g).filter(Boolean);
  return (
    <Text {...rest}>
      {parts.map((part, i) =>
        part.startsWith('<b>') ? (
          <Text key={i} className={boldClassName}>
            {part.slice(3, -4)}
          </Text>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </Text>
  );
}
