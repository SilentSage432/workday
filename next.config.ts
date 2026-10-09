import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Keep Firebase Admin out of the App Router bundler's client graph.
  serverExternalPackages: ["firebase-admin"],
  // The dev server's hostname is localhost. 127.0.0.1 is a different origin.
  // Without this, Next blocks the dev client there and the shell stays on the
  // server-rendered session check.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
