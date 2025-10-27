"use client"

import { Button } from "@/components/ui/button"
import Image from "next/image"
import Link from "next/link"
import { useState } from "react"

export default function Home() {
  const [showContent, setShowContent] = useState(false)
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
            <a href="#agentes" className="text-gray-700 hover:text-[#068959] font-medium transition-colors">
              Agentes IA
            </a>
            <a href="#" className="text-gray-700 hover:text-[#068959] font-medium transition-colors">
              Registro
            </a>
            <a href="#" className="text-gray-700 hover:text-[#068959] font-medium transition-colors">
              Nosotros
            </a>
          </nav>
          {/* Mobile menu button - can be expanded later */}
          <button className="md:hidden text-gray-700 hover:text-[#068959] transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </header>

      <main>
        {/* Hero Section - Show only when showContent is false */}
        {!showContent && (
          <section id="inicio" className="relative min-h-screen flex flex-col lg:flex-row">
            {/* Left Side - Medical Technology Image (50% width) */}
            <div className="hidden lg:block lg:w-1/2 h-screen relative">
              <Image
                src="/Rectangle 91911.png"
                alt="Medical AI Technology"
                fill
                className="object-contain"
                priority
              />
            </div>

            {/* Mobile Image */}
            <div className="lg:hidden w-full h-[300px] relative">
              <Image
                src="/Rectangle 91911.png"
                alt="Medical AI Technology"
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
                  <p className="text-base md:text-lg text-gray-700 leading-relaxed">
                    Una herramienta de agentes inteligentes que encuentra los detalles cruciales invisibles al ojo humano. Precisión diagnóstica de clase mundial con la calidez y el ingenio de la tecnología hecha en México.
                  </p>
                </div>

                {/* CTA Button */}
                <div className="pt-4">
                  <Button 
                    onClick={() => setShowContent(true)}
                    className="w-full sm:w-auto bg-gradient-to-r from-[#068959] to-[#0dab70] hover:from-[#057a4a] hover:to-[#068959] text-white font-semibold text-base md:text-lg px-8 md:px-10 py-5 md:py-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
                  >
                    Descubre más aquí
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Show content when user clicks "Descubre más aquí" */}
        {showContent && (
          <>
        {/* Hero Section for Desktop Content */}
        <section className="w-full bg-white py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-6">
            {/* Centered Title and Description */}
            <div className="text-center max-w-4xl mx-auto space-y-6 mb-12">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold">
                <span className="text-indigo-900">IA en Imagenología:</span>
                <br />
                <span className="text-[#068959]">El Camino hacia la Máxima Certeza Diagnóstica.</span>
              </h1>
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed mx-auto">
                Una herramienta de agentes inteligentes que encuentra los detalles cruciales invisibles al ojo humano. Precisión diagnóstica de clase mundial con la calidez y el ingenio de la tecnología hecha en México.
              </p>
              <Link href="/chat">
                <Button className="bg-[#068959] hover:bg-[#057a4a] text-white font-semibold px-8 py-6 rounded-xl text-lg">
                  Inicia una conversación
                </Button>
              </Link>
            </div>

            {/* Hero Image */}
            <div className="w-full h-[500px] md:h-[600px] relative rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src="/Image.png"
                alt="Doctor with Medical AI"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </section>

        {/* Powered By Section */}
        <section className="bg-gray-50 py-8 md:py-12 border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-6">
            <p className="text-center text-gray-500 text-xs md:text-sm mb-4 md:mb-6 font-medium">Powered by:</p>
            <div className="flex items-center justify-center gap-4 md:gap-6 lg:gap-8 flex-wrap">
              <div className="bg-white px-6 md:px-10 py-4 md:py-5 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <Image
                  src="/logo_nvidia.png"
                  alt="NVIDIA"
                  width={100}
                  height={35}
                  className="object-contain w-[80px] md:w-[120px] h-auto"
                />
              </div>
              <div className="bg-white px-5 md:px-8 py-4 md:py-5 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <Image
                  src="/logo_mexico.png"
                  alt="Hecho en México"
                  width={110}
                  height={35}
                  className="object-contain w-[100px] md:w-[140px] h-auto"
                />
              </div>
              <div className="bg-white px-6 md:px-10 py-4 md:py-5 rounded-lg shadow-md hover:shadow-lg transition-shadow">
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
        <section id="agentes" className="py-12 md:py-20 bg-white scroll-mt-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
              <div className="space-y-4 md:space-y-6 order-2 md:order-1">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#068959] leading-tight">
                  Agente de Inteligencia Artificial
                </h2>
                <p className="text-gray-600 text-base md:text-lg leading-relaxed">
                  Call out a feature, benefit, or value of your site, then link to a page where people can learn more
                  about it.
                </p>
                <Button className="bg-[#068959] hover:bg-[#057a4a] text-white font-semibold text-base px-6 md:px-8 py-4 md:py-6 rounded-xl w-full sm:w-auto">
                  Call to action
                </Button>
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

        {/* Section 2: Entornos de aprendizaje - image left, text right */}
        <section className="py-12 md:py-20 bg-gray-50">
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
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#068959] leading-tight">Entornos de aprendizaje</h2>
                <p className="text-gray-600 text-base md:text-lg leading-relaxed">
                  When there's one great thing, there's usually another. What's your second thing to showcase?
                </p>
                <Button className="bg-[#068959] hover:bg-[#057a4a] text-white font-semibold text-base px-6 md:px-8 py-4 md:py-6 rounded-xl w-full sm:w-auto">
                  Another button
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Simulador de conversaciones - text left, image right */}
        <section className="py-12 md:py-20 bg-white">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
              <div className="space-y-4 md:space-y-6 order-2 md:order-1">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#068959] leading-tight">
                  Simulador de conversaciones
                </h2>
                <p className="text-gray-600 text-base md:text-lg leading-relaxed">
                  Call out a feature, benefit, or value of your site, then link to a page where people can learn more
                  about it.
                </p>
                <Button className="bg-[#068959] hover:bg-[#057a4a] text-white font-semibold text-base px-6 md:px-8 py-4 md:py-6 rounded-xl w-full sm:w-auto">
                  Call to action
                </Button>
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

        {/* Section 4: Radiología - image left, text right */}
        <section className="py-12 md:py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
              <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl">
                <Image
                  src="/chest-x-ray-radiography-with-green-holographic-ove.jpg"
                  alt="Radiología"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="space-y-4 md:space-y-6">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#068959] leading-tight">Radiología</h2>
                <p className="text-gray-600 text-base md:text-lg leading-relaxed">
                  When there's one great thing, there's usually another. What's your second thing to showcase?
                </p>
                <Button className="bg-[#068959] hover:bg-[#057a4a] text-white font-semibold text-base px-6 md:px-8 py-4 md:py-6 rounded-xl w-full sm:w-auto">
                  Another button
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 py-12 md:py-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
              <div className="space-y-4 sm:col-span-2 md:col-span-1">
                <h3 className="text-xl md:text-2xl font-bold text-gray-900">Quetzalia salud</h3>
                <p className="text-gray-600 text-sm">Inteligencia Artificial para la salud.</p>
                <div className="flex items-center gap-4 pt-4">
                  <Link href="#" className="text-gray-500 hover:text-[#068959] transition-colors">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073z" />
                    </svg>
                  </Link>
                  <Link href="#" className="text-gray-500 hover:text-[#068959] transition-colors">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                  </Link>
                  <Link href="#" className="text-gray-500 hover:text-[#068959] transition-colors">
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </Link>
                </div>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-4">Features</h4>
                <ul className="space-y-2 text-gray-600">
                  <li>
                    <Link href="#" className="hover:text-[#068959] transition-colors">
                      Core features
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="hover:text-[#068959] transition-colors">
                      Pro experience
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="hover:text-[#068959] transition-colors">
                      Integrations
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-4">Learn more</h4>
                <ul className="space-y-2 text-gray-600">
                  <li>
                    <Link href="#" className="hover:text-[#068959] transition-colors">
                      Blog
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="hover:text-[#068959] transition-colors">
                      Case studies
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="hover:text-[#068959] transition-colors">
                      Customer stories
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="hover:text-[#068959] transition-colors">
                      Best practices
                    </Link>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 mb-4">Support</h4>
                <ul className="space-y-2 text-gray-600">
                  <li>
                    <Link href="#" className="hover:text-[#068959] transition-colors">
                      Contact
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="hover:text-[#068959] transition-colors">
                      Support
                    </Link>
                  </li>
                  <li>
                    <Link href="#" className="hover:text-[#068959] transition-colors">
                      Legal
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </footer>
          </>
        )}
      </main>
    </div>
  )
}
