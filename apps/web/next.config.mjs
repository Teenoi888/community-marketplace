/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.r2.dev" },
      { protocol: "https", hostname: "*.cloudflarestorage.com" },
      { protocol: "https", hostname: "profile.line-scdn.net" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  transpilePackages: ["@cm/types"],
}

export default nextConfig
