"use client"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import Image from "next/image"
import Link from "next/link"

export default function CasosDeEstudio() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
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
            <Link href="/" className="text-gray-700 dark:text-gray-300 hover:text-[#068959] dark:hover:text-[#0dab70] font-medium transition-colors">Inicio</Link>
            <Link href="/entornos" className="text-gray-700 dark:text-gray-300 hover:text-[#068959] dark:hover:text-[#0dab70] font-medium transition-colors">Entornos</Link>
            <Link href="/integraciones" className="text-gray-700 dark:text-gray-300 hover:text-[#068959] dark:hover:text-[#0dab70] font-medium transition-colors">Integraciones</Link>
            <Link href="/mejores-practicas" className="text-gray-700 dark:text-gray-300 hover:text-[#068959] dark:hover:text-[#0dab70] font-medium transition-colors">Mejores prácticas</Link>
            <Link href="/contacto" className="text-gray-700 dark:text-gray-300 hover:text-[#068959] dark:hover:text-[#0dab70] font-medium transition-colors">Contacto</Link>
            <Link href="/soporte-tecnico" className="text-gray-700 dark:text-gray-300 hover:text-[#068959] dark:hover:text-[#0dab70] font-medium transition-colors">Soporte técnico</Link>
            <Link href="/legal" className="text-gray-700 dark:text-gray-300 hover:text-[#068959] dark:hover:text-[#0dab70] font-medium transition-colors">Legal</Link>
            <ThemeToggle />
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {/* Menú móvil */}
            <Sheet>
              <SheetTrigger asChild>
                <button aria-label="Abrir menú" className="md:hidden text-gray-700 dark:text-gray-300 hover:text-[#068959] dark:hover:text-[#0dab70] transition-colors">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72 sm:w-80 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                <nav className="mt-8 grid gap-4 text-base">
                  <Link href="/" className="text-gray-800 dark:text-gray-200 hover:text-[#068959] dark:hover:text-[#0dab70]">Inicio</Link>
                  <Link href="/entornos" className="text-gray-800 dark:text-gray-200 hover:text-[#068959] dark:hover:text-[#0dab70]">Entornos</Link>
                  <Link href="/integraciones" className="text-gray-800 dark:text-gray-200 hover:text-[#068959] dark:hover:text-[#0dab70]">Integraciones</Link>
                  <Link href="/mejores-practicas" className="text-gray-800 dark:text-gray-200 hover:text-[#068959] dark:hover:text-[#0dab70]">Mejores prácticas</Link>
                  <Link href="/contacto" className="text-gray-800 dark:text-gray-200 hover:text-[#068959] dark:hover:text-[#0dab70]">Contacto</Link>
                  <Link href="/soporte-tecnico" className="text-gray-800 dark:text-gray-200 hover:text-[#068959] dark:hover:text-[#0dab70]">Soporte técnico</Link>
                  <Link href="/legal" className="text-gray-800 dark:text-gray-200 hover:text-[#068959] dark:hover:text-[#0dab70]">Legal</Link>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="py-12 md:py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-bold text-[#068959] dark:text-[#0dab70] mb-6">
            Casos de Estudio
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-12">
            Ejemplos reales de cómo nuestra plataforma de IA está transformando la práctica médica
          </p>
          
          <div className="space-y-12">
            {/* Caso 1: Detección de Neumonía */}
            <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Caso 1: Detección Temprana de Neumonía</h2>
                  <p className="text-gray-600 dark:text-gray-300">Hospital General de México - Radiología</p>
                </div>
                <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm font-medium">
                  Éxito
                </span>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Situación</h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                    Un paciente de 65 años llegó al hospital con síntomas de tos persistente y fiebre. 
                    El radiólogo de guardia necesitaba una segunda opinión para confirmar la presencia 
                    de neumonía en la radiografía de tórax.
                  </p>
                  
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Proceso</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
                    <li>Se cargó la radiografía en nuestra plataforma</li>
                    <li>NV-Reason-CXR analizó la imagen y generó un reporte detallado</li>
                    <li>MedGemma proporcionó contexto clínico adicional</li>
                    <li>El sistema identificó opacidades en el lóbulo inferior derecho</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Resultado</h3>
                  <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg mb-4">
                    <p className="text-green-800 dark:text-green-200 font-medium">
                      ✅ La IA confirmó la presencia de neumonía con 94% de confianza
                    </p>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Impacto</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
                    <li>Tiempo de diagnóstico reducido de 2 horas a 15 minutos</li>
                    <li>Tratamiento iniciado inmediatamente</li>
                    <li>Paciente dado de alta 2 días antes de lo esperado</li>
                    <li>Costos hospitalarios reducidos en 30%</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Caso 2: Análisis de Múltiples Hallazgos */}
            <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Caso 2: Análisis Complejo de Múltiples Patologías</h2>
                  <p className="text-gray-600">Instituto Nacional de Enfermedades Respiratorias</p>
                </div>
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium">
                  Complejo
                </span>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Situación</h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                    Paciente con historial de EPOC que presentaba una radiografía con múltiples hallazgos 
                    que requerían análisis detallado: enfisema, fibrosis pulmonar y posible nódulo pulmonar.
                  </p>
                  
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Desafío</h3>
                  <p className="text-gray-600 leading-relaxed">
                    La complejidad del caso requería diferenciar entre patologías superpuestas y 
                    determinar la prioridad de cada hallazgo para el tratamiento.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Solución IA</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
                    <li>Análisis sistemático de cada región pulmonar</li>
                    <li>Identificación de 3 patologías principales</li>
                    <li>Priorización de hallazgos por gravedad</li>
                    <li>Recomendaciones de seguimiento específicas</li>
                  </ul>
                  
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Resultado</h3>
                  <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
                    <p className="text-blue-800 dark:text-blue-200 font-medium">
                      📊 Análisis completo en 8 minutos vs. 45 minutos tradicionales
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Caso 3: Educación Médica */}
            <section className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Caso 3: Capacitación de Residentes</h2>
                  <p className="text-gray-600">Facultad de Medicina UNAM - Programa de Radiología</p>
                </div>
                <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                  Educativo
                </span>
              </div>
              
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Objetivo</h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                    Mejorar las habilidades de interpretación radiológica de residentes de primer año 
                    utilizando casos reales con retroalimentación inmediata de la IA.
                  </p>
                  
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Metodología</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-600 dark:text-gray-300">
                    <li>50 casos de estudio con diferentes patologías</li>
                    <li>Análisis independiente de cada residente</li>
                    <li>Comparación con análisis de IA</li>
                    <li>Discusión grupal de discrepancias</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Resultados</h3>
                  <div className="space-y-4">
                    <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg">
                      <p className="text-green-800 dark:text-green-200 font-medium">
                        📈 40% mejora en precisión diagnóstica
                      </p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
                      <p className="text-blue-800 dark:text-blue-200 font-medium">
                        ⏱️ 60% reducción en tiempo de análisis
                      </p>
                    </div>
                    <div className="bg-purple-50 p-4 rounded-lg">
                      <p className="text-purple-800 font-medium">
                        🎓 95% satisfacción de los residentes
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Estadísticas Generales */}
            <section className="bg-[#068959] text-white p-8 rounded-xl">
              <h2 className="text-3xl font-bold mb-6 text-center">Impacto General de la Plataforma</h2>
              <div className="grid md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">500+</div>
                  <p className="text-lg">Casos Analizados</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">94%</div>
                  <p className="text-lg">Precisión Promedio</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">75%</div>
                  <p className="text-lg">Reducción de Tiempo</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">25+</div>
                  <p className="text-lg">Instituciones</p>
                </div>
              </div>
            </section>
          </div>

          <div className="mt-12 text-center">
            <Link href="/contacto">
              <Button className="bg-[#068959] hover:bg-[#057a4a] text-white">
                Solicitar demostración
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-12 md:py-16 mt-20">
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
    </div>
  )
}
