"use client"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import Image from "next/image"
import Link from "next/link"
import ProtectedRoute from "@/components/auth/protected-route"

function SoporteTecnicoContent() {
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
            Soporte Técnico
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-12">
            Asistencia técnica especializada para resolver cualquier problema con nuestra plataforma
          </p>
          
          <div className="space-y-12">
            {/* Canales de Soporte */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Canales de Soporte</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Email de Soporte</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">soporte@quetzalia.com</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Respuesta en 2-4 horas</p>
                </div>

                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Teléfono</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">+52 (55) 1234-5678</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Lunes a Viernes, 9:00 AM - 6:00 PM</p>
                </div>

                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
                  <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Chat en Vivo</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">Disponible 24/7</p>
                  <Button className="bg-[#068959] hover:bg-[#057a4a] text-white">
                    Iniciar Chat
                  </Button>
                </div>
              </div>
            </section>

            {/* Preguntas Frecuentes */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Preguntas Frecuentes</h2>
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <button className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50">
                    <span className="font-medium text-gray-900">¿Cómo puedo acceder a la plataforma?</span>
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className="px-6 pb-4 text-gray-600 dark:text-gray-300">
                    <p>Para acceder a la plataforma, necesitas una cuenta autorizada. Contacta a nuestro equipo de ventas para obtener credenciales de acceso y configurar tu cuenta institucional.</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <button className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50">
                    <span className="font-medium text-gray-900">¿Qué formatos de imagen son compatibles?</span>
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className="px-6 pb-4 text-gray-600 dark:text-gray-300">
                    <p>La plataforma es compatible con formatos JPG y PNG. Recomendamos usar imágenes de alta calidad en estos formatos para obtener los mejores resultados de análisis.</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <button className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50">
                    <span className="font-medium text-gray-900">¿Cuánto tiempo toma el análisis de una imagen?</span>
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className="px-6 pb-4 text-gray-600 dark:text-gray-300">
                    <p>El análisis típico toma entre 30 segundos y 2 minutos, dependiendo de la complejidad de la imagen y la carga del servidor. Las radiografías simples suelen procesarse más rápido.</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <button className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50">
                    <span className="font-medium text-gray-900">¿Cómo puedo reportar un problema técnico?</span>
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className="px-6 pb-4 text-gray-600 dark:text-gray-300">
                    <p>Puedes reportar problemas técnicos a través de nuestro email de soporte, chat en vivo o completando el formulario de soporte. Incluye capturas de pantalla y descripción detallada del problema.</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <button className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50">
                    <span className="font-medium text-gray-900">¿La plataforma funciona en dispositivos móviles?</span>
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div className="px-6 pb-4 text-gray-600 dark:text-gray-300">
                    <p>Sí, la plataforma es completamente responsive y funciona en tablets y smartphones. Sin embargo, recomendamos usar una pantalla de al menos 10 pulgadas para una mejor experiencia de análisis.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Formulario de Soporte */}
            <section className="bg-gray-50 p-8 rounded-xl">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Formulario de Soporte</h2>
              <form className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-2">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      id="nombre"
                      name="nombre"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#068959] focus:border-transparent"
                      placeholder="Tu nombre completo"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#068959] focus:border-transparent"
                      placeholder="tu@email.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="tipo-problema" className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de Problema *
                  </label>
                  <select
                    id="tipo-problema"
                    name="tipo-problema"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#068959] focus:border-transparent"
                  >
                    <option value="">Selecciona el tipo de problema</option>
                    <option value="acceso">Problemas de acceso</option>
                    <option value="carga">Problemas de carga de imágenes</option>
                    <option value="analisis">Problemas en el análisis</option>
                    <option value="rendimiento">Problemas de rendimiento</option>
                    <option value="interfaz">Problemas de interfaz</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="urgencia" className="block text-sm font-medium text-gray-700 mb-2">
                    Nivel de Urgencia *
                  </label>
                  <select
                    id="urgencia"
                    name="urgencia"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#068959] focus:border-transparent"
                  >
                    <option value="">Selecciona el nivel de urgencia</option>
                    <option value="baja">Baja - No afecta el trabajo diario</option>
                    <option value="media">Media - Afecta algunas funciones</option>
                    <option value="alta">Alta - Afecta significativamente el trabajo</option>
                    <option value="critica">Crítica - Sistema completamente inaccesible</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción del Problema *
                  </label>
                  <textarea
                    id="descripcion"
                    name="descripcion"
                    rows={5}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#068959] focus:border-transparent"
                    placeholder="Describe detalladamente el problema que estás experimentando..."
                  ></textarea>
                </div>

                <div>
                  <label htmlFor="archivos" className="block text-sm font-medium text-gray-700 mb-2">
                    Archivos Adjuntos (Opcional)
                  </label>
                  <input
                    type="file"
                    id="archivos"
                    name="archivos"
                    multiple
                    accept="image/*,.pdf,.doc,.docx"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#068959] focus:border-transparent"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Puedes adjuntar capturas de pantalla, logs de error o documentos relacionados
                  </p>
                </div>

                <Button type="submit" className="w-full bg-[#068959] hover:bg-[#057a4a] text-white">
                  Enviar Solicitud de Soporte
                </Button>
              </form>
            </section>

            {/* Recursos Adicionales */}
            <section>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Recursos Adicionales</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Link href="/mejores-practicas" className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                  <div className="text-3xl mb-3">📋</div>
                  <h3 className="font-semibold text-gray-900 mb-2">Mejores Prácticas</h3>
                  <p className="text-sm text-gray-600">Guía para el uso óptimo de la plataforma</p>
                </Link>

                <Link href="/integraciones" className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                  <div className="text-3xl mb-3">🔧</div>
                  <h3 className="font-semibold text-gray-900 mb-2">Documentación Técnica</h3>
                  <p className="text-sm text-gray-600">Información detallada sobre integraciones</p>
                </Link>

                <Link href="/casos-de-estudio" className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                  <div className="text-3xl mb-3">📊</div>
                  <h3 className="font-semibold text-gray-900 mb-2">Casos de Estudio</h3>
                  <p className="text-sm text-gray-600">Ejemplos de uso exitoso</p>
                </Link>

                <Link href="/legal" className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                  <div className="text-3xl mb-3">⚖️</div>
                  <h3 className="font-semibold text-gray-900 mb-2">Términos Legales</h3>
                  <p className="text-sm text-gray-600">Información legal y de privacidad</p>
                </Link>
              </div>
            </section>
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
                  <Link href="/caracteristicas-principales" className="hover:text-[#068959] transition-colors">
                    Características principales
                  </Link>
                </li>
                <li>
                  <Link href="/experiencia-profesional" className="hover:text-[#068959] transition-colors">
                    Experiencia profesional
                  </Link>
                </li>
                <li>
                  <Link href="/integraciones" className="hover:text-[#068959] transition-colors">
                    Integraciones
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Aprende más</h4>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li>
                  <Link href="/blog" className="hover:text-[#068959] transition-colors">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="/casos-de-estudio" className="hover:text-[#068959] transition-colors">
                    Casos de estudio
                  </Link>
                </li>
                <li>
                  <Link href="/historias-de-clientes" className="hover:text-[#068959] transition-colors">
                    Historias de clientes
                  </Link>
                </li>
                <li>
                  <Link href="/mejores-practicas" className="hover:text-[#068959] transition-colors">
                    Mejores prácticas
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-4">Soporte</h4>
              <ul className="space-y-2 text-gray-600 dark:text-gray-400">
                <li>
                  <Link href="/contacto" className="hover:text-[#068959] transition-colors">
                    Contacto
                  </Link>
                </li>
                <li>
                  <Link href="/soporte-tecnico" className="hover:text-[#068959] transition-colors">
                    Soporte técnico
                  </Link>
                </li>
                <li>
                  <Link href="/legal" className="hover:text-[#068959] transition-colors">
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

export default function SoporteTecnico() {
  return (
    <ProtectedRoute>
      <SoporteTecnicoContent />
    </ProtectedRoute>
  )
}
