/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@netorbit/shared-types'],
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
