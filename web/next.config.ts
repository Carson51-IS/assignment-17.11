import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@assignmentRoot": path.resolve(__dirname, ".."),
    };
    return config;
  },
};

export default nextConfig;
