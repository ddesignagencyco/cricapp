import DummyAd from './advertisements/DummyAd';

/**
 * Compatibility wrapper around DummyAd. New placements should import DummyAd.
 */
export type AdFormat = 'leaderboard' | 'inline' | 'rectangle';

interface AdSlotProps {
  slot: string;
  format?: AdFormat;
  className?: string;
}

const formatToSize = {
  leaderboard: 'leaderboard',
  inline: 'large-rectangle',
  rectangle: 'medium-rectangle',
} as const;

export default function AdSlot({ slot, format = 'leaderboard', className = '' }: AdSlotProps) {
  return <DummyAd size={formatToSize[format]} placement={slot} className={className} />;
}
