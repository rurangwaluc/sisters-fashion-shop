import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@dispensary/db', '@dispensary/validators'],
};

export default nextConfig;