"use client"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import Image from "next/image"
import Link from "next/link"
import ProtectedRoute from "@/components/auth/protected-route"

function IntegracionesContent() {
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
            Integraciones
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-12">
            Nuestra plataforma utiliza tecnologías de vanguardia para proporcionar capacidades avanzadas de IA médica.
          </p>
          
          <div className="space-y-10 md:space-y-12">
            {/* MedGemma Section */}
            <section className="bg-gray-50 dark:bg-gray-800 p-8 rounded-xl">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">MedGemma</h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">Modelo de lenguaje especializado en medicina desarrollado por Google Health</p>
                  <div className="flex gap-4 flex-wrap">
                    <a href="https://github.com/google-health/medgemma" target="_blank" rel="noopener noreferrer" className="text-[#068959] hover:underline">
                      GitHub: google-health/medgemma
                    </a>
                    <a href="https://huggingface.co/google/medgemma-27b-it" target="_blank" rel="noopener noreferrer" className="text-[#068959] hover:underline">
                      Hugging Face: medgemma-27b-it
                    </a>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Descripción</h3>
                  <p className="text-gray-600 leading-relaxed">
                    MedGemma es una familia de modelos de lenguaje grandes (LLM) especializados en medicina,
                    basados en Gemma y entrenados específicamente para aplicaciones médicas. Utilizamos 
                    la versión instruct de 27 billones de parámetros (medgemma-27b-it) que ha sido 
                    optimizada para responder preguntas médicas, analizar casos clínicos y proporcionar 
                    explicaciones médicas precisas.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Uso en nuestra plataforma</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li><strong>Chatbot médico:</strong> Proporciona respuestas contextualizadas a preguntas médicas en lenguaje natural</li>
                    <li><strong>Análisis de casos clínicos:</strong> Interpreta síntomas, historiales y datos del paciente</li>
                    <li><strong>Generación de reportes:</strong> Crea reportes médicos estructurados basados en entrevistas</li>
                    <li><strong>Educación médica:</strong> Explica conceptos médicos complejos de manera comprensible</li>
                    <li><strong>Análisis multimodal:</strong> Procesa texto médico junto con imágenes radiológicas</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Características técnicas</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>Modelo instruct fine-tuned para diálogos médicos</li>
                    <li>Entrenado con datos médicos de alta calidad</li>
                    <li>Soporte para contexto extendido en conversaciones</li>
                    <li>Capacidad de razonamiento médico avanzado</li>
                    <li>Generación de respuestas seguras y contextualizadas</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* NV-Reason-CXR Section */}
            <section className="bg-gray-50 dark:bg-gray-800 p-8 rounded-xl">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">NV-Reason-CXR</h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">Modelo de visión especializado en análisis de radiografías de tórax desarrollado por NVIDIA</p>
                  <div className="flex gap-4 flex-wrap">
                    <a href="https://github.com/NVIDIA-Medtech/NV-Reason-CXR" target="_blank" rel="noopener noreferrer" className="text-[#068959] hover:underline">
                      GitHub: NVIDIA-Medtech/NV-Reason-CXR
                    </a>
                    <a href="https://huggingface.co/nvidia/NV-Reason-CXR-3B" target="_blank" rel="noopener noreferrer" className="text-[#068959] hover:underline">
                      Hugging Face: NV-Reason-CXR-3B
                    </a>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Descripción</h3>
                  <p className="text-gray-600 leading-relaxed">
                    NV-Reason-CXR es un modelo multimodal de 3 billones de parámetros diseñado específicamente 
                    para el análisis de radiografías de tórax (CXR). Este modelo combina capacidades de visión 
                    computacional con razonamiento de lenguaje natural para proporcionar análisis detallados 
                    y explicativos de imágenes radiológicas.
                  </p>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Uso en nuestra plataforma</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li><strong>Análisis de radiografías:</strong> Interpreta y describe hallazgos en radiografías de tórax</li>
                    <li><strong>Educación radiológica:</strong> Proporciona explicaciones detalladas de hallazgos para estudiantes</li>
                    <li><strong>Generación de reportes:</strong> Crea reportes radiológicos estructurados basados en imágenes</li>
                    <li><strong>Preguntas y respuestas:</strong> Responde preguntas específicas sobre imágenes radiológicas</li>
                    <li><strong>Detección de patologías:</strong> Identifica y describe diversas condiciones pulmonares</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Características técnicas</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li>Arquitectura multimodal que combina visión y lenguaje</li>
                    <li>Optimizado específicamente para radiografías de tórax</li>
                    <li>Capacidad de razonamiento clínico sobre imágenes</li>
                    <li>Generación de explicaciones contextualizadas</li>
                    <li>Modelo ligero (3B parámetros) para inferencia eficiente</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* LangChain Section */}
            <section className="bg-gray-50 dark:bg-gray-800 p-8 rounded-xl">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">LangChain</h2>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">Framework de Python para construir aplicaciones con modelos de lenguaje</p>
                  <div className="flex gap-4 flex-wrap">
                    <a href="https://github.com/langchain-ai/langchain" target="_blank" rel="noopener noreferrer" className="text-[#068959] hover:underline">
                      GitHub: langchain-ai/langchain
                    </a>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Descripción</h3>
                  <p className="text-gray-600 leading-relaxed">
                    LangChain es un framework de código abierto diseñado para simplificar la construcción 
                    de aplicaciones con modelos de lenguaje. Proporciona herramientas y abstracciones 
                    para orquestar cadenas de procesamiento, gestionar memoria de conversación, integrar 
                    herramientas externas y construir aplicaciones RAG (Retrieval-Augmented Generation).
                  </p>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Uso en nuestra plataforma</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li><strong>Orquestación de modelos:</strong> Coordina las interacciones entre MedGemma y NV-Reason-CXR</li>
                    <li><strong>Gestión de memoria:</strong> Mantiene contexto en conversaciones médicas extendidas</li>
                    <li><strong>Output parsing:</strong> Estructura y valida las respuestas de los modelos</li>
                    <li><strong>Streaming:</strong> Proporciona respuestas en tiempo real a los usuarios</li>
                    <li><strong>Fallback automático:</strong> Implementa sistemas de respaldo cuando falla un modelo</li>
                    <li><strong>RAG (Retrieval-Augmented Generation):</strong> Integra bases de conocimiento médico con modelos</li>
                    <li><strong>Few-shot prompting:</strong> Mejora las respuestas mediante ejemplos contextuales</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Componentes utilizados</h3>
                  <ul className="list-disc list-inside text-gray-600 space-y-2">
                    <li><strong>ChatOpenAI:</strong> Interfaz para interactuar con modelos compatibles con OpenAI API</li>
                    <li><strong>StrOutputParser:</strong> Parsea y valida salidas de texto de los modelos</li>
                    <li><strong>RunnableLambda:</strong> Crea cadenas de procesamiento personalizadas</li>
                    <li><strong>Conversation Memory:</strong> Gestión avanzada de memoria de conversación</li>
                    <li><strong>LangChain Expression Language (LCEL):</strong> Construcción declarativa de cadenas</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Arquitectura de integración</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Utilizamos LangChain para crear un sistema robusto que integra nuestros diferentes modelos:
                  </p>
                  <ul className="list-disc list-inside text-gray-600 space-y-2 mt-2">
                    <li>Flujo de datos entre componentes del sistema</li>
                    <li>Manejo de errores y reintentos automáticos</li>
                    <li>Transformación y validación de datos médicosPe</li>
                    <li>Integración con sistemas de caché para optimización</li>
                    <li>Gestión de estado en aplicaciones asíncronas</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Integración General */}
            <section className="bg-[#068959] text-white p-8 rounded-xl">
              <h2 className="text-3xl font-bold mb-4">Arquitectura Integrada</h2>
              <p className="text-lg mb-4 leading-relaxed">
                Nuestra plataforma combina estas tecnologías de manera sinérgica:
              </p>
              <ul className="list-disc list-inside space-y-2 text-lg">
                <li>MedGemma proporciona el razonamiento médico y la generación de lenguaje natural</li>
                <li>NV-Reason-CXR especializa el análisis de imágenes radiológicas</li>
                <li>LangChain orquesta todo el sistema, gestionando flujos de trabajo complejos</li>
                <li>La integración permite análisis multimodal combinando texto e imágenes</li>
                <li>Sistemas de fallback aseguran alta disponibilidad y confiabilidad</li>
              </ul>
            </section>
          </div>

          <div className="mt-12 text-center">
            <Link href="/caracteristicas-principales">
              <Button className="bg-[#068959] hover:bg-[#057a4a] text-white">
                Ver características principales
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer - usando el mismo que caracteristicas-principales */}
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

export default function Integraciones() {
  return (
    <ProtectedRoute>
      <IntegracionesContent />
    </ProtectedRoute>
  )
}

