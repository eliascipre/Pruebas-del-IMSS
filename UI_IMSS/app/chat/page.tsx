"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

interface Message {
  role: 'user' | 'assistant'
  text: string
}

interface ConversationItem {
  id: string
  title: string
  updated_at: number
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [sessionId, setSessionId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userId, setUserId] = useState<string>("")
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [loadingConvs, setLoadingConvs] = useState(false)
  // Config removida

  const getBackendUrl = useMemo(() => {
    return () => {
      if (typeof window !== 'undefined') {
        const protocol = window.location.protocol
        const hostname = window.location.hostname
        return `${protocol}//${hostname}:5001`
      }
      return process.env.NEXT_PUBLIC_CHATBOT_URL || 'http://localhost:5001'
    }
  }, [])

  useEffect(() => {
    // user_id persistente en localStorage
    const key = 'imss_user_id'
    let uid = ''
    try {
      uid = localStorage.getItem(key) || ''
      if (!uid) {
        uid = crypto.randomUUID()
        localStorage.setItem(key, uid)
      }
    } catch {}
    setUserId(uid)
  }, [])

  const fetchConversations = async () => {
    if (!userId) return
    setLoadingConvs(true)
    try {
      const url = new URL(`${getBackendUrl()}/api/conversations`)
      url.searchParams.set('user_id', userId)
      const res = await fetch(url.toString())
      const data = await res.json()
      const items: ConversationItem[] = (data.conversations || []).map((c: any) => ({ id: c.id, title: c.title, updated_at: c.updated_at }))
      setConversations(items)
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingConvs(false)
    }
  }

  useEffect(() => { fetchConversations() }, [userId])

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
    let tableRows: string[][] = []
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

    // Validar que sea una imagen en formato JPG o PNG
    if (!file.type.startsWith('image/') || (!file.type.includes('jpeg') && !file.type.includes('png'))) {
      alert('Por favor selecciona una imagen en formato JPG o PNG')
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
      
      // Si no hay sessionId, crear una conversación primero
      let currentSession = sessionId
      if (!currentSession) {
        try {
          const res = await fetch(`${getBackendUrl()}/api/conversations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, title: 'Nueva conversación' })
          })
          const data = await res.json()
          currentSession = data.session_id
          setSessionId(currentSession)
          fetchConversations()
        } catch (e) { console.error(e) }
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
          session_id: currentSession || undefined,
          user_id: userId || undefined,
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
                  // Al terminar, refrescar lista de conversaciones
                  fetchConversations()
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

  const handleNewChat = async () => {
    if (!userId) return
    try {
      const res = await fetch(`${getBackendUrl()}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, title: 'Nueva conversación' })
      })
      const data = await res.json()
      setSessionId(data.session_id)
      setMessages([])
      fetchConversations()
    } catch (e) { console.error(e) }
  }

  const handleDeleteAll = async () => {
    if (!userId) return
    try {
      const url = new URL(`${getBackendUrl()}/api/conversations`)
      url.searchParams.set('user_id', userId)
      await fetch(url.toString(), { method: 'DELETE' })
      setMessages([])
      setSessionId("")
      fetchConversations()
    } catch (e) { console.error(e) }
  }

  return (
    <div className="min-h-screen h-full flex bg-gray-50">
      {/* Left Sidebar (desktop) */}
      <div className="hidden md:flex w-80 bg-white border-r border-gray-200 flex-col">
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
          <Button onClick={handleNewChat} className="w-full bg-[#068959] hover:bg-[#057a4a] text-white">+ Nuevo chat</Button>
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
            <button onClick={handleDeleteAll} className="text-xs text-blue-600 hover:text-blue-700">Borrar todo</button>
          </div>
          
          {/* Conversation list */}
          <div className="space-y-2">
            {loadingConvs && <p className="text-sm text-gray-500 text-center py-8">Cargando...</p>}
            {!loadingConvs && conversations.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">No hay conversaciones aún</p>
            )}
            {conversations.map((c) => (
              <div key={c.id} className={`w-full px-3 py-2 rounded hover:bg-gray-100 ${sessionId===c.id?'bg-gray-100':''}`}>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSessionId(c.id)} className="flex-1 text-left">
                    <div className="text-sm text-gray-900">{c.title || 'Conversación'}</div>
                    <div className="text-xs text-gray-500">{new Date((c.updated_at||0)*1000).toLocaleString()}</div>
                  </button>
                  <button
                    aria-label="Renombrar"
                    className="text-xs text-blue-600 hover:text-blue-700"
                    onClick={async () => {
                      const title = prompt('Nuevo título', c.title || 'Conversación')
                      if (!title || !title.trim()) return
                      try {
                        await fetch(`${getBackendUrl()}/api/conversations/${c.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ user_id: userId, title: title.trim() })
                        })
                        fetchConversations()
                      } catch (e) { console.error(e) }
                    }}
                  >Renombrar</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 cursor-pointer">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-semibold">IM</span>
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-900">IMSS</div>
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
        <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0">
          {/* Mobile: hamburger + logo */}
          <div className="flex md:hidden items-center justify-between">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <button aria-label="Abrir menú" className="text-gray-700 hover:text-[#068959] transition-colors">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 sm:w-80 p-0">
                {/* Sidebar content reused for mobile */}
                <div className="flex flex-col h-full">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center gap-2 mb-4">
                      <Image src="/IMSS.png" alt="IMSS" width={60} height={40} className="h-8 w-auto" />
                    </div>
                    <div className="mb-4">
                      <Image src="/quetzalia.png" alt="quetzalIA.mx" width={140} height={40} className="h-8 w-auto" />
                    </div>
                    <Button className="w-full bg-[#068959] hover:bg-[#057a4a] text-white">+ Nuevo chat</Button>
                    <div className="mt-3">
                      <Button variant="ghost" className="w-full justify-start">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Buscar
                      </Button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-900">Tus conversaciones</h3>
                      <button className="text-xs text-blue-600 hover:text-blue-700">Borrar todo</button>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500 text-center py-8">No hay conversaciones aún</p>
                    </div>
                  </div>
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
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <Image src="/IMSS.png" alt="IMSS" width={60} height={40} className="h-7 w-auto" />
            </div>
          </div>
          {/* Desktop links */}
          <div className="hidden md:flex items-center justify-end gap-6 lg:gap-8">
            <Link href="#" className="text-gray-700 hover:text-[#068959] font-medium">
              Agentes IA
            </Link>
            <Link href="#" className="text-gray-700 hover:text-[#068959] font-medium">
              Registro
            </Link>
            <Link href="#" className="text-gray-700 hover:text-[#068959] font-medium">
              Nosotros
            </Link>
            <Link href="/metrics" className="text-gray-700 hover:text-[#068959] font-medium">
              Métricas
            </Link>
          </div>
        </div>

        {/* Chat Messages Area - Fixed Scroll */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
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
            <div className="w-full max-w-3xl md:max-w-4xl mx-auto space-y-3 sm:space-y-4">
              {messages.length > 0 && messages.map((msg, idx) => (
                <div key={idx} className="flex gap-2 sm:gap-3">
                  <div className={`flex-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    <div className={`inline-block px-3 py-2 sm:px-4 sm:py-2 rounded-lg ${
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
        <div className="bg-white border-t border-gray-200 p-3 sm:p-4 md:p-6 flex-shrink-0">
          <div className="max-w-3xl md:max-w-4xl mx-auto">
            <div className="flex flex-col gap-2">
              {/* Preview de imagen */}
              {imagePreview && (
                <div className="relative inline-block max-w-full">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="max-h-40 sm:max-h-48 rounded-lg w-auto max-w-full"
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
              <div className="flex items-center gap-2 sm:gap-3 bg-gray-50 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 focus-within:border-[#068959] transition-colors">
                <label htmlFor="image-upload" className="cursor-pointer">
                  <svg className="w-6 h-6 text-gray-400 hover:text-[#068959]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </label>
                <input
                  type="file"
                  id="image-upload"
                  accept="image/jpeg,image/jpg,image/png"
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
                  className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400 text-sm sm:text-base"
                  disabled={isLoading}
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={isLoading || (!input.trim() && !selectedImage)}
                  className="w-9 h-9 sm:w-10 sm:h-10 bg-[#068959] rounded-full flex items-center justify-center hover:bg-[#057a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

