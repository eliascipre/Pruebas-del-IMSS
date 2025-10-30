"use client"

import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"

export default function HistoriasDeClientes() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white sticky top-0 z-50">
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
            <Link href="/" className="text-gray-700 hover:text-[#068959] font-medium transition-colors">
              Inicio
            </Link>
            <Link href="/entornos" className="text-gray-700 hover:text-[#068959] font-medium transition-colors">
              Entornos
            </Link>
          </nav>
        </div>
      </header>

      <main className="py-12 md:py-20">
        <div className="max-w-6xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-bold text-[#068959] mb-6">
            Historias de Clientes
          </h1>
          <p className="text-xl text-gray-600 mb-12">
            Testimonios reales de profesionales de la salud que han transformado su práctica con nuestra plataforma
          </p>
          
          <div className="space-y-12">
            {/* Testimonio 1 */}
            <section className="bg-white border border-gray-200 rounded-xl p-8">
              <div className="flex items-start gap-6">
                <div className="w-20 h-20 bg-gradient-to-r from-[#068959] to-[#057a4a] rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  DR
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">Dr. Carlos Mendoza</h3>
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                      Radiólogo
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2">Hospital General de México</p>
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <blockquote className="text-gray-700 italic leading-relaxed">
                    "La plataforma de QuetzalIA ha revolucionado completamente mi práctica diaria. 
                    Lo que antes me tomaba 30-45 minutos analizar una radiografía compleja, ahora 
                    lo puedo hacer en 5-10 minutos con mayor precisión. La capacidad de la IA para 
                    explicar su razonamiento paso a paso me ha ayudado a mejorar mis propias habilidades 
                    diagnósticas."
                  </blockquote>
                  <div className="mt-4 text-sm text-gray-500">
                    <p><strong>Resultado:</strong> 60% reducción en tiempo de análisis, 25% mejora en precisión diagnóstica</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Testimonio 2 */}
            <section className="bg-white border border-gray-200 rounded-xl p-8">
              <div className="flex items-start gap-6">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  DM
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">Dra. María Elena Rodríguez</h3>
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                      Neumóloga
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2">Instituto Nacional de Enfermedades Respiratorias</p>
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <blockquote className="text-gray-700 italic leading-relaxed">
                    "Como neumóloga, necesito analizar cientos de radiografías semanalmente. 
                    QuetzalIA no solo me ayuda a ser más eficiente, sino que también me ha enseñado 
                    a reconocer patrones que antes pasaba por alto. La integración con MedGemma 
                    es especialmente valiosa para casos complejos donde necesito contexto clínico adicional."
                  </blockquote>
                  <div className="mt-4 text-sm text-gray-500">
                    <p><strong>Resultado:</strong> 200+ radiografías analizadas semanalmente, 40% mejora en detección temprana</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Testimonio 3 */}
            <section className="bg-white border border-gray-200 rounded-xl p-8">
              <div className="flex items-start gap-6">
                <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  DR
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">Dr. Roberto Silva</h3>
                    <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                      Director Médico
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2">Clínica Privada del Valle</p>
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <blockquote className="text-gray-700 italic leading-relaxed">
                    "Implementar QuetzalIA en nuestra clínica fue una de las mejores decisiones 
                    que hemos tomado. No solo hemos mejorado la calidad de nuestros diagnósticos, 
                    sino que también hemos reducido significativamente los tiempos de espera para 
                    nuestros pacientes. El ROI se vio reflejado en los primeros 3 meses."
                  </blockquote>
                  <div className="mt-4 text-sm text-gray-500">
                    <p><strong>Resultado:</strong> 50% reducción en tiempos de espera, 35% mejora en satisfacción del paciente</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Testimonio 4 */}
            <section className="bg-white border border-gray-200 rounded-xl p-8">
              <div className="flex items-start gap-6">
                <div className="w-20 h-20 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  DR
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">Dra. Ana Patricia López</h3>
                    <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                      Residente
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2">Hospital Universitario - Programa de Radiología</p>
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <blockquote className="text-gray-700 italic leading-relaxed">
                    "Como residente, QuetzalIA ha sido mi mejor herramienta de aprendizaje. 
                    La capacidad de ver el razonamiento paso a paso de la IA me ha ayudado a 
                    entender mejor los patrones radiológicos. Es como tener un tutor personal 
                    disponible 24/7. Mis calificaciones han mejorado significativamente."
                  </blockquote>
                  <div className="mt-4 text-sm text-gray-500">
                    <p><strong>Resultado:</strong> 85% mejora en calificaciones, 90% satisfacción con el aprendizaje</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Estadísticas de Satisfacción */}
            <section className="bg-[#068959] text-white p-8 rounded-xl">
              <h2 className="text-3xl font-bold mb-6 text-center">Satisfacción de Nuestros Clientes</h2>
              <div className="grid md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">98%</div>
                  <p className="text-lg">Satisfacción General</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">95%</div>
                  <p className="text-lg">Recomendarían el Servicio</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">92%</div>
                  <p className="text-lg">Mejora en Eficiencia</p>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2">89%</div>
                  <p className="text-lg">Mejora en Precisión</p>
                </div>
              </div>
            </section>
          </div>

          <div className="mt-12 text-center">
            <Link href="/contacto">
              <Button className="bg-[#068959] hover:bg-[#057a4a] text-white">
                Únete a nuestros clientes satisfechos
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-12 md:py-16 mt-20">
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
              <p className="text-gray-600 text-sm">Inteligencia Artificial para la salud.</p>
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
              <h4 className="font-bold text-gray-900 mb-4">Características</h4>
              <ul className="space-y-2 text-gray-600">
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
              <h4 className="font-bold text-gray-900 mb-4">Aprende más</h4>
              <ul className="space-y-2 text-gray-600">
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
              <h4 className="font-bold text-gray-900 mb-4">Soporte</h4>
              <ul className="space-y-2 text-gray-600">
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
