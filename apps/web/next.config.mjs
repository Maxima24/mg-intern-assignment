/** @type {import('next').NextConfig} */
const nextConfig = {
  // Note: no `output: 'standalone'` — the web app deploys to Vercel, which handles
  // its own output. (Standalone tracing also needs symlink perms Windows dev lacks.)
  transpilePackages: ['@mango/shared'],
  reactStrictMode: true,
};

export default nextConfig;
