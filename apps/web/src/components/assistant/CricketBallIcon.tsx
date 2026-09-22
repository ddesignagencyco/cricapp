import { Icon } from 'lucide-react';
import { cricketBall } from '@lucide/lab';

export default function CricketBallIcon({
  size = 20,
  strokeWidth = 2,
  className,
}: {
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  return <Icon iconNode={cricketBall} size={size} strokeWidth={strokeWidth} className={className} />;
}
