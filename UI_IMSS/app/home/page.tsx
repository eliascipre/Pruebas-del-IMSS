"use client"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import Image from "next/image"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import ProtectedRoute from "@/components/auth/protected-route"

function HomeContent() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [baseUrl, setBaseUrl] = useState('http://localhost')
  const router = useRouter()
  
  useEffect(() => {
    // Detectar el hostname y protocolo del navegador
    if (typeof window !== 'undefined') {
      setBaseUrl(`${window.location.protocol}//${window.location.hostname}`)
    }
  }, [])

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/home">
              <Image
                src="/IMSS.png"
                alt="IMSS"
                width={80}
                height={40}
                className="h-8 md:h-10 w-auto"
              />
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            <Link href="/home" className="text-gray-700 dark:text-gray-300 hover:text-[#068959] dark:hover:text-[#0dab70] font-medium transition-colors">Inicio</Link>
            <Link href="/entornos" className="text-gray-700 dark:text-gray-300 hover:text-[#068959] dark:hover:text-[#0dab70] font-medium transition-colors">Entornos</Link>
            <Link href="/integraciones" className="text-gray-700 dark:text-gray-300 hover:text-[#068959] dark:hover:text-[#0dab70] font-medium transition-colors">Integraciones</Link>
            <Link href="/mejores-practicas" className="text-gray-700 dark:text-gray-300 hover:text-[#068959] dark:hover:text-[#0dab70] font-medium transition-colors">Mejores prácticas</Link>
            <Link href="/contacto" className="text-gray-700 dark:text-gray-300 hover:text-[#068959] dark:hover:text-[#0dab70] font-medium transition-colors">Contacto</Link>
            <Link href="/soporte-tecnico" className="text-gray-700 dark:text-gray-300 hover:text-[#068959] dark:hover:text-[#0dab70] font-medium transition-colors">Soporte técnico</Link>
            <Link href="/legal" className="text-gray-700 dark:text-gray-300 hover:text-[#068959] dark:hover:text-[#0dab70] font-medium transition-colors">Legal</Link>
            <ThemeToggle />
          </nav>
          <div className="flex items-center gap-2">
            {/* Mobile menu */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <button aria-label="Abrir menú" className="md:hidden text-gray-700 dark:text-gray-300 hover:text-[#068959] dark:hover:text-[#0dab70] transition-colors">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 sm:w-80 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <nav className="mt-8 grid gap-4 text-base">
                  <a onClick={()=>setMobileOpen(false)} href="/home" className="text-gray-800 dark:text-gray-200 hover:text-[#068959] dark:hover:text-[#0dab70]">Inicio</a>
                  <a onClick={()=>setMobileOpen(false)} href="/entornos" className="text-gray-800 dark:text-gray-200 hover:text-[#068959] dark:hover:text-[#0dab70]">Entornos</a>
                  <a onClick={()=>setMobileOpen(false)} href="/integraciones" className="text-gray-800 dark:text-gray-200 hover:text-[#068959] dark:hover:text-[#0dab70]">Integraciones</a>
                  <a onClick={()=>setMobileOpen(false)} href="/mejores-practicas" className="text-gray-800 dark:text-gray-200 hover:text-[#068959] dark:hover:text-[#0dab70]">Mejores prácticas</a>
                  <a onClick={()=>setMobileOpen(false)} href="/contacto" className="text-gray-800 dark:text-gray-200 hover:text-[#068959] dark:hover:text-[#0dab70]">Contacto</a>
                  <a onClick={()=>setMobileOpen(false)} href="/soporte-tecnico" className="text-gray-800 dark:text-gray-200 hover:text-[#068959] dark:hover:text-[#0dab70]">Soporte técnico</a>
                  <a onClick={()=>setMobileOpen(false)} href="/legal" className="text-gray-800 dark:text-gray-200 hover:text-[#068959] dark:hover:text-[#0dab70]">Legal</a>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section for Desktop Content */}
        <section className="w-full bg-white dark:bg-gray-900 py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-6">
            {/* Centered Title and Description */}
            <div className="text-center max-w-4xl mx-auto space-y-6 mb-12">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold">
                <span className="text-indigo-900 dark:text-indigo-300">IA en Imagenología:</span>
                <br />
                <span className="text-[#068959] dark:text-[#0dab70]">El Camino hacia la Máxima Certeza Diagnóstica.</span>
              </h1>
              <div className="text-lg md:text-xl text-gray-700 dark:text-gray-300 leading-relaxed mx-auto space-y-4 max-w-4xl">
                <p>
                  LLM Multimodal experto en razonamiento clínico avanzado. Comprensión multimodal, generación de reportes de alta calidad, agente de triaje multi-especialidad. Experto en Dermatología, Histopatología, Oftalmología, entre otras.
                </p>
                <p>
                  <strong>Puedes hacer lo siguiente:</strong> Preguntas y respuestas sobre textos médicos, preguntas y respuestas sobre visuales médicas, generación de informes de radiografías, entre otras cosas.
                </p>
              </div>
              <Link href="/chat">
                <Button className="bg-[#068959] hover:bg-[#057a4a] text-white font-semibold px-8 py-6 rounded-xl text-lg">
                  Inicia una conversación
                </Button>
              </Link>
            </div>

            {/* Hero Image */}
            <div className="w-full h-[500px] md:h-[600px] relative rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src="/image.png"
                alt="Doctor con IA Médica"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </section>

        {/* Powered By Section */}
        <section className="bg-gray-50 dark:bg-gray-800 py-8 md:py-12 border-t border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-6">
            <p className="text-center text-gray-500 dark:text-gray-400 text-xs md:text-sm mb-4 md:mb-6 font-medium">Desarrollado por:</p>
            <div className="flex items-center justify-center gap-4 md:gap-6 lg:gap-8 flex-wrap">
              <div className="bg-white dark:bg-gray-900 px-6 md:px-10 py-4 md:py-5 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <Image
                  src="/logo_nvidia.png"
                  alt="NVIDIA"
                  width={100}
                  height={35}
                  className="object-contain w-[80px] md:w-[120px] h-auto"
                />
              </div>
              <div className="bg-white dark:bg-gray-900 px-5 md:px-8 py-4 md:py-5 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <Image
                  src="/logo_mexico.png"
                  alt="Hecho en México"
                  width={110}
                  height={35}
                  className="object-contain w-[100px] md:w-[140px] h-auto"
                />
              </div>
              <div className="bg-white dark:bg-gray-900 px-6 md:px-10 py-4 md:py-5 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <Image
                  src="/logo_cipre_holding.png"
                  alt="CIPRE Holding"
                  width={130}
                  height={35}
                  className="object-contain w-[110px] md:w-[150px] h-auto"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 1: Agente de Inteligencia Artificial - text left, image right */}
        <section id="agentes" className="py-12 md:py-20 bg-white dark:bg-gray-900 scroll-mt-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
              <div className="space-y-4 md:space-y-6 order-2 md:order-1">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#068959] dark:text-[#0dab70] leading-tight">
                  Agente de Inteligencia Artificial
                </h2>
                <p className="text-gray-600 dark:text-gray-300 text-base md:text-lg leading-relaxed">
                  Nuestro asistente de inteligencia artificial especializado en medicina utiliza modelos avanzados como MedGemma para brindar respuestas precisas y contextualizadas sobre temas médicos y radiológicos.
                </p>
                <Link href="/chat">
                  <Button className="bg-[#068959] hover:bg-[#057a4a] text-white font-semibold text-base px-6 md:px-8 py-4 md:py-6 rounded-xl w-full sm:w-auto">
                    Acceder al Chatbot
                  </Button>
                </Link>
              </div>
              <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl order-1 md:order-2">
                <Image
                  src="/3.png"
                  alt="Agente de Inteligencia Artificial"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Radiografías de Tórax - image left, text right */}
        <section className="py-12 md:py-20 bg-gray-50 dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
              <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl">
                <Image
                  src="/chest-x-ray-radiography-with-green-holographic-ove.jpg"
                  alt="Radiografías de Tórax"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="space-y-4 md:space-y-6">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#068959] dark:text-[#0dab70] leading-tight">Radiografías de Tórax</h2>
                <p className="text-gray-600 dark:text-gray-300 text-base md:text-lg leading-relaxed">
                  Compañero de aprendizaje radiológico que utiliza MedGemma multimodal con sistema RAG para crear experiencias educativas interactivas con radiografías de tórax.
                </p>
                <Link 
                  href="/radiografias"
                >
                  <Button className="bg-[#068959] hover:bg-[#057a4a] text-white font-semibold text-base px-6 md:px-8 py-4 md:py-6 rounded-xl w-full sm:w-auto">
                    Analizar Radiografías
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Entornos de aprendizaje - image left, text right */}
        <section className="py-12 md:py-20 bg-white dark:bg-gray-900">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
              <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl">
                <Image
                  src="/4.png"
                  alt="Entornos de aprendizaje"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="space-y-4 md:space-y-6">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#068959] dark:text-[#0dab70] leading-tight">Entornos de aprendizaje</h2>
                <p className="text-gray-600 dark:text-gray-300 text-base md:text-lg leading-relaxed">
                  Plataforma educativa interactiva que utiliza casos de estudio reales y análisis multimodal para enseñar interpretación radiológica y términos médicos especializados.
                </p>
                <Link href="/entornos">
                  <Button className="bg-[#068959] hover:bg-[#057a4a] text-white font-semibold text-base px-6 md:px-8 py-4 md:py-6 rounded-xl w-full sm:w-auto">
                    Explorar Educación
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Section 4: Simulador de conversaciones - text left, image right */}
        <section className="py-12 md:py-20 bg-gray-50 dark:bg-gray-800">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
              <div className="space-y-4 md:space-y-6 order-2 md:order-1">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#068959] dark:text-[#0dab70] leading-tight">
                  Simulador de conversaciones
                </h2>
                <p className="text-gray-600 dark:text-gray-300 text-base md:text-lg leading-relaxed">
                  Sistema avanzado de simulación de entrevistas médicas pre-visita que utiliza MedGemma como entrevistador y pacientes virtuales para generar reportes clínicos estructurados.
                </p>
                <Link 
                  href={`${baseUrl}:5003`}
                  target="_blank"
                >
                  <Button className="bg-[#068959] hover:bg-[#057a4a] text-white font-semibold text-base px-6 md:px-8 py-4 md:py-6 rounded-xl w-full sm:w-auto">
                    Probar Simulador
                  </Button>
                </Link>
              </div>
              <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl order-1 md:order-2">
                <Image
                  src="/5.png"
                  alt="Simulador de conversaciones"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
              <div className="space-y-4 sm:col-span-2 md:col-span-1">
                <Image
                  src="/quetzalia.png"
                  alt="QuetzalIA"
                  width={180}
                  height={60}
                  className="w-auto h-12 md:h-16"
                />
                <p className="text-gray-600 dark:text-gray-400 text-sm">Inteligencia Artificial para la salud.</p>
                <div className="flex items-center gap-4 pt-4">
                  <Link href="https://www.instagram.com/cipreholding/" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#068959] transition-colors">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z" />
                    </svg>
                  </Link>
                  <Link href="https://www.linkedin.com/company/cipre-holding/posts/?feedView=all" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#068959] transition-colors">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                  </Link>
                  <Link href="https://www.facebook.com/cipreholding" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#068959] transition-colors">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.994 7.355 13.352 13.607 14.377.88.162 1.207.376 1.393.641.256.466 0 .798 0 .921 0 .087-.071.106-.154.112-.135.008-.363.014-.525.014s-.393-.006-.525-.014c-.082-.006-.154-.025-.154-.112 0-.123 0-.455 0-.921.186-.265.533-.479 1.393-.641 6.252-1.025 13.607-3.383 13.607-14.377zm-13.963-1.248v5.484h-2.155v-5.484h-2.16v-2.154h2.16v-1.711c0-1.599.944-2.467 2.514-2.467.731 0 1.363.055 1.546.08v1.794h-1.038c-.811 0-.971.386-.971.976v1.328h1.999l-.239 2.154h-1.76z"/>
                    </svg>
                  </Link>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Características</h4>
                <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                  <li>
                    <Link href="/caracteristicas-principales" className="hover:text-[#068959] dark:hover:text-[#0dab70] transition-colors">
                      Características principales
                    </Link>
                  </li>
                  <li>
                    <Link href="/experiencia-profesional" className="hover:text-[#068959] dark:hover:text-[#0dab70] transition-colors">
                      Experiencia profesional
                    </Link>
                  </li>
                  <li>
                    <Link href="/integraciones" className="hover:text-[#068959] dark:hover:text-[#0dab70] transition-colors">
                      Integraciones
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Aprende más</h4>
                <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                  <li>
                    <Link href="/blog" className="hover:text-[#068959] dark:hover:text-[#0dab70] transition-colors">
                      Blog
                    </Link>
                  </li>
                  <li>
                    <Link href="/casos-de-estudio" className="hover:text-[#068959] dark:hover:text-[#0dab70] transition-colors">
                      Casos de estudio
                    </Link>
                  </li>
                  <li>
                    <Link href="/historias-de-clientes" className="hover:text-[#068959] dark:hover:text-[#0dab70] transition-colors">
                      Historias de clientes
                    </Link>
                  </li>
                  <li>
                    <Link href="/mejores-practicas" className="hover:text-[#068959] dark:hover:text-[#0dab70] transition-colors">
                      Mejores prácticas
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Soporte</h4>
                <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                  <li>
                    <Link href="/contacto" className="hover:text-[#068959] dark:hover:text-[#0dab70] transition-colors">
                      Contacto
                    </Link>
                  </li>
                  <li>
                    <Link href="/soporte-tecnico" className="hover:text-[#068959] dark:hover:text-[#0dab70] transition-colors">
                      Soporte técnico
                    </Link>
                  </li>
                  <li>
                    <Link href="/legal" className="hover:text-[#068959] dark:hover:text-[#0dab70] transition-colors">
                      Legal
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}

export default function Home() {
  return (
    <ProtectedRoute>
      <HomeContent />
    </ProtectedRoute>
  )
}




