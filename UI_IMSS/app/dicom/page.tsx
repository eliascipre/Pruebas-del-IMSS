"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import ProtectedRoute from "@/components/auth/protected-route"
import Link from "next/link"
import Image from "next/image"
import html2canvas from "html2canvas"
import {
  init as initCornerstone,
  RenderingEngine,
  Enums,
  getRenderingEngine,
} from "@cornerstonejs/core"
import {
  init as initTools,
  addTool,
  PanTool,
  ZoomTool,
  WindowLevelTool,
  ToolGroupManager,
} from "@cornerstonejs/tools"
import dicomParser from "dicom-parser"

const ViewportType = Enums.ViewportType

// Configurar el image loader dinámicamente solo en el cliente
let cornerstoneWADOImageLoader: any = null

function DicomPageContent() {
  const viewerRef = useRef<HTMLDivElement>(null)
  const renderingEngineRef = useRef<RenderingEngine | null>(null)
  const viewportRef = useRef<any>(null)
  const windowWidthRef = useRef<number>(2048)
  const windowCenterRef = useRef<number>(1024)
  const [isLoading, setIsLoading] = useState(false)
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [imageId, setImageId] = useState<string | null>(null)
  const [isViewerEnabled, setIsViewerEnabled] = useState(false)
  const [windowWidth, setWindowWidth] = useState(2048)
  const [windowCenter, setWindowCenter] = useState(1024)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<string | null>(null)

  // Inicializar Cornerstone
  useEffect(() => {
    // Solo ejecutar en el cliente
    if (typeof window === "undefined") return

    let isMounted = true

    const initCornerstoneLib = async () => {
      try {
        // Inicializar Cornerstone Core
        await initCornerstone()
        
        if (!isMounted) return
        
        // Inicializar herramientas de Cornerstone
        initTools()
        
        // Configurar herramientas básicas
        addTool(PanTool)
        addTool(ZoomTool)
        addTool(WindowLevelTool)
        
        // Crear un ToolGroup para el visor
        const toolGroupId = "dicom-viewer-toolgroup"
        let toolGroup = ToolGroupManager.getToolGroup(toolGroupId)
        
        if (!toolGroup) {
          toolGroup = ToolGroupManager.createToolGroup(toolGroupId)
        }
        
        if (toolGroup && isMounted) {
          // Agregar herramientas al ToolGroup
          toolGroup.addTool(PanTool.toolName)
          toolGroup.addTool(ZoomTool.toolName)
          toolGroup.addTool(WindowLevelTool.toolName)
          
          // Activar herramientas con botones del mouse
          toolGroup.setToolActive(PanTool.toolName, {
            bindings: [{ mouseButton: 1 }], // Botón izquierdo para Pan
          })
          toolGroup.setToolActive(ZoomTool.toolName, {
            bindings: [{ mouseButton: 2 }], // Botón derecho para Zoom
          })
          toolGroup.setToolActive(WindowLevelTool.toolName, {
            bindings: [{ mouseButton: 4 }], // Botón central para Window/Level
          })
        }
      } catch (error) {
        console.error("Error inicializando Cornerstone:", error)
      }
    }

    initCornerstoneLib()

    return () => {
      isMounted = false
      // Limpiar al desmontar
      if (renderingEngineRef.current) {
        try {
          renderingEngineRef.current.destroy()
          renderingEngineRef.current = null
        } catch (error) {
          console.error("Error destruyendo rendering engine:", error)
        }
      }
    }
  }, [])

  // Habilitar visor cuando el elemento esté listo
  useEffect(() => {
    // Solo ejecutar en el cliente
    if (typeof window === "undefined") return
    if (!viewerRef.current || isViewerEnabled) return

    let isMounted = true

    const setupViewer = async () => {
      try {
        const element = viewerRef.current
        if (!element || !isMounted) return

        // Verificar si ya existe un RenderingEngine
        const renderingEngineId = "dicom-rendering-engine"
        let renderingEngine = getRenderingEngine(renderingEngineId)

        if (!renderingEngine && isMounted) {
          renderingEngine = new RenderingEngine(renderingEngineId)
          renderingEngineRef.current = renderingEngine
        }

        if (!renderingEngine || !isMounted) return

        // Crear viewport
        const viewportId = "dicom-viewport"
        if (!element.id) {
          element.id = viewportId
        }

        // Verificar si el viewport ya existe
        try {
          const existingViewport = renderingEngine.getViewport(viewportId)
          if (existingViewport) {
            viewportRef.current = existingViewport
            setIsViewerEnabled(true)
            return
          }
        } catch (error) {
          // El viewport no existe, continuar con la creación
        }

        const viewportInput = {
          viewportId: viewportId,
          type: ViewportType.STACK,
          element: element,
        }

        renderingEngine.enableElement(viewportInput)
        const viewport = renderingEngine.getViewport(viewportId)
        
        if (isMounted) {
          viewportRef.current = viewport

          // Agregar el viewport al ToolGroup
          const toolGroupId = "dicom-viewer-toolgroup"
          const toolGroup = ToolGroupManager.getToolGroup(toolGroupId)
          if (toolGroup) {
            try {
              toolGroup.addViewport(viewportId, renderingEngineId)
            } catch (error) {
              // El viewport ya puede estar agregado
              console.warn("No se pudo agregar el viewport al ToolGroup:", error)
            }
          }

          setIsViewerEnabled(true)
        }
      } catch (error) {
        console.error("Error habilitando visor:", error)
      }
    }

    setupViewer()

    return () => {
      isMounted = false
    }
  }, [isViewerEnabled])

  // Cargar imagen cuando imageId cambie
  useEffect(() => {
    // Solo ejecutar en el cliente
    if (typeof window === "undefined") return

    if (imageId && viewerRef.current && isViewerEnabled) {
      loadImage(imageId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageId, isViewerEnabled])

  const loadImage = async (id: string) => {
    if (!viewportRef.current || !renderingEngineRef.current) {
      console.error("Viewport o RenderingEngine no están disponibles")
      return
    }

    setIsLoading(true)
    try {
      const viewport = viewportRef.current
      
      console.log("Cargando imagen con ID:", id)
      
      // Cargar imagen en el viewport
      await viewport.setStack([id], 0)
      
      console.log("Imagen cargada en el viewport")
      
      // Renderizar la imagen primero sin establecer window/level
      // Esto permite que Cornerstone.js use los valores por defecto de la imagen
      viewport.render()
      
      console.log("Imagen renderizada")
      
      // Obtener los metadatos de la imagen para window/level después de cargar
      // Esperar un momento para que la imagen se cargue completamente
      setTimeout(async () => {
        try {
          const { metaData } = await import("@cornerstonejs/core")
          
          // Obtener los metadatos de la imagen usando el imageId
          // Intentar diferentes módulos de metadatos
          const voiModule = metaData.get("voiLutModule", id) || {}
          const imageModule = metaData.get("imagePixelModule", id) || {}
          
          // Intentar obtener window/level de los metadatos DICOM
          let windowWidthFromImage = voiModule.WindowWidth || voiModule.windowWidth
          let windowCenterFromImage = voiModule.WindowCenter || voiModule.windowCenter
          
          // Si no están en voiModule, intentar calcular desde los valores de píxeles
          if (!windowWidthFromImage && imageModule.smallestImagePixelValue !== undefined && imageModule.largestImagePixelValue !== undefined) {
            const range = imageModule.largestImagePixelValue - imageModule.smallestImagePixelValue
            windowWidthFromImage = range > 0 ? range : 2048
            windowCenterFromImage = (imageModule.smallestImagePixelValue + imageModule.largestImagePixelValue) / 2 || 1024
          }
          
          if (windowWidthFromImage && windowCenterFromImage) {
            const width = Array.isArray(windowWidthFromImage) ? windowWidthFromImage[0] : windowWidthFromImage
            const center = Array.isArray(windowCenterFromImage) ? windowCenterFromImage[0] : windowCenterFromImage
            
            // Validar que los valores sean válidos antes de establecerlos
            const validWidth = Number(width)
            const validCenter = Number(center)
            
            if (!isNaN(validWidth) && !isNaN(validCenter) && validWidth > 0 && validCenter > 0) {
              windowWidthRef.current = validWidth
              windowCenterRef.current = validCenter
              setWindowWidth(validWidth)
              setWindowCenter(validCenter)
            }
          }
        } catch (error) {
          console.warn("No se pudieron obtener los metadatos de window/level:", error)
          // Usar valores por defecto que ya están establecidos
        }
      }, 300)
    } catch (error) {
      console.error("Error cargando imagen:", error)
      alert("Error al cargar la imagen DICOM. Por favor, verifica que el archivo sea válido.")
    } finally {
      setIsLoading(false)
    }
  }

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
      // Esperar a que el loader esté disponible
      if (!cornerstoneWADOImageLoader) {
        const [loaderModule, cornerstoneModule] = await Promise.all([
          // @ts-ignore - cornerstone-wado-image-loader no tiene tipos
          import("cornerstone-wado-image-loader"),
          import("@cornerstonejs/core"),
        ])
        cornerstoneWADOImageLoader = loaderModule
        loaderModule.external.cornerstone = cornerstoneModule
        loaderModule.external.dicomParser = dicomParser

        // Configurar codecs
        loaderModule.configure({
          beforeSend: (xhr: any) => {
            // Configuración adicional si es necesaria
          },
          decodeConfig: {
            convertFloatPixelDataToInt: false,
            use16BitDataType: false,
          },
        })
      }

      // Crear un imageId para el archivo local
      const fileImageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(file)
      setImageId(fileImageId)
    } catch (error) {
      console.error("Error procesando archivo DICOM:", error)
      alert("Error al procesar el archivo DICOM. Por favor, verifica que el archivo sea válido.")
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

  const handleCapture = async () => {
    if (!viewerRef.current) {
      alert("No hay imagen cargada para capturar")
      return
    }

    try {
      setIsLoading(true)
      
      // Capturar el canvas del visor
      const canvas = await html2canvas(viewerRef.current, {
        backgroundColor: "#000000",
        scale: 1,
        logging: false,
      })

      // Convertir a blob y luego a base64
      canvas.toBlob((blob) => {
        if (!blob) {
          alert("Error al generar la captura")
          return
        }

        const reader = new FileReader()
        reader.onloadend = () => {
          const base64String = reader.result as string
          sendToMedGemma(base64String)
        }
        reader.readAsDataURL(blob)
      }, "image/png")
    } catch (error) {
      console.error("Error capturando imagen:", error)
      alert("Error al capturar la imagen")
    } finally {
      setIsLoading(false)
    }
  }

  const sendToMedGemma = async (base64Image: string) => {
    setIsAnalyzing(true)
    setAnalysisResult(null)

    try {
      // Extraer solo la parte base64 (sin el prefijo data:image/png;base64,)
      const base64Data = base64Image.split(",")[1] || base64Image

      // TODO: Reemplazar con la URL real del modelo medgemma
      const medgemmaUrl = process.env.NEXT_PUBLIC_MEDGEMMA_URL || "http://localhost:8000/api/analyze"

      const response = await fetch(medgemmaUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: base64Data,
          image_format: "png",
          prompt: "Analiza esta imagen DICOM y describe los hallazgos principales.",
        }),
      })

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`)
      }

      const data = await response.json()
      
      // Simular respuesta dummy si el servidor no está disponible
      if (response.status === 404 || !data.response) {
        setAnalysisResult(
          "[RESPUESTA DUMMY - MedGemma no configurado]\n\n" +
          "Análisis de imagen DICOM:\n" +
          "- Imagen cargada correctamente\n" +
          "- Dimensiones: Detectadas automáticamente\n" +
          "- Window/Level: Ajustable mediante controles\n" +
          "\nPara conectar con MedGemma, configura NEXT_PUBLIC_MEDGEMMA_URL en las variables de entorno."
        )
      } else {
        setAnalysisResult(data.response || data.analysis || "Análisis completado")
      }
    } catch (error: any) {
      console.error("Error enviando a MedGemma:", error)
      
      // Mostrar respuesta dummy en caso de error
      setAnalysisResult(
        "[RESPUESTA DUMMY - Error de conexión]\n\n" +
        "No se pudo conectar con el modelo MedGemma.\n" +
        "Error: " + (error.message || "Desconocido") + "\n\n" +
        "Análisis simulado:\n" +
        "- Imagen DICOM procesada correctamente\n" +
        "- Herramientas de visualización disponibles\n" +
        "- Controles de Window/Level funcionando\n" +
        "\nPara conectar con MedGemma, configura NEXT_PUBLIC_MEDGEMMA_URL en las variables de entorno."
      )
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleWindowLevelChange = (type: "width" | "center", value: number) => {
    if (!viewportRef.current || !imageId) return

    // Validar que el valor sea válido (mayor que 0)
    const numValue = Number(value)
    if (isNaN(numValue) || numValue <= 0 || !isFinite(numValue)) {
      console.warn("Valor inválido recibido:", numValue)
      return
    }

    // Obtener los valores actuales de los refs antes de actualizar
    // Asegurar que los valores del ref sean válidos, usar valores por defecto si no lo son
    let currentWidth = windowWidthRef.current
    let currentCenter = windowCenterRef.current

    // Si los valores del ref son inválidos, usar los valores del estado o valores por defecto
    if (!currentWidth || currentWidth <= 0 || isNaN(currentWidth) || !isFinite(currentWidth)) {
      currentWidth = windowWidth > 0 ? windowWidth : 2048
      windowWidthRef.current = currentWidth
    }
    if (!currentCenter || currentCenter <= 0 || isNaN(currentCenter) || !isFinite(currentCenter)) {
      currentCenter = windowCenter > 0 ? windowCenter : 1024
      windowCenterRef.current = currentCenter
    }

    // Calcular los nuevos valores ANTES de actualizar los refs
    const newWidth = type === "width" ? numValue : currentWidth
    const newCenter = type === "center" ? numValue : currentCenter

    // Validar que ambos valores sean válidos antes de aplicar
    if (newWidth <= 0 || isNaN(newWidth) || !isFinite(newWidth) || 
        newCenter <= 0 || isNaN(newCenter) || !isFinite(newCenter)) {
      console.warn("Valores inválidos de window/level calculados:", { 
        newWidth, 
        newCenter, 
        numValue, 
        currentWidth, 
        currentCenter,
        windowWidth,
        windowCenter
      })
      return
    }

    // Actualizar los refs y el estado
    if (type === "width") {
      windowWidthRef.current = numValue
      setWindowWidth(numValue)
    } else {
      windowCenterRef.current = numValue
      setWindowCenter(numValue)
    }

    // Aplicar window/level inmediatamente con los valores calculados
    try {
      const viewport = viewportRef.current
      if (!viewport || !imageId) return

      // Validar una vez más antes de aplicar (usando los valores calculados)
      // Asegurar que ambos valores sean válidos y mayores que 0
      const finalWidth = Math.max(1, Math.round(newWidth))
      const finalCenter = Math.round(newCenter)
      
      // Validación estricta final: ambos deben ser números válidos y mayores que 0
      if (
        typeof finalWidth === "number" &&
        typeof finalCenter === "number" &&
        !isNaN(finalWidth) &&
        !isNaN(finalCenter) &&
        isFinite(finalWidth) &&
        isFinite(finalCenter) &&
        finalWidth > 0 &&
        finalCenter > 0 &&
        finalWidth < 100000 &&
        finalCenter < 100000
      ) {
        // Verificar una última vez que finalWidth no sea 0 (por si acaso)
        if (finalWidth === 0) {
          console.error("ERROR CRÍTICO: finalWidth es 0 después de Math.max(1, ...)", {
            newWidth,
            finalWidth,
            currentWidth,
            windowWidth
          })
          return
        }
        
        try {
          viewport.setProperties({
            voiRange: {
              windowWidth: finalWidth,
              windowCenter: finalCenter,
            },
          })
          viewport.render()
        } catch (error) {
          console.error("Error al aplicar window/level al viewport:", error)
        }
      } else {
        console.warn("Valores inválidos detectados antes de aplicar:", {
          finalWidth,
          finalCenter,
          newWidth,
          newCenter,
          windowWidth,
          windowCenter,
          currentWidth,
          currentCenter,
        })
      }
    } catch (error) {
      console.error("Error ajustando window/level:", error)
    }
  }

  const handleReset = () => {
    if (!viewportRef.current || !imageId) return

    try {
      const viewport = viewportRef.current
      // Resetear a valores por defecto
      const defaultWidth = 2048
      const defaultCenter = 1024
      windowWidthRef.current = defaultWidth
      windowCenterRef.current = defaultCenter
      setWindowWidth(defaultWidth)
      setWindowCenter(defaultCenter)
      viewport.setProperties({
        voiRange: {
          windowWidth: defaultWidth,
          windowCenter: defaultCenter,
        },
      })
      viewport.render()
    } catch (error) {
      console.error("Error reseteando visor:", error)
    }
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
              <Image src="/IMSS.png" alt="IMSS" width={90} height={60} className="h-12 w-auto" />
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Visor DICOM</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
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

            {/* Window/Level Controls */}
            {imageId && windowWidth > 0 && windowCenter > 0 && !isLoading && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Controles de Visualización
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Window Width: {windowWidth}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10000"
                      step="1"
                      value={Math.max(1, windowWidth)}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10)
                        if (!isNaN(val) && val > 0 && val >= 1) {
                          handleWindowLevelChange("width", val)
                        }
                      }}
                      onInput={(e) => {
                        // Prevenir valores inválidos mientras se arrastra
                        const target = e.target as HTMLInputElement
                        const val = parseInt(target.value, 10)
                        if (isNaN(val) || val <= 0 || val < 1) {
                          target.value = Math.max(1, windowWidth).toString()
                        }
                      }}
                      className="w-full"
                      disabled={isLoading || !viewportRef.current}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Window Center: {windowCenter}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="10000"
                      step="1"
                      value={Math.max(1, windowCenter)}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10)
                        if (!isNaN(val) && val > 0 && val >= 1) {
                          handleWindowLevelChange("center", val)
                        }
                      }}
                      onInput={(e) => {
                        // Prevenir valores inválidos mientras se arrastra
                        const target = e.target as HTMLInputElement
                        const val = parseInt(target.value, 10)
                        if (isNaN(val) || val <= 0 || val < 1) {
                          target.value = Math.max(1, windowCenter).toString()
                        }
                      }}
                      className="w-full"
                      disabled={isLoading || !viewportRef.current}
                    />
                  </div>
                  <Button 
                    onClick={handleReset} 
                    variant="outline" 
                    className="w-full"
                    disabled={isLoading || !viewportRef.current}
                  >
                    Resetear Vista
                  </Button>
                </div>
              </div>
            )}

            {/* Capture and Analysis */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Análisis con MedGemma
              </h2>
              <div className="space-y-3">
                <Button
                  onClick={handleCapture}
                  disabled={!imageId || isLoading || isAnalyzing}
                  className="w-full bg-[#068959] hover:bg-[#057a4a] text-white"
                >
                  {isAnalyzing ? (
                    <>
                      <Spinner className="w-4 h-4 mr-2" />
                      Analizando...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Capturar y Analizar
                    </>
                  )}
                </Button>
                {analysisResult && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Resultado del Análisis:
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {analysisResult}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Instructions */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Instrucciones:
              </h3>
              <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
                <li>Importa un archivo DICOM (.dcm)</li>
                <li>Usa el mouse para navegar: izquierdo (Window/Level), central (Pan), derecho (Zoom)</li>
                <li>Ajusta Window Width y Center con los controles</li>
                <li>Captura y analiza con MedGemma</li>
                <li>Exporta el archivo DICOM original</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Panel - Viewer */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 bg-black relative overflow-hidden">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
                <div className="text-center">
                  <Spinner className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-white text-sm">Cargando imagen DICOM...</p>
                </div>
              </div>
            )}
            <div
              ref={viewerRef}
              className="w-full h-full"
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: "#000000",
              }}
            />
            {!imageId && !isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-gray-400">
                  <svg className="w-24 h-24 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-lg font-medium">No hay imagen cargada</p>
                  <p className="text-sm mt-2">Importa un archivo DICOM para comenzar</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DicomPage() {
  return (
    <ProtectedRoute>
      <DicomPageContent />
    </ProtectedRoute>
  )
}

