// Separate build output lets the integration server run alongside a normal local preview.
module.exports = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  poweredByHeader: false,
  // Keep ownership verification and article metadata in the initial HTML head.
  htmlLimitedBots: /.*/,
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ] }];
  },
  webpack(config) {
    if (process.env.NEXT_DISABLE_CACHE === '1') config.cache = false;
    return config;
  },
};
