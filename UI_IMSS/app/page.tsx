"use client"

import { useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"

export default function Home() {
  const router = useRouter()
  const pathname = usePathname()
  const hasRedirected = useRef(false)
  
  useEffect(() => {
    // Solo ejecutar una vez y solo en la ruta raíz
    if (hasRedirected.current || pathname !== '/') return
    
    // Redirigir según el estado de autenticación
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token')
      
      hasRedirected.current = true
      
      if (token) {
        router.replace('/home')
      } else {
        router.replace('/login')
      }
    }
  }, [router, pathname])

  // Mostrar loading solo mientras se verifica (solo en la ruta raíz)
  if (pathname === '/') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#068959] dark:border-[#0dab70] mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    )
  }

  return null
}
