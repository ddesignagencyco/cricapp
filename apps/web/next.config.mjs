/** @type {import('next').NextConfig} */
import withBundleAnalyzer from '@next/bundle-analyzer';

// Analyzer is strictly opt-in (`ANALYZE=1 npm run build`) and never affects
// normal builds. Added to diagnose the homepage client bundle (Lighthouse
// unused-JS / long-task findings) without shipping anything extra.
const enableAnalyzer = process.env.ANALYZE === '1';

// The API origin also serves uploaded covers/thumbnails, so its hostname is
// allow-listed for the Image Optimization API alongside the static hosts below.
// Unknown CMS hosts are never added here — `RemoteImage` falls back to an
// unoptimized passthrough for those instead of breaking the render.
const apiHostname = (() => {
  try {
    const raw = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || '';
    const host = new URL(raw).hostname;
    return host && host !== 'localhost' && host !== '127.0.0.1' ? host : null;
  } catch {
    return null;
  }
})();

const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    // Next 16 coerces any `quality` prop outside this list to the closest
    // entry (85/90 silently became 75 before this existed). 75 = default for
    // large photos, 85 = small detail-critical images (logos, thumbnails),
    // 90 = text-bearing artwork (banners).
    qualities: [75, 85, 90],
    remotePatterns: [
      { protocol: 'https', hostname: 'psl-t20.com' },
      { protocol: 'https', hostname: '**.psl-t20.com' },
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: '**.picsum.photos' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      ...(apiHostname ? [{ protocol: 'https', hostname: apiHostname }] : []),
    ],
  },
  async redirects() {
    return [
      { source: '/admin/media', destination: '/admin/gallery', permanent: false },
      { source: '/compare', destination: '/teams', permanent: false },
    ];
  },
};
export default withBundleAnalyzer({ enabled: enableAnalyzer })(nextConfig);