"use client"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import Image from "next/image"
import Link from "next/link"
import ProtectedRoute from "@/components/auth/protected-route"

function LegalContent() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Link href="/" className="flex-shrink-0">
              <Image
                src="/IMSS.png"
                alt="IMSS"
                width={400}
                height={100}
                className="h-14 md:h-20 lg:h-24 w-auto"
              />
            </Link>
          </div>
          <nav className="hidden md:flex items-center gap-4 lg:gap-6 flex-shrink-0">
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
            Términos Legales y Licencias
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-12">
            Información legal, licencias de software de terceros y descargo de responsabilidad
          </p>
          
          <div className="space-y-10 md:space-y-12">
            {/* Descargo de Responsabilidad Médica */}
            <section className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-600 p-8 rounded-r-xl">
              <h2 className="text-3xl font-bold text-red-800 dark:text-red-300 mb-6">⚠️ Descargo de Responsabilidad Médica</h2>
              
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-red-700 dark:text-red-400 mb-3">NO ES UN DISPOSITIVO MÉDICO</h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    Este servicio es una herramienta de software para fines informativos y de investigación. 
                    <strong> No es, y no debe ser considerado, un dispositivo médico.</strong> No ha sido aprobado 
                    ni certificado por la FDA, COFEPRIS, CE ni ninguna otra agencia reguladora nacional o 
                    internacional para el diagnóstico clínico primario.
                  </p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-red-700 dark:text-red-400 mb-3">NO APTO PARA DIAGNÓSTICO CLÍNICO</h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    La información, los análisis y los informes preliminares generados por esta plataforma 
                    <strong> no están destinados a ser utilizados para el diagnóstico, tratamiento, mitigación 
                    o prevención de ninguna enfermedad o condición médica.</strong>
                  </p>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-red-700 dark:text-red-400 mb-3">NO REEMPLAZA EL JUICIO CLÍNICO</h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    Este servicio es un asistente de software. Toda la información y los resultados deben ser 
                    revisados, verificados e interpretados por un profesional de la salud calificado (como un 
                    radiólogo certificado), quien es el único responsable de tomar decisiones diagnósticas y 
                    de tratamiento.
                  </p>
                </div>
              </div>
            </section>

            {/* Privacidad y Manejo de Datos */}
            <section className="bg-blue-50 dark:bg-blue-900/30 p-8 rounded-xl">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">🔒 Privacidad y Manejo de Datos (HIPAA / LFPDPPP)</h2>
              
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Compromiso con la Privacidad</h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                    Nos tomamos la privacidad del paciente con la máxima seriedad. Todos los datos cargados en 
                    nuestra plataforma (imágenes y texto) son:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                    <li><strong>Anonimizados</strong> antes del procesamiento para proteger la identidad del paciente</li>
                    <li><strong>Cifrados en tránsito</strong> (SSL/TLS) y en reposo (AES-256)</li>
                    <li><strong>Almacenados en servidores</strong> que cumplen con la normativa HIPAA/LFPDPPP</li>
                    <li><strong>Eliminados automáticamente</strong> después de 72 horas de procesamiento</li>
                    <li><strong>No compartidos</strong> con terceros sin consentimiento explícito</li>
                  </ul>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Uso de Datos</h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    No compartimos, vendemos ni utilizamos los datos de los pacientes para ningún fin que no sea 
                    la prestación de este servicio de análisis, de acuerdo con la Ley Federal de Protección de 
                    Datos Personales en Posesión de los Particulares (LFPDPPP) de México y las regulaciones 
                    internacionales aplicables.
                  </p>
                </div>
              </div>
            </section>

            {/* Licencias de Componentes de Terceros */}
            <section className="bg-gray-50 p-8 rounded-xl">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">📄 Licencias de Componentes de Terceros</h2>
              <p className="text-gray-600 mb-6">
                Nuestro servicio se construye sobre potentes herramientas de código abierto. El uso de nuestro 
                servicio está sujeto a los términos de estas licencias:
              </p>
              
              <div className="space-y-6">
                {/* LangChain */}
                <div className="bg-white p-6 rounded-lg border">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">LangChain</h3>
                  <div className="space-y-3">
                    <p className="text-gray-700 dark:text-gray-300">
                      <strong>Repositorio:</strong> 
                      <a href="https://github.com/langchain-ai/langchain" target="_blank" rel="noopener noreferrer" className="text-[#068959] hover:underline ml-2">
                        github.com/langchain-ai/langchain
                      </a>
                    </p>
                    <p className="text-gray-700 dark:text-gray-300">
                      <strong>Licencia:</strong> MIT License (Permisiva para uso comercial)
                    </p>
                    <p className="text-gray-600">
                      El código de orquestación se utiliza bajo la Licencia MIT, que permite el uso comercial 
                      y la modificación del software. Esta licencia es muy permisiva y no impone restricciones 
                      significativas en el uso de nuestro servicio.
                    </p>
                  </div>
                </div>

                {/* Google MedGemma */}
                <div className="bg-white p-6 rounded-lg border">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Google MedGemma</h3>
                  <div className="space-y-3">
                    <p className="text-gray-700 dark:text-gray-300">
                      <strong>Repositorio:</strong> 
                      <a href="https://huggingface.co/google/medgemma-27b-it" target="_blank" rel="noopener noreferrer" className="text-[#068959] hover:underline ml-2">
                        huggingface.co/google/medgemma-27b-it
                      </a>
                    </p>
                    <p className="text-gray-700 dark:text-gray-300">
                      <strong>Licencia:</strong> Health AI Developer Foundations Terms of Use
                    </p>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <p className="text-yellow-800 font-medium mb-2">⚠️ Restricciones Importantes:</p>
                      <ul className="list-disc list-inside text-yellow-700 space-y-1">
                        <li>Uso restringido para fines de desarrollo e investigación</li>
                        <li>Prohibido para generación de consejos médicos sin supervisión humana</li>
                        <li>No apto para diagnósticos o tratamientos sin verificación profesional</li>
                        <li>Requiere supervisión humana adecuada en todas las aplicaciones</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* NVIDIA NV-Reason-CXR */}
                <div className="bg-white p-6 rounded-lg border">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">NVIDIA NV-Reason-CXR</h3>
                  <div className="space-y-3">
                    <p className="text-gray-700 dark:text-gray-300">
                      <strong>Repositorio:</strong> 
                      <a href="https://huggingface.co/nvidia/NV-Reason-CXR-3B" target="_blank" rel="noopener noreferrer" className="text-[#068959] hover:underline ml-2">
                        huggingface.co/nvidia/NV-Reason-CXR-3B
                      </a>
                    </p>
                    <p className="text-gray-700 dark:text-gray-300">
                      <strong>Licencia:</strong> NVIDIA OneWay Non-Commercial License (nsclv1)
                    </p>
                    <div className="bg-orange-50 dark:bg-orange-900/30 p-4 rounded-lg">
                      <p className="text-orange-800 dark:text-orange-200 font-medium mb-2">⚠️ Licencia No Comercial:</p>
                      <ul className="list-disc list-inside text-orange-700 dark:text-orange-200 space-y-1">
                        <li>Uso restringido a fines no comerciales</li>
                        <li>Prohibido el uso comercial sin autorización expresa</li>
                        <li>Requiere contacto con NVIDIA para uso comercial</li>
                        <li>Limitaciones en la redistribución del modelo</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Términos de Servicio */}
            <section className="bg-green-50 dark:bg-green-900/30 p-8 rounded-xl">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">📋 Términos de Servicio</h2>
              
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Uso Aceptable</h3>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300">
                    <li>Uso exclusivamente para fines educativos y de investigación médica</li>
                    <li>Respeto a las regulaciones de privacidad de datos médicos</li>
                    <li>Supervisión profesional en todas las aplicaciones clínicas</li>
                    <li>Cumplimiento con las licencias de software de terceros</li>
                  </ul>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Limitaciones de Responsabilidad</h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    QuetzalIA y sus desarrolladores no se hacen responsables por:
                  </p>
                  <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 mt-3">
                    <li>Decisiones médicas basadas en los resultados de la plataforma</li>
                    <li>Pérdida de datos o interrupciones del servicio</li>
                    <li>Interpretaciones incorrectas de los análisis generados</li>
                    <li>Consecuencias derivadas del uso inadecuado de la plataforma</li>
                  </ul>
                </div>
                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Modificaciones</h3>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                    Nos reservamos el derecho de modificar estos términos en cualquier momento. 
                    Los cambios serán notificados a través de la plataforma y entrarán en vigor 
                    inmediatamente después de su publicación.
                  </p>
                </div>
              </div>
            </section>

            {/* Contacto Legal */}
            <section className="bg-[#068959] text-white p-8 rounded-xl">
              <h2 className="text-3xl font-bold mb-4">📞 Contacto Legal</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xl font-semibold mb-3">Para Consultas Legales</h3>
                  <p className="mb-2">Email: legal@quetzalia.com</p>
                  <p className="mb-2">Teléfono: +52 (55) 1234-5678</p>
                  <p>Horario: Lunes a Viernes, 9:00 AM - 6:00 PM (GMT-6)</p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-3">Para Reportar Problemas</h3>
                  <p className="mb-2">Email: soporte@quetzalia.com</p>
                  <p className="mb-2">Sistema de tickets: <a href="/soporte-tecnico" className="underline hover:no-underline">/soporte-tecnico</a></p>
                  <p>Respuesta garantizada en 24 horas</p>
                </div>
              </div>
            </section>
          </div>

          <div className="mt-12 text-center">
            <Link href="/contacto">
              <Button className="bg-[#068959] hover:bg-[#057a4a] text-white">
                Contactar para consultas legales
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

export default function Legal() {
  return (
    <ProtectedRoute>
      <LegalContent />
    </ProtectedRoute>
  )
}
