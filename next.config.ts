import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.10.192", "192.168.118.192", "10.114.12.192", "192.168.65.192"],
  turbopack: {
    // Avoid Turbopack picking up the unrelated package-lock.json in the parent folder.
    root: path.join(__dirname),
  },
};

export default nextConfig;
