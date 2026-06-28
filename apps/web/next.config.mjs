/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["pub-*.r2.dev", "images.unsplash.com"],
    remotePatterns: [
      { protocol: "https", hostname: "*.r2.dev" },
      { protocol: "https", hostname: "profile.line-scdn.net" },
    ],
  },
  transpilePackages: ["@cm/types"],
  // force rebuild
}

export default nextConfig
