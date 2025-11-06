"use client"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import Image from "next/image"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import LoginForm from "@/components/auth/login-form"
import RegisterForm from "@/components/auth/register-form"

export default function LoginPage() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showLogin, setShowLogin] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const hasChecked = useRef(false)
  
  useEffect(() => {
    // Solo verificar una vez y solo si estamos en /login
    if (hasChecked.current || pathname !== '/login') return
    
    // Si el usuario ya está autenticado, verificar que el token sea válido antes de redirigir
    if (typeof window !== 'undefined') {
      hasChecked.current = true
      const token = localStorage.getItem('auth_token')
      
      // Si no hay token, no hacer nada (mostrar página de login)
      if (!token) {
        return
      }
      
      // Si hay token, verificar que sea válido antes de redirigir
      // Esto evita bucles infinitos si el token es inválido
      // Solo redirigir si el token existe y no hay indicios de que sea inválido
      // (el ProtectedRoute se encargará de validar el token cuando se acceda a /home)
      // Por ahora, solo redirigir si hay token (la validación real se hace en ProtectedRoute)
      // Pero para evitar bucles, no redirigir automáticamente aquí
      // Dejamos que el usuario intente acceder a /home y ProtectedRoute lo manejará
    }
  }, [router, pathname])

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/IMSS.png"
              alt="IMSS"
              width={80}
              height={40}
              className="h-8 md:h-10 w-auto"
            />
          </div>
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            <Link href="/" className="text-gray-700 hover:text-[#068959] font-medium transition-colors">Inicio</Link>
            <Link href="/entornos" className="text-gray-700 hover:text-[#068959] font-medium transition-colors">Entornos</Link>
            <Link href="/integraciones" className="text-gray-700 hover:text-[#068959] font-medium transition-colors">Integraciones</Link>
            <Link href="/mejores-practicas" className="text-gray-700 hover:text-[#068959] font-medium transition-colors">Mejores prácticas</Link>
            <Link href="/contacto" className="text-gray-700 hover:text-[#068959] font-medium transition-colors">Contacto</Link>
            <Link href="/soporte-tecnico" className="text-gray-700 hover:text-[#068959] font-medium transition-colors">Soporte técnico</Link>
            <Link href="/legal" className="text-gray-700 hover:text-[#068959] font-medium transition-colors">Legal</Link>
          </nav>
          {/* Mobile menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button aria-label="Abrir menú" className="md:hidden text-gray-700 hover:text-[#068959] transition-colors">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 sm:w-80">
              <nav className="mt-8 grid gap-4 text-base">
                <a onClick={()=>setMobileOpen(false)} href="/" className="text-gray-800 hover:text-[#068959]">Inicio</a>
                <a onClick={()=>setMobileOpen(false)} href="/entornos" className="text-gray-800 hover:text-[#068959]">Entornos</a>
                <a onClick={()=>setMobileOpen(false)} href="/integraciones" className="text-gray-800 hover:text-[#068959]">Integraciones</a>
                <a onClick={()=>setMobileOpen(false)} href="/mejores-practicas" className="text-gray-800 hover:text-[#068959]">Mejores prácticas</a>
                <a onClick={()=>setMobileOpen(false)} href="/contacto" className="text-gray-800 hover:text-[#068959]">Contacto</a>
                <a onClick={()=>setMobileOpen(false)} href="/soporte-tecnico" className="text-gray-800 hover:text-[#068959]">Soporte técnico</a>
                <a onClick={()=>setMobileOpen(false)} href="/legal" className="text-gray-800 hover:text-[#068959]">Legal</a>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main>
        {/* Hero Section - Login/Register */}
        <section id="inicio" className="relative min-h-screen flex flex-col lg:flex-row">
          {/* Left Side - Medical Technology Image (50% width) */}
          <div className="hidden lg:block lg:w-1/2 h-screen relative">
            <Image
              src="/Rectangle%2091911.png"
              alt="Tecnología de IA Médica"
              fill
              className="object-contain"
              priority
            />
          </div>

          {/* Mobile Image */}
          <div className="lg:hidden w-full h-[300px] relative">
            <Image
              src="/Rectangle%2091911.png"
              alt="Tecnología de IA Médica"
              fill
              className="object-contain"
              priority
            />
          </div>

          {/* Right Side - White Content (50% width) */}
          <div className="w-full lg:w-1/2 bg-white flex items-center justify-start py-16 md:py-20 lg:py-0 lg:pl-12 xl:pl-16">
            <div className="w-full max-w-lg px-6 lg:px-0 space-y-6">
              {/* Logo and Branding - Only PNG logo */}
              <div className="mb-8">
                <Image
                  src="/quetzalia.png"
                  alt="QuetzalIA"
                  width={180}
                  height={60}
                  className="w-auto h-12 md:h-16"
                />
              </div>

              {/* Main Headline */}
              <div className="space-y-4">
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                  <span className="text-indigo-900">IA en Imagenología:</span>
                  <br />
                  <span className="text-[#068959]">El Camino hacia la Máxima Certeza Diagnóstica.</span>
                </h1>
                
                {/* Description */}
                <div className="text-base md:text-lg text-gray-700 leading-relaxed space-y-3">
                  <p>
                    LLM Multimodal experto en razonamiento clínico avanzado. Comprensión multimodal, generación de reportes de alta calidad, agente de triaje multi-especialidad. Experto en Dermatología, Histopatología, Oftalmología, entre otras.
                  </p>
                  <p>
                    <strong>Puedes hacer lo siguiente:</strong> Preguntas y respuestas sobre textos médicos, preguntas y respuestas sobre visuales médicas, generación de informes de radiografías, entre otras cosas.
                  </p>
                </div>
              </div>

              {/* Login/Register Buttons */}
              <div className="pt-4 flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={() => setShowLogin(true)}
                  className="w-full sm:w-auto bg-gradient-to-r from-[#068959] to-[#0dab70] hover:from-[#057a4a] hover:to-[#068959] text-white font-semibold text-base md:text-lg px-8 md:px-10 py-5 md:py-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  Iniciar Sesión
                </Button>
                <Button 
                  onClick={() => setShowRegister(true)}
                  variant="outline"
                  className="w-full sm:w-auto border-2 border-[#068959] text-[#068959] hover:bg-[#068959] hover:text-white font-semibold text-base md:text-lg px-8 md:px-10 py-5 md:py-6 rounded-xl transition-all"
                >
                  Registrarse
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Login Modal */}
        {showLogin && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 md:p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Iniciar Sesión</h2>
                <button
                  onClick={() => setShowLogin(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              <LoginForm onSuccess={() => { setShowLogin(false); router.push('/home') }} />
            </div>
          </div>
        )}

        {/* Register Modal */}
        {showRegister && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 md:p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Registrarse</h2>
                <button
                  onClick={() => setShowRegister(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              <RegisterForm onSuccess={() => { setShowRegister(false); setShowLogin(true) }} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

