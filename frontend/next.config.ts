import type { NextConfig } from "next";

const FLASK_API = process.env.FLASK_API_URL ?? "http://127.0.0.1:5002";

const nextConfig: NextConfig = {
  // La API de Flask se sirve bajo el mismo origen que el frontend.
  // Así la cookie JWT httponly viaja sola, sin CORS ni credentials:'include',
  // y los headers de Authelia llegan intactos desde el proxy.
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${FLASK_API}/api/:path*` },
      // Los logos subidos siguen viviendo en Flask.
      { source: "/static/uploads/:path*", destination: `${FLASK_API}/static/uploads/:path*` },
    ];
  },
};

export default nextConfig;
