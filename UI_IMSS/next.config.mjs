/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Configuración de Turbopack (Next.js 16 usa Turbopack por defecto)
  turbopack: {},
  // Configuración para acceso desde red local
  // Permitir acceso desde cualquier IP en desarrollo (incluyendo túneles SSH)
  async rewrites() {
    return [
      // Proxy de peticiones API al backend cuando están en el mismo túnel
      // Esto permite que el frontend y backend compartan el mismo hostname
      {
        source: '/api/backend/:path*',
        destination: process.env.NEXT_PUBLIC_CHATBOT_URL 
          ? `${process.env.NEXT_PUBLIC_CHATBOT_URL}/api/:path*`
          : 'http://localhost:5001/api/:path*',
      },
    ]
  },
}

export default nextConfig
