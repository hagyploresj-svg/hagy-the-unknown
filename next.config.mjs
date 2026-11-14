/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // R3F + WebAudio: çift mount'u önler
  transpilePackages: ['three'],
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
