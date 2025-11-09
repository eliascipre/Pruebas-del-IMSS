/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Ocultar indicador de desarrollo de Next.js
  devIndicators: {
    buildActivity: false,
    buildActivityPosition: 'bottom-right',
  },
  // Configuración de Turbopack (Next.js 16 usa Turbopack por defecto)
  turbopack: {},
  // Permitir acceso desde la red local (elimina el warning de cross-origin)
  allowedDevOrigins: ['10.105.20.1', 'localhost', '127.0.0.1'],
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
