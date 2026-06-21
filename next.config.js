// [🧱 BLOCK: Next.js Config]
// Phaser uses browser globals (window, document) — it must never run on the server.
// transpilePackages ensures Phaser is bundled client-side only.

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['phaser'],
};

module.exports = nextConfig;