"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { fetchAuthenticated } from "@/lib/api-client"

interface ProtectedRouteProps {
  children: React.ReactNode
}

// Cache de verificación de token
const TOKEN_CACHE_KEY = 'token_verified'
const TOKEN_CACHE_TTL = 5 * 60 * 1000 // 5 minutos

function isTokenCached(): boolean {
  if (typeof window === 'undefined') return false
  const cached = localStorage.getItem(TOKEN_CACHE_KEY)
  if (!cached) return false
  
  try {
    const { timestamp } = JSON.parse(cached)
    return Date.now() - timestamp < TOKEN_CACHE_TTL
  } catch {
    return false
  }
}

function setTokenCache(): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_CACHE_KEY, JSON.stringify({
    timestamp: Date.now()
  }))
}

function clearTokenCache(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_CACHE_KEY)
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const hasChecked = useRef(false)
  const isChecking = useRef(false)

  useEffect(() => {
    // Evitar múltiples verificaciones simultáneas
    if (isChecking.current) return
    
    // Solo verificar una vez por montaje del componente
    if (hasChecked.current) return
    
    // Verificar autenticación
    const token = localStorage.getItem('auth_token')
    
    if (!token) {
      // No hay token, redirigir a login (no a / para evitar bucles)
      hasChecked.current = true
      setIsAuthenticated(false)
      if (pathname !== '/login' && pathname !== '/') {
        router.replace('/login')
      }
      return
    }

    // Verificar cache primero
    if (isTokenCached()) {
      hasChecked.current = true
      setIsAuthenticated(true)
      return
    }

    // Marcar que estamos verificando
    isChecking.current = true

    // Verificar que el token sea válido haciendo una petición al backend
    fetchAuthenticated<{ success: boolean; user?: any }>("/api/auth/me", {}, 10000) // 10 segundos timeout
      .then(data => {
        isChecking.current = false
        hasChecked.current = true
        
        if (data.success) {
          setIsAuthenticated(true)
          setTokenCache() // Guardar en cache
        } else {
          // Token inválido, limpiar y redirigir
          localStorage.removeItem('auth_token')
          localStorage.removeItem('user')
          clearTokenCache()
          setIsAuthenticated(false)
          if (pathname !== '/login' && pathname !== '/') {
            router.replace('/login')
          }
        }
      })
      .catch((error) => {
        isChecking.current = false
        hasChecked.current = true
        
        // Error de conexión o token inválido, limpiar token y redirigir
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user')
        clearTokenCache()
        setIsAuthenticated(false)
        
        // Solo redirigir si no estamos ya en login o en la raíz
        if (pathname !== '/login' && pathname !== '/') {
          router.replace('/login')
        }
      })
  }, [router, pathname])

  // Mostrar loading mientras se verifica
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#068959] mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    )
  }

  // Si no está autenticado, no mostrar contenido (ya se redirigió)
  if (!isAuthenticated) {
    return null
  }

  // Si está autenticado, mostrar el contenido
  return <>{children}</>
}
