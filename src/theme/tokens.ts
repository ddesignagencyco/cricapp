/** Spacing scale (4pt grid). The screen gutter is `lg` (16). */
export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

/** Minimum touch target (Android guideline: 48dp). */
export const HIT = 48;

export type Weight = '400' | '500' | '600' | '700';

/** Inter is bundled one file per weight, so each weight is its own family. */
export const fontFamily: Record<Weight, string> = {
  '400': 'Inter-Regular',
  '500': 'Inter-Medium',
  '600': 'Inter-SemiBold',
  '700': 'Inter-Bold',
};

interface TypeStyle {
  size: number;
  line: number;
  weight: Weight;
  tracking: number;
}

export const typeScale = {
  hero: { size: 34, line: 40, weight: '700', tracking: -0.9 },
  display: { size: 28, line: 34, weight: '700', tracking: -0.6 },
  title: { size: 22, line: 28, weight: '700', tracking: -0.4 },
  section: { size: 18, line: 24, weight: '700', tracking: -0.3 },
  headline: { size: 16, line: 22, weight: '600', tracking: -0.2 },
  body: { size: 15, line: 22, weight: '400', tracking: 0 },
  bodySm: { size: 14, line: 20, weight: '400', tracking: 0 },
  label: { size: 13, line: 18, weight: '500', tracking: 0 },
  caption: { size: 12, line: 16, weight: '500', tracking: 0.1 },
  micro: { size: 11, line: 14, weight: '600', tracking: 0.3 },
  overline: { size: 11, line: 14, weight: '700', tracking: 1 },
  score: { size: 17, line: 22, weight: '700', tracking: -0.2 },
  scoreLg: { size: 30, line: 36, weight: '700', tracking: -0.8 },
  scoreXl: { size: 40, line: 46, weight: '700', tracking: -1.2 },
} as const satisfies Record<string, TypeStyle>;

export type TypeVariant = keyof typeof typeScale;

export const motion = {
  fast: 160,
  base: 240,
  slow: 320,
} as const;

/**
 * Control heights used across the app, so the same kind of control is the
 * same size everywhere: main buttons and text fields, smaller buttons and
 * chips (still a full touch target), and the section pills.
 */
export const control = { lg: 52, md: 44, pill: 36 } as const;
