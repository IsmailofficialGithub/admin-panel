/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack(config, { dev }) {
    if (dev) {
      config.infrastructureLogging = { level: 'error' };
    }
    return config;
  },
};

export default nextConfig;
