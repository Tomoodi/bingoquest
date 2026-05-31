import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // SupabaseのStorage画像のドメインを許可する
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co', // Supabaseのドメインを許可
      },
    ],
  },
};

export default nextConfig;
