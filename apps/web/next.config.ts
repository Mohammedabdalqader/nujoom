import type { NextConfig } from 'next';

/**
 * The web app (S1-8): guardian approval, sign-in, legal pages now; join links, the owner
 * dashboard and admin later (spec §8). Arabic is the default locale.
 */
const config: NextConfig = {
  poweredByHeader: false,
  transpilePackages: ['@nujoom/i18n', '@nujoom/shared', '@nujoom/tokens'],
  async redirects() {
    return [{ source: '/', destination: '/ar', permanent: false }];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          // Approval and join links carry tokens in the path: never leak them to other sites.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        // The approval token is the whole secret: send no referrer at all from these pages.
        source: '/:locale/guardian/:path*',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ];
  },
};

export default config;
