// Separate build output lets the integration server run alongside a normal local preview.
module.exports = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  webpack(config) {
    if (process.env.NEXT_DISABLE_CACHE === '1') config.cache = false;
    return config;
  },
};
