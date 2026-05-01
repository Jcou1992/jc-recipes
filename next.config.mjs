import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev }) => {
    // Workaround: webpack WasmHash crashes on Node v25.
    config.output.hashFunction = 'xxhash64';
    // Workaround: Next's production webpack filesystem cache can crash on
    // incremental builds under Node v25 with an opaque undefined.length error.
    if (!dev) config.cache = false;
    return config;
  },
};

const isNextDev = process.argv.some(arg => arg === 'dev');

if (isNextDev) {
  initOpenNextCloudflareForDev();
}

export default nextConfig;
