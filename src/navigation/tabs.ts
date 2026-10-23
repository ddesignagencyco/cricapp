import type { IconName } from '../components/ui/Icon';

/** Bottom navigation from the brief: Home | Live | Predict | News | More. */
export const TABS = [
  { key: 'home', label: 'Home', icon: 'house' },
  { key: 'live', label: 'Live', icon: 'radio' },
  { key: 'predict', label: 'Predict', icon: 'sparkles' },
  { key: 'news', label: 'News', icon: 'newspaper' },
  { key: 'more', label: 'More', icon: 'layoutGrid' },
] as const satisfies readonly { key: string; label: string; icon: IconName }[];

export type TabKey = (typeof TABS)[number]['key'];
