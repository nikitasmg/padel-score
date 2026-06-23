import withPWAInit from "@ducanh2912/next-pwa";
const withPWA = withPWAInit({ dest: "public", disable: process.env.NODE_ENV === "development" });
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack is default in Next.js 16; empty config silences webpack-conflict warning.
  // PWA service-worker generation (webpack-only) is handled in Task 16.
  turbopack: {},
};
export default withPWA(nextConfig);
