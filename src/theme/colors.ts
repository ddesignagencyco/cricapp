/**
 * Colour tokens. Dark is the default: official CriczApp deep navy surfaces
 * (#020B19 / #0A182E / #14243D) separated by 1px navy hairlines, CriczApp
 * turf green brand (#16B800 / #0F8231), and semantic colours used sparingly.
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
  // Official CriczApp Dark Mode — deep navy canvas + vibrant turf green accents.
  background: '#020B19',
  surface: '#0A182E',
  elevated: '#14243D',
  pressed: '#1A2F4F',
  hairline: '#1E3354',
  border: '#2C4872',
  text: '#F8FAFC',
  textSecondary: '#CBD5E1',
  textMuted: '#94A3B8',
  textDisabled: '#64748B',
  brand: '#16B800',
  brandPressed: '#0F8231',
  onBrand: '#FFFFFF',
  brandSoft: 'rgba(22,184,0,0.16)',
  accent: '#34D358',
  live: '#EF4444',
  liveSoft: 'rgba(239,68,68,0.16)',
  success: '#22C55E',
  successSoft: 'rgba(34,197,94,0.16)',
  warning: '#F59E0B',
  warningSoft: 'rgba(245,158,11,0.16)',
  danger: '#EF4444',
  dangerSoft: 'rgba(239,68,68,0.16)',
  four: '#34D358',
  fourSoft: 'rgba(52,211,88,0.18)',
  six: '#F59E0B',
  sixSoft: 'rgba(245,158,11,0.18)',
  pakistan: '#16B800',
  pakistanSoft: 'rgba(22,184,0,0.16)',
  psl: '#F5C04A',
  pslSoft: 'rgba(245,192,74,0.16)',
  skeleton: '#14243D',
  overlay: 'rgba(2,11,25,0.75)',
  ripple: 'rgba(255,255,255,0.08)',
  tabBar: '#06152F',
};

export const light: Palette = {
  scheme: 'light',
  // Official CriczApp Daylight Edition — #F4F6F9 bg, #FFFFFF cards, #06152F navy ink, #0F8231 green.
  background: '#F4F6F9',
  surface: '#FFFFFF',
  elevated: '#EEF2F7',
  pressed: '#E2E8F0',
  hairline: '#E2E8F0',
  border: '#CBD5E1',
  text: '#06152F',
  textSecondary: '#334155',
  textMuted: '#64748B',
  textDisabled: '#94A3B8',
  brand: '#0F8231',
  brandPressed: '#0B6926',
  onBrand: '#FFFFFF',
  brandSoft: '#E6F5EA',
  accent: '#0D7A2C',
  live: '#EF4444',
  liveSoft: '#FEE2E2',
  success: '#16A34A',
  successSoft: '#DCFCE7',
  warning: '#D97706',
  warningSoft: '#FEF3C7',
  danger: '#DC2626',
  dangerSoft: '#FEE2E2',
  four: '#0F8231',
  fourSoft: '#E6F5EA',
  six: '#D97706',
  sixSoft: '#FEF3C7',
  pakistan: '#0F8231',
  pakistanSoft: '#E6F5EA',
  psl: '#B45309',
  pslSoft: '#FEF3C7',
  skeleton: '#E2E8F0',
  overlay: 'rgba(6,21,47,0.52)',
  ripple: 'rgba(6,21,47,0.06)',
  tabBar: '#FFFFFF',
};
