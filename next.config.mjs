import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Workaround: webpack WasmHash crashes on Node v25.
    config.output.hashFunction = 'xxhash64';
    return config;
  },
};

const isNextDev = process.argv.some(arg => arg === 'dev');

if (isNextDev) {
  initOpenNextCloudflareForDev();
}

export default nextConfig;
