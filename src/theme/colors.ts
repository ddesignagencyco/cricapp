/**
 * Colour tokens. Dark is the default: deep navy surfaces separated by
 * 1px hairlines, one brand blue, and semantic colours used sparingly
 * (live red, boundary gold, wicket red, success green).
 */
export interface Palette {
  scheme: 'dark' | 'light';
  background: string;
  /** Cards and grouped sections. */
  surface: string;
  /** Raised elements on a surface: chips, inputs, segmented controls. */
  elevated: string;
  pressed: string;
  hairline: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  textDisabled: string;
  /** Fill for primary buttons, active indicators, selected chips. */
  brand: string;
  brandPressed: string;
  onBrand: string;
  brandSoft: string;
  /** Brand colour for text and icons (readable on the background). */
  accent: string;
  live: string;
  liveSoft: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  /** Boundary colours in ball-by-ball strips. */
  four: string;
  fourSoft: string;
  six: string;
  sixSoft: string;
  /** Pakistan green, used only in the Pakistan hub and its entry points. */
  pakistan: string;
  pakistanSoft: string;
  /** PSL gold. */
  psl: string;
  pslSoft: string;
  skeleton: string;
  overlay: string;
  ripple: string;
  tabBar: string;
}

export const dark: Palette = {
  scheme: 'dark',
  // Neutral graphite: blue is reserved for brand moments, not the canvas.
  background: '#0B0D12',
  surface: '#15181F',
  elevated: '#1D2129',
  pressed: '#252A33',
  hairline: '#22262F',
  border: '#2C313B',
  text: '#F3F4F6',
  textSecondary: '#A9AFBC',
  textMuted: '#878E9D',
  textDisabled: '#4A505C',
  brand: '#3B68FC',
  brandPressed: '#3358D9',
  onBrand: '#FFFFFF',
  brandSoft: 'rgba(59,104,252,0.16)',
  accent: '#7B98FF',
  live: '#FF4256',
  liveSoft: 'rgba(255,66,86,0.14)',
  success: '#2BD07F',
  successSoft: 'rgba(43,208,127,0.14)',
  warning: '#FFB020',
  warningSoft: 'rgba(255,176,32,0.14)',
  danger: '#FF5A5F',
  dangerSoft: 'rgba(255,90,95,0.15)',
  four: '#5B83FF',
  fourSoft: 'rgba(91,131,255,0.18)',
  six: '#FFB020',
  sixSoft: 'rgba(255,176,32,0.18)',
  pakistan: '#1FB86A',
  pakistanSoft: 'rgba(31,184,106,0.14)',
  psl: '#F5C04A',
  pslSoft: 'rgba(245,192,74,0.14)',
  skeleton: '#1A1D24',
  overlay: 'rgba(5,6,9,0.72)',
  ripple: 'rgba(255,255,255,0.07)',
  tabBar: '#0E1015',
};

export const light: Palette = {
  scheme: 'light',
  background: '#F5F6F8',
  surface: '#FFFFFF',
  elevated: '#F0F1F4',
  pressed: '#E6E8EC',
  hairline: '#E8EAEE',
  border: '#D9DCE2',
  text: '#111318',
  textSecondary: '#4B5160',
  textMuted: '#626877',
  textDisabled: '#A3A8B2',
  brand: '#3B68FC',
  brandPressed: '#2A4FE0',
  onBrand: '#FFFFFF',
  brandSoft: '#E7ECFF',
  accent: '#2A4FE0',
  live: '#E0243A',
  liveSoft: '#FDE9EC',
  success: '#0A8A52',
  successSoft: '#E5F6EE',
  warning: '#B45309',
  warningSoft: '#FDF2E3',
  danger: '#C81E3C',
  dangerSoft: '#FCE8EC',
  four: '#2A4FE0',
  fourSoft: '#E7ECFF',
  six: '#B86E00',
  sixSoft: '#FDF0DC',
  pakistan: '#0A7A44',
  pakistanSoft: '#E3F4EB',
  psl: '#A66F00',
  pslSoft: '#FBF1DA',
  skeleton: '#E9EBEF',
  overlay: 'rgba(17,19,24,0.5)',
  ripple: 'rgba(14,21,37,0.06)',
  tabBar: '#FFFFFF',
};
