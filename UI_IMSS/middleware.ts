import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Bloquear intentos de conexión WebSocket HMR cuando está detrás de un túnel
  // Esto evita errores "Unauthorized" en los logs de Cloudflare Tunnel
  if (pathname.startsWith('/_next/webpack-hmr') || pathname.startsWith('/_next/turbopack-hmr')) {
    // Responder con 404 en lugar de intentar establecer WebSocket
    // Esto evita que Cloudflare Tunnel intente parsear "Unauthorized" como respuesta HTTP
    // Cloudflare Tunnel puede manejar 404 correctamente, pero no puede parsear "Unauthorized"
    return new NextResponse(null, { 
      status: 404,
      headers: {
        'Content-Type': 'text/plain',
      }
    })
  }

  // Permitir todas las demás peticiones
  return NextResponse.next()
}

// Ejecutar middleware para todas las rutas que empiecen con /_next/webpack-hmr o /_next/turbopack-hmr
export const config = {
  matcher: [
    '/_next/webpack-hmr/:path*',
    '/_next/turbopack-hmr/:path*',
  ],
}

