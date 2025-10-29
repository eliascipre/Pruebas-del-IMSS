"use client"

import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { useState, useEffect } from "react"

export default function EntornosAprendizaje() {
  const [baseUrl, setBaseUrl] = useState('http://localhost')
  
  useEffect(() => {
    // Detectar el hostname y protocolo del navegador
    if (typeof window !== 'undefined') {
      setBaseUrl(`${window.location.protocol}//${window.location.hostname}`)
    }
  }, [])

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
          </nav>
        </div>
      </header>

      <main className="py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-6">
          {/* Título Principal */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#068959] mb-4">
              Entornos de Aprendizaje
            </h1>
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
              Selecciona el entorno de aprendizaje que mejor se adapte a tus necesidades educativas
            </p>
          </div>

          {/* Grid de Opciones */}
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 max-w-5xl mx-auto">
            {/* Simulación */}
            <div className="bg-white rounded-3xl overflow-hidden shadow-2xl hover:shadow-3xl transition-shadow">
              <div className="relative w-full h-64 md:h-80">
                <Image
                  src="/5.png"
                  alt="Simulación"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6 md:p-8 space-y-4">
                <h2 className="text-2xl md:text-3xl font-bold text-[#068959]">
                  Simulación
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  Sistema avanzado de simulación de entrevistas médicas pre-visita que utiliza MedGemma como entrevistador y pacientes virtuales para generar reportes clínicos estructurados.
                </p>
                <Link 
                  href={`${baseUrl}:5003`}
                  target="_blank"
                >
                  <Button className="w-full bg-[#068959] hover:bg-[#057a4a] text-white font-semibold text-base px-6 md:px-8 py-4 md:py-6 rounded-xl">
                    Acceder a Simulación
                  </Button>
                </Link>
              </div>
            </div>

            {/* Educación Radiológica */}
            <div className="bg-white rounded-3xl overflow-hidden shadow-2xl hover:shadow-3xl transition-shadow">
              <div className="relative w-full h-64 md:h-80">
                <Image
                  src="/4.png"
                  alt="Educación Radiológica"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-6 md:p-8 space-y-4">
                <h2 className="text-2xl md:text-3xl font-bold text-[#068959]">
                  Educación Radiológica
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  Plataforma educativa interactiva que utiliza casos de estudio reales y análisis multimodal para enseñar interpretación radiológica y términos médicos especializados.
                </p>
                <Link 
                  href={`${baseUrl}:5002`}
                  target="_blank"
                >
                  <Button className="w-full bg-[#068959] hover:bg-[#057a4a] text-white font-semibold text-base px-6 md:px-8 py-4 md:py-6 rounded-xl">
                    Acceder a Educación
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Botón de Regreso */}
          <div className="text-center mt-12">
            <Link href="/">
              <Button variant="outline" className="border-[#068959] text-[#068959] hover:bg-[#068959] hover:text-white">
                Volver al Inicio
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

