"use client"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import Image from "next/image"
import Link from "next/link"
import ProtectedRoute from "@/components/auth/protected-route"

function MejoresPracticasContent() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 md:py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Link href="/" className="flex-shrink-0">
              <Image
                src="/logo_imss.png"
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
            Mejores Prácticas
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-12">
            Guía para el uso responsable y efectivo de la IA en el ámbito médico
          </p>
          
          <div className="space-y-10 md:space-y-12">
            {/* Principio Fundamental */}
            <section className="bg-red-50 border-l-4 border-red-500 p-8 rounded-r-xl">
              <h2 className="text-2xl font-bold text-red-800 mb-4">⚠️ Principio Fundamental</h2>
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">La IA como Herramienta de Soporte, no como Sustituto</h3>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
                  <strong>Fundamental:</strong> Los resultados generados por nuestra plataforma son para fines informativos 
                  y de soporte a la decisión. Nunca deben sustituir el juicio clínico de un radiólogo o médico calificado. 
                  Todo análisis, diagnóstico y plan de tratamiento debe ser verificado y finalizado por un profesional 
                  de la salud certificado.
                </p>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-yellow-800 font-medium">
                    🚨 Recuerda: La IA es un asistente, no un reemplazo del criterio médico profesional.
                  </p>
                </div>
              </div>
            </section>

            {/* Calidad de Entrada */}
            <section className="bg-gray-50 dark:bg-gray-800 p-8 rounded-xl">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">1. Calidad de la Entrada (GIGO: Garbage In, Garbage Out)</h2>
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  La precisión de los modelos de IA, especialmente NV-Reason-CXR, depende directamente de la calidad 
                  de las imágenes de entrada. Recomendamos utilizar imágenes de radiografía en formatos JPG o PNG 
                  con una resolución y exposición adecuadas, siguiendo los protocolos de adquisición 
                  de imágenes de su institución.
                </p>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-green-700 mb-3">✅ Buenas Prácticas</h3>
                    <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                      <li>• Imágenes en formato JPG o PNG de alta calidad</li>
                      <li>• Resolución mínima de 1024x1024 píxeles</li>
                      <li>• Exposición adecuada sin sobre/sub-exposición</li>
                      <li>• Posicionamiento correcto del paciente</li>
                      <li>• Ausencia de artefactos de movimiento</li>
                    </ul>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-red-700 mb-3">❌ Evitar</h3>
                    <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                      <li>• Imágenes de baja resolución</li>
                      <li>• Formatos comprimidos con pérdida</li>
                      <li>• Imágenes con artefactos significativos</li>
                      <li>• Posicionamiento incorrecto</li>
                      <li>• Exposición inadecuada</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Ingeniería de Contexto */}
            <section className="bg-blue-50 p-8 rounded-xl">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">2. Ingeniería de Contexto (Prompting Clínico)</h2>
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  Nuestro sistema utiliza técnicas avanzadas de prompting (gestionadas a través de LangChain) 
                  para guiar a los modelos de IA. Sin embargo, proporcionar un contexto clínico claro (como la 
                  historia del paciente o la sospecha diagnóstica) junto con la imagen mejorará significativamente 
                  la relevancia y precisión de los hallazgos de la IA.
                </p>
                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Información Contextual Recomendada</h3>
                  <ul className="grid md:grid-cols-2 gap-4 text-gray-600 dark:text-gray-300">
                    <li>• Edad y sexo del paciente</li>
                    <li>• Síntomas principales</li>
                    <li>• Historia clínica relevante</li>
                    <li>• Medicamentos actuales</li>
                    <li>• Sospecha diagnóstica</li>
                    <li>• Estudios previos</li>
                    <li>• Factores de riesgo</li>
                    <li>• Motivo del estudio</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Revisión de Cadena de Pensamiento */}
            <section className="bg-green-50 p-8 rounded-xl">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">3. Revisión y Verificación de la "Cadena de Pensamiento"</h2>
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  Una característica clave de nuestra integración con NV-Reason-CXR es la capacidad de revisar su 
                  razonamiento paso a paso. Alentamos a los usuarios a no solo leer el informe final, sino a revisar 
                  esta cadena de pensamiento para comprender cómo el modelo llegó a sus conclusiones, identificando 
                  posibles fallos o sesgos en el razonamiento.
                </p>
                
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Proceso de Revisión Recomendado</h3>
                  <ol className="space-y-3 text-gray-600 dark:text-gray-300">
                    <li><strong>1. Análisis de Hallazgos:</strong> Revisar cada hallazgo identificado por la IA</li>
                    <li><strong>2. Evaluación de Evidencia:</strong> Verificar si la evidencia visual respalda las conclusiones</li>
                    <li><strong>3. Coherencia Clínica:</strong> Determinar si los hallazgos son clínicamente coherentes</li>
                    <li><strong>4. Validación Cruzada:</strong> Comparar con conocimiento clínico establecido</li>
                    <li><strong>5. Documentación:</strong> Registrar cualquier discrepancia o limitación identificada</li>
                  </ol>
                </div>
              </div>
            </section>

            {/* Ciclo de Retroalimentación */}
            <section className="bg-purple-50 p-8 rounded-xl">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">4. Ciclo de Retroalimentación Continua</h2>
              <div className="space-y-4">
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  La IA médica mejora con la retroalimentación. Nuestra plataforma incluye herramientas para que 
                  los clínicos marquen análisis como "útiles", "parcialmente correctos" o "incorrectos". Esta 
                  retroalimentación es vital para auditar el rendimiento del modelo y mejorar nuestros sistemas 
                  en futuras iteraciones.
                </p>
                
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg text-center">
                    <div className="text-3xl mb-3">✅</div>
                    <h3 className="font-semibold text-green-700 dark:text-green-400 mb-2">Útil</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">El análisis fue preciso y clínicamente relevante</p>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg text-center">
                    <div className="text-3xl mb-3">⚠️</div>
                    <h3 className="font-semibold text-yellow-700 dark:text-yellow-400 mb-2">Parcialmente Correcto</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Algunos hallazgos fueron precisos, otros no</p>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg text-center">
                    <div className="text-3xl mb-3">❌</div>
                    <h3 className="font-semibold text-red-700 dark:text-red-400 mb-2">Incorrecto</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300">El análisis no fue clínicamente preciso</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Consideraciones Éticas */}
            <section className="bg-gray-100 p-8 rounded-xl">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">5. Consideraciones Éticas y de Privacidad</h2>
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Privacidad del Paciente</h3>
                    <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                      <li>• Anonimización de datos antes del procesamiento</li>
                      <li>• Cumplimiento con normativas HIPAA/LFPDPPP</li>
                      <li>• Cifrado de datos en tránsito y reposo</li>
                      <li>• Eliminación automática de datos temporales</li>
                    </ul>
                  </div>
                  
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Transparencia</h3>
                    <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                      <li>• Documentación clara de limitaciones</li>
                      <li>• Explicación del proceso de análisis</li>
                      <li>• Identificación de sesgos potenciales</li>
                      <li>• Comunicación de incertidumbre</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Recursos Adicionales */}
            <section className="bg-[#068959] text-white p-8 rounded-xl">
              <h2 className="text-3xl font-bold mb-4">Recursos Adicionales</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xl font-semibold mb-3">Documentación Técnica</h3>
                  <ul className="space-y-2">
                    <li>• <a href="/integraciones" className="underline hover:no-underline">Arquitectura de Integraciones</a></li>
                    <li>• <a href="/legal" className="underline hover:no-underline">Términos Legales y Licencias</a></li>
                    <li>• <a href="/soporte-tecnico" className="underline hover:no-underline">Soporte Técnico</a></li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-3">Capacitación</h3>
                  <ul className="space-y-2">
                    <li>• <a href="/casos-de-estudio" className="underline hover:no-underline">Casos de Estudio</a></li>
                    <li>• <a href="/blog" className="underline hover:no-underline">Artículos del Blog</a></li>
                    <li>• <a href="/contacto" className="underline hover:no-underline">Solicitar Capacitación</a></li>
                  </ul>
                </div>
              </div>
            </section>
          </div>

          <div className="mt-12 text-center">
            <Link href="/integraciones">
              <Button className="bg-[#068959] hover:bg-[#057a4a] text-white">
                Ver integraciones técnicas
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

export default function MejoresPracticas() {
  return (
    <ProtectedRoute>
      <MejoresPracticasContent />
    </ProtectedRoute>
  )
}
