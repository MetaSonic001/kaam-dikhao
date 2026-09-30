import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";
const api = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
// Clerk loads its UI script from the instance domain (*.clerk.accounts.dev in development, your own domain in production).
const clerk = "https://*.clerk.accounts.dev https://*.clerk.com https://clerk.kaamdikhao.in";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${clerk} https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self' ${api} ${clerk} https://clerk-telemetry.com https://*.supabase.co https://tiles.openfreemap.org https://tiles.maps.eox.at https://gibs.earthdata.nasa.gov https://nominatim.openstreetmap.org`,
  `frame-src ${clerk} https://challenges.cloudflare.com`,
  "worker-src 'self' blob:",
  "media-src 'self' blob: https:",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self)" },
          ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }]),
        ],
      },
    ];
  },
};

export default nextConfig;
