import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import type { Palette } from '../../theme/colors';
import { fontFamily, scoreFamily, typeScale, type TypeVariant, type Weight } from '../../theme/tokens';

type ColorKey = {
  [K in keyof Palette]: Palette[K] extends string ? K : never;
}[keyof Palette];

export interface AppTextProps extends TextProps {
  variant?: TypeVariant;
  /** A palette key, or any raw colour string. */
  color?: ColorKey | (string & {});
  weight?: Weight;
  align?: TextStyle['textAlign'];
  /** Tabular numerals so scores and times don't jitter as digits change. */
  tabular?: boolean;
  uppercase?: boolean;
  /** Right-to-left content (Urdu). */
  rtl?: boolean;
}

/** Arabic-script letters (Urdu). */
const ARABIC = /[\u0600-\u06FF\u0750-\u077F]/;
/** The first letter of either script decides which way a string reads. */
const FIRST_LETTER = /[A-Za-z\u0600-\u06FF\u0750-\u077F]/;

export function AppText({
  variant = 'body',
  color = 'text',
  weight,
  align,
  tabular,
  uppercase,
  rtl,
  style,
  ...rest
}: AppTextProps) {
  const { colors } = useTheme();
  const t = typeScale[variant];
  const resolved =
    color in colors ? (colors[color as ColorKey] as string) : color;
  // Urdu words in otherwise LTR text (a label, a toggle) get the same treatment as Urdu blocks.
  const text = typeof rest.children === 'string' ? rest.children : undefined;
  const urdu = rtl || (!!text && ARABIC.test(text));
  // Text that starts in Urdu (a comment, a headline) sits on the right, unless the caller aligned it.
  const fromRight = rtl || (!align && !!text && ARABIC.test(text.match(FIRST_LETTER)?.[0] ?? ''));
  // Urdu uses the phone's own Arabic-script font (Inter has none), with room for its taller marks.
  const urduStyle = urdu && {
    fontFamily: undefined,
    fontWeight: (weight ?? t.weight) >= '600' ? ('700' as const) : ('400' as const),
    lineHeight: Math.round(t.line * 1.45),
    letterSpacing: 0,
  };
  return (
    <Text
      allowFontScaling
      maxFontSizeMultiplier={1.6}
      style={[
        {
          fontFamily: (variant.startsWith('score') ? scoreFamily : fontFamily)[weight ?? t.weight],
          fontSize: t.size,
          lineHeight: t.line,
          letterSpacing: t.tracking,
          color: resolved,
          includeFontPadding: false,
        },
        align && { textAlign: align },
        tabular && { fontVariant: ['tabular-nums'] },
        uppercase && { textTransform: 'uppercase' },
        urduStyle,
        fromRight && { writingDirection: 'rtl', textAlign: 'right' },
        style,
      ]}
      {...rest}
    />
  );
}
