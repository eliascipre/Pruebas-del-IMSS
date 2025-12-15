"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import ProtectedRoute from "@/components/auth/protected-route"
import Link from "next/link"
import Image from "next/image"

function DicomOhifPageContent() {
  const [isLoading, setIsLoading] = useState(false)
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [ohifUrl, setOhifUrl] = useState<string | null>(null)
  const [useIframe, setUseIframe] = useState(true)

  // Para desarrollo local, puedes usar un servidor OHIF local
  // Para producción, necesitarás desplegar OHIF Viewer o usar una instancia pública
  const DEFAULT_OHIF_URL = process.env.NEXT_PUBLIC_OHIF_URL || "https://viewer.ohif.org"

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Verificar que sea un archivo DICOM
    if (!file.name.toLowerCase().endsWith(".dcm") && !file.type.includes("dicom")) {
      alert("Por favor selecciona un archivo DICOM (.dcm)")
      return
    }

    setCurrentFile(file)
    setIsLoading(true)

    try {
      // Para usar OHIF con archivos locales, necesitarías:
      // 1. Subir el archivo a un servidor DICOMweb
      // 2. O usar un servidor local que sirva los archivos
      // Por ahora, mostramos el visor OHIF básico
      
      // Si tienes un servidor DICOMweb configurado, puedes pasar el estudio:
      // const studyInstanceUID = await extractStudyInstanceUID(file)
      // setOhifUrl(`${DEFAULT_OHIF_URL}?studyInstanceUIDs=${studyInstanceUID}`)
      
      setOhifUrl(DEFAULT_OHIF_URL)
    } catch (error) {
      console.error("Error procesando archivo DICOM:", error)
      alert("Error al procesar el archivo DICOM. Por favor, verifica que el archivo sea válido.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = () => {
    if (!currentFile) {
      alert("No hay archivo DICOM cargado para exportar")
      return
    }

    // Crear un enlace de descarga
    const url = URL.createObjectURL(currentFile)
    const a = document.createElement("a")
    a.href = url
    a.download = currentFile.name || "imagen.dcm"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/home" className="text-gray-700 dark:text-gray-300 hover:text-[#068959] dark:hover:text-[#0dab70] transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </Link>
            <div className="flex items-center gap-2">
              <Image src="/logo_imss.png" alt="IMSS" width={90} height={60} className="h-12 w-auto" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Visor DICOM (OHIF)</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/dicom" className="text-gray-700 dark:text-gray-300 hover:text-[#068959] dark:hover:text-[#0dab70] font-medium">
              Visor Cornerstone
            </Link>
            <Link href="/radiografias" className="text-gray-700 dark:text-gray-300 hover:text-[#068959] dark:hover:text-[#0dab70] font-medium">
              Radiografías
            </Link>
            <Link href="/home" className="text-gray-700 dark:text-gray-300 hover:text-[#068959] dark:hover:text-[#0dab70] font-medium">
              Inicio
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Controls */}
        <div className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-6 overflow-y-auto flex-shrink-0">
          <div className="space-y-6">
            {/* File Upload */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Archivo DICOM
              </h2>
              <div className="space-y-3">
                <div>
                  <label htmlFor="dicom-file" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Importar archivo DICOM
                  </label>
                  <Input
                    id="dicom-file"
                    type="file"
                    accept=".dcm,.dicom"
                    onChange={handleFileSelect}
                    className="w-full"
                    disabled={isLoading}
                  />
                </div>
                {currentFile && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Archivo:</span> {currentFile.name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Tamaño:</span>{" "}
                      {(currentFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    onClick={handleExport}
                    disabled={!currentFile || isLoading}
                    variant="outline"
                    className="flex-1"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Exportar
                  </Button>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Acerca de OHIF Viewer:
              </h3>
              <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
                <li>Visor DICOM zero-footprint</li>
                <li>Integrado con Cornerstone3D</li>
                <li>Renderizado acelerado por GPU</li>
                <li>Herramientas profesionales de visualización</li>
                <li>Sin problemas de contextos WebGL</li>
              </ul>
            </div>

            {/* Instructions */}
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Nota Importante:
              </h3>
              <p className="text-xs text-gray-700 dark:text-gray-300">
                Para usar archivos locales con OHIF Viewer, necesitas configurar un servidor DICOMweb 
                o usar la instancia pública de OHIF. Para producción, considera desplegar tu propia 
                instancia de OHIF Viewer.
              </p>
            </div>
          </div>
        </div>

        {/* Right Panel - OHIF Viewer */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 bg-black relative overflow-hidden">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
                <div className="text-center">
                  <Spinner className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-white text-sm">Cargando OHIF Viewer...</p>
                </div>
              </div>
            )}
            {ohifUrl ? (
              <iframe
                src={ohifUrl}
                className="w-full h-full border-0"
                style={{ width: "100%", height: "100%" }}
                title="OHIF DICOM Viewer"
                allow="camera; microphone; fullscreen"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <svg className="w-24 h-24 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-lg font-medium">OHIF Viewer no configurado</p>
                  <p className="text-sm mt-2">
                    Configura NEXT_PUBLIC_OHIF_URL o usa la instancia pública
                  </p>
                  <Button
                    onClick={() => setOhifUrl(DEFAULT_OHIF_URL)}
                    className="mt-4 bg-[#068959] hover:bg-[#057a4a] text-white"
                  >
                    Abrir OHIF Viewer Público
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DicomOhifPage() {
  return (
    <ProtectedRoute>
      <DicomOhifPageContent />
    </ProtectedRoute>
  )
}


