/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Configuración para acceso desde red local
  experimental: {
    serverComponentsExternalPackages: [],
  },
  // Permitir acceso desde cualquier IP en desarrollo
  async rewrites() {
    return []
  },
}

export default nextConfig
