import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/c',
        destination: '/#varieties',
        permanent: false
      },
      {
        source: '/c/:path*',
        destination: '/#varieties',
        permanent: false
      },
      {
        source: '/cart',
        destination: '/checkout',
        permanent: false
      }
    ];
  }
};

export default nextConfig;
