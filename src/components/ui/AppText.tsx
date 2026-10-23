import React from 'react';
import { Text, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import type { Palette } from '../../theme/colors';
import { fontFamily, typeScale, type TypeVariant, type Weight } from '../../theme/tokens';

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
  return (
    <Text
      allowFontScaling
      maxFontSizeMultiplier={1.6}
      style={[
        {
          fontFamily: fontFamily[weight ?? t.weight],
          fontSize: t.size,
          lineHeight: rtl ? t.line * 1.45 : t.line,
          letterSpacing: t.tracking,
          color: resolved,
          includeFontPadding: false,
        },
        align && { textAlign: align },
        tabular && { fontVariant: ['tabular-nums'] },
        uppercase && { textTransform: 'uppercase' },
        // Urdu falls back to the system Naskh font, which Inter doesn't cover.
        rtl && {
          writingDirection: 'rtl',
          textAlign: 'right',
          fontFamily: undefined,
          fontWeight: (weight ?? t.weight) >= '600' ? '700' : '400',
          letterSpacing: 0,
        },
        style,
      ]}
      {...rest}
    />
  );
}
