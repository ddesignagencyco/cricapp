import Image from 'next/image';
import type { CSSProperties, SyntheticEvent } from 'react';
import { CLIENT_BASE } from '../services/api/client';

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
  fit?: 'contain' | 'cover';
  /** Eager + preloaded for the LCP candidate only. Defaults to lazy. */
  priority?: boolean;
  /**
   * Optimizer quality (1-100). Defaults to 85: small detail-critical images
   * (team logos, thumbnails) turn mushy at the default 75, while the byte
   * cost at these render sizes is negligible.
   */
  quality?: number;
  onError?: (_event: SyntheticEvent<HTMLImageElement>) => void;
}

/**
 * Hosts served through the Image Optimization API (`next.config.mjs`
 * `images.remotePatterns`). Anything else — e.g. an arbitrary URL an editor
 * pasted into the CMS — renders unoptimized rather than failing the page.
 */
const TRUSTED_HOSTS = ['psl-t20.com', 'picsum.photos', 'res.cloudinary.com'];

function apiHostname(): string | null {
  try {
    const host = new URL(CLIENT_BASE).hostname;
    return host && host !== 'localhost' && host !== '127.0.0.1' ? host : null;
  } catch {
    return null;
  }
}

function isTrustedHost(src: string): boolean {
  let host: string;
  try {
    // Relative URLs are local and always optimizable.
    host = new URL(src, 'http://local').hostname;
    if (host === 'local') return true;
  } catch {
    return false;
  }
  if (TRUSTED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return true;
  const api = apiHostname();
  return api !== null && (host === api || host.endsWith(`.${api}`));
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
  fit,
  priority = false,
  quality = 85,
  onError,
}: RemoteImageProps) {
  const objectFit = fit || (className?.includes('news-image') ? 'contain' : undefined);
  const mergedStyle: CSSProperties = {
    ...(objectFit ? { objectFit, objectPosition: 'center' } : {}),
    ...style,
  };
  // Unknown hosts keep the old passthrough behaviour; trusted + local hosts go
  // through the optimizer (WebP/AVIF + resizing per `sizes`).
  const unoptimized = !isTrustedHost(src);

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes ?? '100vw'}
        className={className}
        style={mergedStyle}
        title={title}
        unoptimized={unoptimized}
        preload={priority}
        quality={quality}
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
      sizes={sizes}
      className={className}
      style={mergedStyle}
      title={title}
      unoptimized={unoptimized}
      preload={priority}
      quality={quality}
      onError={onError}
    />
  );
}
