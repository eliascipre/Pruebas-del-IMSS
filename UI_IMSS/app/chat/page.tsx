"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

interface Message {
  role: 'user' | 'assistant'
  text: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [sessionId, setSessionId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const formatMarkdown = (text: string): string => {
    // Primero, detectar y arreglar tablas que tienen filas sin | al inicio
    const lines = text.split('\n')
    let inTable = false
    const fixedLines: string[] = []
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Detectar si estamos en una tabla (tiene | en algún lugar)
      if (line.includes('|') && !line.includes('```')) {
        inTable = true
        
        // Si la línea tiene | pero no empieza con |, agregarlo
        if (!line.trim().startsWith('|') && line.trim().includes('|')) {
          const trimmedLine = line.trim()
          // Si termina con |, agregar | al inicio
          if (trimmedLine.endsWith('|')) {
            fixedLines.push('|' + trimmedLine)
          } else {
            // Si no termina con |, arreglar ambos
            const fixedLine = '|' + trimmedLine + (trimmedLine.includes('|') ? '' : '|')
            fixedLines.push(fixedLine)
          }
        } else {
          fixedLines.push(line)
        }
      } else if (inTable && !line.trim() && i + 1 < lines.length && lines[i + 1] && !lines[i + 1].includes('|')) {
        // Salir de la tabla si hay línea vacía y la siguiente no es tabla
        inTable = false
        fixedLines.push(line)
      } else {
        fixedLines.push(line)
      }
    }
    
    const fixedText = fixedLines.join('\n')
    
    // Convertir markdown a HTML básico
    let html = fixedText
      // Bold **text** -> <strong>text</strong>
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Listas con * al inicio de línea -> <ul><li> (antes que texto normal con *)
      .replace(/^\*\s+(.*)$/gm, '<li>$1</li>')
      // Agrupar listas consecutivas
      .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
      // Encabezados ## -> <h3>
      .replace(/^###\s+(.*$)/gm, '<h3>$1</h3>')
      .replace(/^##\s+(.*$)/gm, '<h2>$1</h2>')
      .replace(/^#\s+(.*$)/gm, '<h1>$1</h1>')
      // Italic *text* -> <em>text</em> (después de listas)
      .replace(/\*([^*]+?)\*/g, (match, content) => {
        // Solo si no empieza con espacio (para no afectar listas)
        return content.startsWith(' ') || content.endsWith(' ') ? match : `<em>${content}</em>`
      })
    
    // Procesar tablas - convertir | a HTML table
    const htmlLines = html.split('\n')
    let tableHTML = ''
    let tableRows: string[] = []
    let inTableMode = false
    
    for (let i = 0; i < htmlLines.length; i++) {
      const line = htmlLines[i]
      
      if (line.trim().includes('|') && !line.includes('```')) {
        if (!inTableMode) {
          // Iniciar tabla
          inTableMode = true
          tableRows = []
        }
        
        // Limpiar la línea y procesar
        const cells = line.split('|').map(cell => cell.trim()).filter(cell => cell)
        
        // Ignorar filas separadoras (solo contienen -)
        if (!cells.every(cell => /^-+$/.test(cell))) {
          tableRows.push(cells)
        }
      } else {
        // Si estaba en modo tabla, cerrar la tabla
        if (inTableMode && tableRows.length > 0) {
          tableHTML += '<div class="overflow-x-auto"><table class="border-collapse border border-gray-300 my-4 w-full min-w-full"><tbody>'
          
          for (let rowIdx = 0; rowIdx < tableRows.length; rowIdx++) {
            const row = tableRows[rowIdx]
            const isHeader = rowIdx === 0
            
            tableHTML += `<tr${isHeader ? ' class="bg-gray-100 font-semibold"' : ''}>`
            row.forEach(cell => {
              const tag = isHeader ? 'th' : 'td'
              tableHTML += `<${tag} class="border border-gray-300 px-3 py-2">${cell}</${tag}>`
            })
            tableHTML += '</tr>'
            
            // Agregar separador después del header
            if (isHeader && rowIdx === 0 && tableRows.length > 1) {
              tableHTML += '<tr>'
              row.forEach(() => {
                tableHTML += '<td class="border border-gray-300 px-0 py-0 h-1 bg-gray-400"></td>'
              })
              tableHTML += '</tr>'
            }
          }
          
          tableHTML += '</tbody></table></div>'
          tableRows = []
          inTableMode = false
        }
        
        // Agregar línea normal
        tableHTML += (tableHTML ? '\n' : '') + line
      }
    }
    
    // Si termina en modo tabla, cerrarla
    if (inTableMode && tableRows.length > 0) {
      tableHTML += '<div class="overflow-x-auto"><table class="border-collapse border border-gray-300 my-4 w-full min-w-full"><tbody>'
      tableRows.forEach((row, rowIdx) => {
        const isHeader = rowIdx === 0
        tableHTML += `<tr${isHeader ? ' class="bg-gray-100 font-semibold"' : ''}>`
        row.forEach(cell => {
          const tag = isHeader ? 'th' : 'td'
          tableHTML += `<${tag} class="border border-gray-300 px-3 py-2">${cell}</${tag}>`
        })
        tableHTML += '</tr>'
      })
      tableHTML += '</tbody></table></div>'
    }
    
    // Finalmente, convertir saltos de línea
    return tableHTML.replace(/\n/g, '<br/>')
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen')
      return
    }

    // Leer imagen como base64
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result as string
      // Remover el prefijo data:image/...;base64,
      const base64 = base64String.split(',')[1] || base64String
      setSelectedImage(base64)
      setImagePreview(base64String) // Para preview
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
  }

  const handleSendMessage = async () => {
    if (!input.trim() && !selectedImage) return
    if (isLoading) return

    const userMessage = input.trim() || "Analiza esta radiografía médica"
    setInput("")
    setImagePreview(null)
    const imageToSend = selectedImage
    setSelectedImage(null)
    setIsLoading(true)

    // Agregar mensaje del usuario (mostrar texto o indicar que hay imagen)
    setMessages(prev => [...prev, { 
      role: 'user', 
      text: userMessage || '📷 Imagen médica enviada' 
    }])

    try {
      // Detectar la URL del backend dinámicamente
      const getBackendUrl = () => {
        // Si estamos en el cliente, usar la misma URL base del navegador
        if (typeof window !== 'undefined') {
          const protocol = window.location.protocol
          const hostname = window.location.hostname
          // Si la UI corre en un puerto diferente, usar el hostname actual
          // y asumir que los servicios están en el mismo host con diferentes puertos
          return `${protocol}//${hostname}:5001`
        }
        // Fallback para SSR (aunque esta es una página client-side)
        return process.env.NEXT_PUBLIC_CHATBOT_URL || 'http://localhost:5001'
      }
      
      // Llamar al backend
      const response = await fetch(`${getBackendUrl()}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          image: imageToSend, // Imagen en base64
          image_format: 'jpeg',
          session_id: sessionId || undefined,
          stream: true, // Usar streaming para mejor UX
        }),
      })

      if (!response.ok) {
        throw new Error('Error al enviar mensaje')
      }

      // Crear mensaje de asistente vacío
      let assistantMessage = ""
      setMessages(prev => [...prev, { role: 'assistant', text: '' }])

      // Leer streaming
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.content) {
                  assistantMessage += data.content
                  // Actualizar último mensaje con contenido acumulado
                  setMessages(prev => {
                    const updated = [...prev]
                    updated[updated.length - 1] = {
                      role: 'assistant',
                      text: assistantMessage,
                    }
                    return updated
                  })
                }
                if (data.done) {
                  // Guardar session_id si se recibe
                  if (data.session_id) {
                    setSessionId(data.session_id)
                  }
                }
              } catch (e) {
                // Ignorar errores de parsing
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error)
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: 'Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.'
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {/* Left Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-2 mb-4">
            <Image
              src="/IMSS.png"
              alt="IMSS"
              width={60}
              height={40}
              className="h-8 w-auto"
            />
          </div>
          <div className="mb-4">
            <Image
              src="/quetzalia.png"
              alt="quetzalIA.mx"
              width={140}
              height={40}
              className="h-8 w-auto"
            />
          </div>
          <Button className="w-full bg-[#068959] hover:bg-[#057a4a] text-white">
            + Nuevo chat
          </Button>
          <div className="mt-3">
            <Button variant="ghost" className="w-full justify-start">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Buscar
            </Button>
          </div>
        </div>

        {/* Your conversations */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">Tus conversaciones</h3>
            <button className="text-xs text-blue-600 hover:text-blue-700">Borrar todo</button>
          </div>
          
          {/* Conversation list */}
          <div className="space-y-2">
            {/* Sin conversaciones dummy - lista vacía */}
            <p className="text-sm text-gray-500 text-center py-8">No hay conversaciones aún</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <Button variant="ghost" className="w-full justify-start mb-4">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Configuración
          </Button>
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 cursor-pointer">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-semibold">AN</span>
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-900">Andrew Neilson</div>
            </div>
            <svg className="w-4 h-4 text-[#068959]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-end gap-8">
            <Link href="#" className="text-gray-700 hover:text-[#068959] font-medium">
              Agentes IA
            </Link>
            <Link href="#" className="text-gray-700 hover:text-[#068959] font-medium">
              Registro
            </Link>
            <Link href="#" className="text-gray-700 hover:text-[#068959] font-medium">
              Nosotros
            </Link>
          </div>
        </div>

        {/* Chat Messages Area - Fixed Scroll */}
        <div className="flex-1 overflow-y-auto p-8">
          {messages.length === 0 ? (
            <>
              <div className="flex flex-col items-center justify-center h-full">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">¿Cómo puedo ayudarte hoy?</h2>
                  <p className="text-gray-500 mb-6">Inicia una conversación con nuestro asistente de IA</p>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full max-w-4xl mx-auto space-y-4">
              {messages.length > 0 && messages.map((msg, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className={`flex-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    <div className={`inline-block px-4 py-2 rounded-lg ${
                      msg.role === 'user' ? 'bg-[#068959] text-white' : 'bg-gray-100 text-gray-900'
                    }`}>
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.text) }} />
                      ) : (
                        msg.text
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input Area - Fixed */}
        <div className="bg-white border-t border-gray-200 p-6 flex-shrink-0">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col gap-2">
              {/* Preview de imagen */}
              {imagePreview && (
                <div className="relative inline-block">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="max-h-32 rounded-lg"
                  />
                  <button
                    onClick={handleRemoveImage}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              )}
              
              {/* Input area */}
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3 border border-gray-200 focus-within:border-[#068959] transition-colors">
                <label htmlFor="image-upload" className="cursor-pointer">
                  <svg className="w-6 h-6 text-gray-400 hover:text-[#068959]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </label>
                <input
                  type="file"
                  id="image-upload"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  disabled={isLoading}
                />
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="¿Qué tienes en mente?..."
                  className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400"
                  disabled={isLoading}
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={isLoading || (!input.trim() && !selectedImage)}
                  className="w-8 h-8 bg-[#068959] rounded-full flex items-center justify-center hover:bg-[#057a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

