/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: '/admin/media', destination: '/admin/gallery', permanent: false },
    ];
  },
};
export default nextConfig;