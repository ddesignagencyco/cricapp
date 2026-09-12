import Image from 'next/image';
import type { CSSProperties, SyntheticEvent } from 'react';

interface RemoteImageProps {
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  title?: string;
  style?: CSSProperties;
  onError?: (_event: SyntheticEvent<HTMLImageElement>) => void;
}

export default function RemoteImage({
  src,
  alt,
  className,
  fill,
  width = 96,
  height = 96,
  sizes,
  title,
  style,
  onError,
}: RemoteImageProps) {
  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes ?? '100vw'}
        className={className}
        style={style}
        title={title}
        unoptimized
        onError={onError}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={style}
      title={title}
      unoptimized
      onError={onError}
    />
  );
}
