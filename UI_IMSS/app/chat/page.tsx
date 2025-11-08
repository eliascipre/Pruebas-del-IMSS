"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Spinner } from "@/components/ui/spinner"
import { ThemeToggle } from "@/components/theme-toggle"
import ProtectedRoute from "@/components/auth/protected-route"

interface Message {
  role: 'user' | 'assistant'
  text: string
}

interface ConversationItem {
  id: string
  title: string
  updated_at: number
}

function ChatPageContent() {
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
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
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

  const getAuthHeaders = useMemo(() => {
    return () => {
      const token = localStorage.getItem('auth_token')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
      return headers
    }
  }, [])

  useEffect(() => {
    // Obtener información del usuario (la autenticación ya se verifica en ProtectedRoute)
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setUserId(user.id || '')
      } catch (e) {
        console.error('Error parsing user:', e)
      }
    }
  }, [])

  const fetchConversations = async () => {
    if (!userId) return
    setLoadingConvs(true)
    try {
      const url = new URL(`${getBackendUrl()}/api/conversations`)
      url.searchParams.set('user_id', userId)
      const res = await fetch(url.toString(), {
        headers: getAuthHeaders()
      })
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

  // Filtrar conversaciones basándose en el término de búsqueda
  const filteredConversations = useMemo(() => {
    if (!searchTerm.trim()) return conversations
    const term = searchTerm.toLowerCase()
    return conversations.filter(c => 
      (c.title || '').toLowerCase().includes(term)
    )
  }, [conversations, searchTerm])

  // Normalizar contenido markdown para asegurar que las tablas se rendericen correctamente
  // Esta función es más simple y robusta, similar a cómo funciona en siem-tracker-ia
  const normalizeMarkdown = (content: string): string => {
    if (!content) return content
    
    // Normalizar saltos de línea
    let normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    
    // Detectar tablas markdown y asegurar formato correcto
    // Las tablas markdown requieren pipes al inicio y final de cada línea
    const lines = normalized.split('\n')
    const normalizedLines: string[] = []
    let inTable = false
    let pendingSeparator = false
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i]
      const trimmed = line.trim()
      
      // Detectar si contiene pipes (posible línea de tabla)
      const hasPipes = trimmed.includes('|')
      
      // Detectar línea separadora (| --- | --- | o similar)
      const isSeparator = /^\|[\s\-:]+\|/.test(trimmed) || 
                         /^[\s\-:]+\|/.test(trimmed) || 
                         /^\|[\s\-:]+$/.test(trimmed) ||
                         /^[\s\-:]+$/.test(trimmed)
      
      if (hasPipes && !isSeparator) {
        // Es una línea de tabla - normalizar formato
        if (!inTable) {
          inTable = true
        }
        
        // Asegurar que empieza y termina con pipe
        let normalizedLine = trimmed
        // Remover pipes duplicados al inicio
        normalizedLine = normalizedLine.replace(/^\|+/, '|')
        // Remover pipes duplicados al final
        normalizedLine = normalizedLine.replace(/\|+$/, '|')
        
        // Si no empieza con pipe, agregarlo
        if (!normalizedLine.startsWith('|')) {
          normalizedLine = '| ' + normalizedLine
        }
        // Si no termina con pipe, agregarlo
        if (!normalizedLine.endsWith('|')) {
          normalizedLine = normalizedLine + ' |'
        }
        
        normalizedLines.push(normalizedLine)
        pendingSeparator = false
      } else if (isSeparator && inTable) {
        // Es la línea separadora - mantenerla
        normalizedLines.push(trimmed)
        pendingSeparator = false
      } else if (trimmed.length === 0) {
        // Línea vacía
        if (inTable && !pendingSeparator) {
          // Si estamos en una tabla y no hay separador pendiente, mantener la línea vacía
          normalizedLines.push('')
        } else {
          normalizedLines.push('')
        }
      } else {
        // Línea con contenido que no es tabla
        if (inTable) {
          // Cerrar la tabla antes de agregar contenido no relacionado
          inTable = false
          pendingSeparator = false
        }
        normalizedLines.push(line)
      }
    }
    
    return normalizedLines.join('\n')
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

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      })
      
      const chunks: Blob[] = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
        }
      }
      
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' })
        const reader = new FileReader()
        reader.onloadend = async () => {
          const base64String = reader.result as string
          const base64 = base64String.split(',')[1] || base64String
          
          try {
            // Enviar audio al backend para transcripción
            const response = await fetch(`${getBackendUrl()}/api/transcribe`, {
              method: 'POST',
              headers: getAuthHeaders(),
              body: JSON.stringify({
                audio_data: base64,
                audio_format: 'webm',
                language: 'es'
              })
            })
            
            if (response.ok) {
              const data = await response.json()
              if (data.success && data.text) {
                setInput(data.text)
              } else {
                console.error('Error en transcripción:', data.error)
                alert('Error al transcribir el audio. Por favor intenta de nuevo.')
              }
            } else {
              throw new Error('Error al transcribir audio')
            }
          } catch (error) {
            console.error('Error enviando audio:', error)
            alert('Error al transcribir el audio. Por favor intenta de nuevo.')
          }
        }
        reader.readAsDataURL(blob)
        
        // Detener el stream
        stream.getTracks().forEach(track => track.stop())
      }
      
      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
    } catch (error) {
      console.error('Error iniciando grabación:', error)
      alert('No se pudo acceder al micrófono. Por favor verifica los permisos.')
    }
  }

  const handleStopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop()
      setIsRecording(false)
      setMediaRecorder(null)
    }
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
            headers: getAuthHeaders(),
            body: JSON.stringify({ user_id: userId, title: 'Nueva conversación' })
          })
          const data = await res.json()
          currentSession = data.session_id
          setSessionId(currentSession)
          fetchConversations()
        } catch (e) { console.error(e) }
      }

      // Agregar mensaje de "Quetzalia está pensando"
      setMessages((prev) => [...prev, { role: "assistant", text: "" }])

      // Llamar al backend (la autenticación ya se verifica en ProtectedRoute)
      const response = await fetch(`${getBackendUrl()}/api/chat`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          message: userMessage,
          image: imageToSend, // Imagen en base64
          image_format: 'jpeg',
          session_id: currentSession || undefined,
          user_id: userId || undefined,
          stream: false, // Sin streaming - recibir respuesta completa
        }),
      })

      if (!response.ok) {
        // Intentar obtener el mensaje de error del backend
        let errorMessage = 'Error al enviar mensaje'
        try {
          const errorData = await response.json()
          errorMessage = errorData.detail || errorData.error || errorMessage
        } catch (e) {
          // Si no se puede parsear el error, usar el mensaje por defecto
          errorMessage = `Error ${response.status}: ${response.statusText}`
        }
        throw new Error(errorMessage)
      }

      // Recibir respuesta completa sin streaming
      const data = await response.json()
      const assistantMessage = data.response || data.analysis || ''
      
      // Validar que la respuesta tenga contenido
      if (!assistantMessage || assistantMessage.trim() === '') {
        throw new Error('El servidor no devolvió una respuesta válida')
      }

      // Actualizar el mensaje del asistente con la respuesta completa
      setMessages((prev) => {
        const newMessages = [...prev]
        newMessages[newMessages.length - 1] = {
          role: "assistant",
          text: assistantMessage,
        }
        return newMessages
      })

      // Recargar conversaciones después de enviar mensaje
      fetchConversations()
    } catch (error) {
      console.error('Error:', error)
      
      // Obtener mensaje de error más descriptivo
      let errorMessage = 'Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.'
      if (error instanceof Error) {
        const errorText = error.message
        // Si el error contiene información útil, mostrarla
        if (errorText && errorText.length > 0 && errorText !== 'Error al enviar mensaje') {
          errorMessage = `Error: ${errorText}`
        }
      }
      
      // Actualizar el mensaje vacío del asistente con el error
      setMessages((prev) => {
        const newMessages = [...prev]
        if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'assistant' && !newMessages[newMessages.length - 1].text) {
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            text: errorMessage
          }
        } else {
          newMessages.push({
            role: 'assistant',
            text: errorMessage
          })
        }
        return newMessages
      })
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
        headers: getAuthHeaders(),
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
      await fetch(url.toString(), { 
        method: 'DELETE',
        headers: getAuthHeaders()
      })
      setMessages([])
      setSessionId("")
      fetchConversations()
    } catch (e) { console.error(e) }
  }

  const handleDeleteConversation = async (conversationId: string) => {
    if (!userId) return
    if (!confirm('¿Estás seguro de que quieres borrar esta conversación?')) return
    try {
      await fetch(`${getBackendUrl()}/api/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({ user_id: userId })
      })
      // Si la conversación borrada es la actual, limpiar el chat
      if (sessionId === conversationId) {
        setMessages([])
        setSessionId("")
      }
      fetchConversations()
    } catch (e) { 
      console.error(e)
      alert('Error al borrar la conversación')
    }
  }

  return (
    <div className="h-screen flex bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Left Sidebar (desktop) */}
      <div className={`hidden md:flex bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-col transition-all duration-300 ease-in-out ${
        sidebarCollapsed ? 'w-16' : 'w-80'
      }`}>
        {/* Header */}
        <div className={`p-6 border-b border-gray-200 dark:border-gray-800 ${sidebarCollapsed ? 'p-3' : ''}`}>
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} mb-4`}>
            {!sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                aria-label="Ocultar menú"
                className="text-gray-500 dark:text-gray-400 hover:text-[#068959] dark:hover:text-[#0dab70] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            {sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                aria-label="Mostrar menú"
                className="text-gray-500 dark:text-gray-400 hover:text-[#068959] dark:hover:text-[#0dab70] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
          </div>
          <div className={`flex flex-col items-center gap-3 mb-4 transition-opacity duration-300 ${
            sidebarCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}>
            <Image
              src="/IMSS.png"
              alt="IMSS"
              width={90}
              height={60}
              className="h-12 w-auto"
            />
            <Image
              src="/quetzalia.png"
              alt="quetzalIA.mx"
              width={200}
              height={60}
              className="h-12 w-auto"
            />
          </div>
          <div className={`transition-opacity duration-300 ${sidebarCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <Button onClick={handleNewChat} className="w-full bg-[#068959] hover:bg-[#057a4a] text-white">+ Nuevo chat</Button>
            <div className="mt-3">
              <Button 
                variant="ghost" 
                className="w-full justify-start"
                onClick={() => setIsSearchOpen(!isSearchOpen)}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Buscar
              </Button>
              {isSearchOpen && (
                <div className="mt-2">
                  <Input
                    type="text"
                    placeholder="Buscar conversaciones..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                    autoFocus
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Your conversations */}
        <div className={`flex-1 overflow-y-auto p-6 transition-opacity duration-300 ${sidebarCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Tus conversaciones</h3>
            <button onClick={handleDeleteAll} className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">Borrar todo</button>
          </div>
          
          {/* Conversation list */}
          <div className="space-y-2">
            {loadingConvs && <p className="text-sm text-gray-500 text-center py-8">Cargando...</p>}
            {!loadingConvs && conversations.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">No hay conversaciones aún</p>
            )}
            {!loadingConvs && searchTerm && filteredConversations.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">No se encontraron conversaciones</p>
            )}
            {filteredConversations.map((c) => (
              <div key={c.id} className={`w-full px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${sessionId===c.id?'bg-gray-100 dark:bg-gray-800':''}`}>
                <div className="flex items-center gap-2">
                  <button onClick={async () => {
                    setSessionId(c.id)
                    // Limpiar mensajes actuales antes de cargar
                    setMessages([])
                    // Cargar mensajes de la conversación
                    try {
                      const res = await fetch(`${getBackendUrl()}/api/history?session_id=${c.id}&user_id=${userId}`, {
                        headers: getAuthHeaders()
                      })
                      if (res.ok) {
                        const data = await res.json()
                        // Filtrar mensajes vacíos y duplicados
                        const historyMessages: Message[] = (data.messages || [])
                          .filter((m: any) => m.content && m.content.trim()) // Filtrar mensajes vacíos
                          .map((m: any) => ({
                            role: m.role === 'assistant' ? 'assistant' : 'user',
                            text: m.content || ''
                          }))
                        // Eliminar duplicados consecutivos (mismo rol y mismo contenido)
                        const uniqueMessages: Message[] = []
                        for (let i = 0; i < historyMessages.length; i++) {
                          const current = historyMessages[i]
                          const previous = uniqueMessages[uniqueMessages.length - 1]
                          // Solo agregar si es diferente al anterior (rol o contenido)
                          if (!previous || previous.role !== current.role || previous.text !== current.text) {
                            uniqueMessages.push(current)
                          }
                        }
                        setMessages(uniqueMessages)
                      }
                    } catch (e) {
                      console.error('Error cargando conversación:', e)
                    }
                  }} className="flex-1 text-left">
                    <div className="text-sm text-gray-900 dark:text-gray-100">{c.title || 'Conversación'}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{new Date((c.updated_at||0)*1000).toLocaleString()}</div>
                  </button>
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      aria-label="Renombrar"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-2 py-1"
                      onClick={async (e) => {
                        e.stopPropagation()
                        const title = prompt('Nuevo título', c.title || 'Conversación')
                        if (!title || !title.trim()) return
                        try {
                          await fetch(`${getBackendUrl()}/api/conversations/${c.id}`, {
                            method: 'PATCH',
                            headers: getAuthHeaders(),
                            body: JSON.stringify({ user_id: userId, title: title.trim() })
                          })
                          fetchConversations()
                        } catch (e) { console.error(e) }
                      }}
                    >Renombrar</button>
                    <button
                      aria-label="Borrar"
                      className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-2 py-1"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteConversation(c.id)
                      }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className={`p-6 border-t border-gray-200 dark:border-gray-800 transition-opacity duration-300 ${sidebarCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-semibold">IM</span>
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">IMSS</div>
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
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 py-3 sm:py-4 flex-shrink-0">
          {/* Mobile: hamburger + logo */}
          <div className="flex md:hidden items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/home" className="text-gray-700 hover:text-[#068959] transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </Link>
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
                  <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex flex-col items-center gap-3 mb-4">
                      <Image src="/IMSS.png" alt="IMSS" width={90} height={60} className="h-12 w-auto" />
                      <Image src="/quetzalia.png" alt="quetzalIA.mx" width={200} height={60} className="h-12 w-auto" />
                    </div>
                    <Button onClick={() => {
                      handleNewChat()
                      setSidebarOpen(false)
                    }} className="w-full bg-[#068959] hover:bg-[#057a4a] text-white">+ Nuevo chat</Button>
                    <div className="mt-3">
                      <Button 
                        variant="ghost" 
                        className="w-full justify-start"
                        onClick={() => setIsSearchOpen(!isSearchOpen)}
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Buscar
                      </Button>
                      {isSearchOpen && (
                        <div className="mt-2">
                          <Input
                            type="text"
                            placeholder="Buscar conversaciones..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full"
                            autoFocus
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Tus conversaciones</h3>
                      <button onClick={handleDeleteAll} className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">Borrar todo</button>
                    </div>
                    <div className="space-y-2">
                      {loadingConvs && <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">Cargando...</p>}
                      {!loadingConvs && conversations.length === 0 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No hay conversaciones aún</p>
                      )}
                      {!loadingConvs && searchTerm && filteredConversations.length === 0 && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">No se encontraron conversaciones</p>
                      )}
                      {filteredConversations.map((c) => (
                        <div key={c.id} className={`w-full px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 ${sessionId===c.id?'bg-gray-100 dark:bg-gray-800':''}`}>
                          <div className="flex items-center gap-2">
                            <button onClick={async () => {
                              setSessionId(c.id)
                              setSidebarOpen(false)
                              setMessages([])
                              try {
                                const res = await fetch(`${getBackendUrl()}/api/history?session_id=${c.id}&user_id=${userId}`, {
                                  headers: getAuthHeaders()
                                })
                                if (res.ok) {
                                  const data = await res.json()
                                  const historyMessages: Message[] = (data.messages || [])
                                    .filter((m: any) => m.content && m.content.trim())
                                    .map((m: any) => ({
                                      role: m.role === 'assistant' ? 'assistant' : 'user',
                                      text: m.content || ''
                                    }))
                                  const uniqueMessages: Message[] = []
                                  for (let i = 0; i < historyMessages.length; i++) {
                                    const current = historyMessages[i]
                                    const previous = uniqueMessages[uniqueMessages.length - 1]
                                    if (!previous || previous.role !== current.role || previous.text !== current.text) {
                                      uniqueMessages.push(current)
                                    }
                                  }
                                  setMessages(uniqueMessages)
                                }
                              } catch (e) {
                                console.error('Error cargando conversación:', e)
                              }
                            }} className="flex-1 text-left">
                              <div className="text-sm text-gray-900 dark:text-gray-100">{c.title || 'Conversación'}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{new Date((c.updated_at||0)*1000).toLocaleString()}</div>
                            </button>
                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                aria-label="Renombrar"
                                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 px-2 py-1"
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  const title = prompt('Nuevo título', c.title || 'Conversación')
                                  if (!title || !title.trim()) return
                                  try {
                                    await fetch(`${getBackendUrl()}/api/conversations/${c.id}`, {
                                      method: 'PATCH',
                                      headers: getAuthHeaders(),
                                      body: JSON.stringify({ user_id: userId, title: title.trim() })
                                    })
                                    fetchConversations()
                                  } catch (e) { console.error(e) }
                                }}
                              >Renombrar</button>
                              <button
                                aria-label="Borrar"
                                className="text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-2 py-1"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteConversation(c.id)
                                }}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-6 border-t border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer">
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-semibold">IM</span>
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">IMSS</div>
                      </div>
                      <svg className="w-4 h-4 text-[#068959]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            </div>
            <div className="flex items-center gap-2">
              <Image src="/IMSS.png" alt="IMSS" width={60} height={40} className="h-7 w-auto" />
            </div>
          </div>
          {/* Desktop links */}
          <div className="hidden md:flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                aria-label={sidebarCollapsed ? "Mostrar menú" : "Ocultar menú"}
                className="text-gray-700 dark:text-gray-300 hover:text-[#068959] dark:hover:text-[#0dab70] transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <Link href="/home" className="text-gray-700 dark:text-gray-300 hover:text-[#068959] dark:hover:text-[#0dab70] transition-colors flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="font-medium">Inicio</span>
            </Link>
            </div>
            <div className="flex items-center gap-6 lg:gap-8">
              <Link href="/home" className="text-gray-700 dark:text-gray-300 hover:text-[#068959] dark:hover:text-[#0dab70] font-medium">
                Agentes IA
              </Link>
              <Link href="/login" className="text-gray-700 dark:text-gray-300 hover:text-[#068959] dark:hover:text-[#0dab70] font-medium">
                Registro
              </Link>
              <Link href="/integraciones" className="text-gray-700 dark:text-gray-300 hover:text-[#068959] dark:hover:text-[#0dab70] font-medium">
                Nosotros
              </Link>
              <Link href="/metrics" className="text-gray-700 dark:text-gray-300 hover:text-[#068959] dark:hover:text-[#0dab70] font-medium">
                Métricas
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Chat Messages Area - Fixed Scroll */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-8 min-h-0">
          {messages.length === 0 ? (
            <>
              <div className="flex flex-col items-center justify-center h-full">
                <div className="text-center">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">¿Cómo puedo ayudarte hoy?</h2>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">Inicia una conversación con nuestro asistente de IA</p>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full max-w-3xl md:max-w-4xl mx-auto space-y-3 sm:space-y-4 overflow-x-hidden pb-4">
              {messages.length > 0 && messages.map((msg, idx) => (
                <div key={idx} className="flex gap-2 sm:gap-3">
                  <div className={`flex-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    <div className={`inline-block px-3 py-2 sm:px-4 sm:py-2 rounded-lg ${
                      msg.role === 'user' ? 'bg-[#068959] text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    }`}>
                      {msg.role === 'assistant' ? (
                        <div className="max-w-full leading-relaxed markdown-content overflow-x-hidden">
                          {/* Mostrar animación "Quetzalia está pensando" si el mensaje está vacío y está cargando */}
                          {!msg.text && isLoading ? (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Spinner className="w-4 h-4" />
                              <span className="text-sm italic">Quetzalia está pensando...</span>
                            </div>
                          ) : msg.text.includes('<table') || msg.text.includes('<div class="overflow-x-auto') || msg.text.includes('<thead') ? (
                            <div 
                              dangerouslySetInnerHTML={{ __html: msg.text }}
                              className="max-w-full overflow-x-auto"
                            />
                          ) : (
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[]}
                              skipHtml={false}
                              components={{
                                // Estilos para párrafos
                                p: ({ children }: { children?: React.ReactNode }) => (
                                  <p className="mb-2 last:mb-0 break-words text-gray-900 dark:text-gray-100">{children}</p>
                                ),
                                // Estilos para encabezados
                                h1: ({ children }: { children?: React.ReactNode }) => (
                                  <h1 className="text-2xl font-bold mb-3 mt-4 first:mt-0 text-gray-900 dark:text-gray-100">{children}</h1>
                                ),
                                h2: ({ children }: { children?: React.ReactNode }) => (
                                  <h2 className="text-xl font-bold mb-2 mt-3 first:mt-0 text-gray-900 dark:text-gray-100">{children}</h2>
                                ),
                                h3: ({ children }: { children?: React.ReactNode }) => (
                                  <h3 className="text-lg font-bold mb-2 mt-2 first:mt-0 text-gray-900 dark:text-gray-100">{children}</h3>
                                ),
                                h4: ({ children }: { children?: React.ReactNode }) => (
                                  <h4 className="text-base font-bold mb-2 mt-2 first:mt-0 text-gray-900 dark:text-gray-100">{children}</h4>
                                ),
                                // Estilos para listas
                                ul: ({ children }: { children?: React.ReactNode }) => (
                                  <ul className="list-disc list-inside mb-2 space-y-1 ml-4 text-gray-900 dark:text-gray-100">{children}</ul>
                                ),
                                ol: ({ children }: { children?: React.ReactNode }) => (
                                  <ol className="list-decimal list-inside mb-2 space-y-1 ml-4 text-gray-900 dark:text-gray-100">{children}</ol>
                                ),
                                li: ({ children }: { children?: React.ReactNode }) => (
                                  <li className="break-words">{children}</li>
                                ),
                                // Estilos para código
                                code: ({ node, className, children, ...props }: any) => {
                                  const match = /language-(\w+)/.exec(className || "")
                                  const isInline = !match || (node as any)?.properties?.className?.includes('inline')
                                  return !isInline && match ? (
                                    <pre className="bg-gray-800 dark:bg-gray-900 p-3 rounded-lg overflow-x-auto mb-2 border border-gray-300 dark:border-gray-700">
                                      <code className={`${className} text-gray-100`} {...props}>
                                        {children}
                                      </code>
                                    </pre>
                                  ) : (
                                    <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-sm font-mono border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200" {...props}>
                                      {children}
                                    </code>
                                  )
                                },
                                pre: ({ children }: { children?: React.ReactNode }) => (
                                  <pre className="bg-gray-800 dark:bg-gray-900 p-3 rounded-lg overflow-x-auto mb-2 border border-gray-300 dark:border-gray-700 text-gray-100">
                                    {children}
                                  </pre>
                                ),
                                // Estilos para bloques de cita
                                blockquote: ({ children }: { children?: React.ReactNode }) => (
                                  <blockquote className="border-l-4 border-gray-400 dark:border-gray-500 pl-4 italic my-2 text-gray-700 dark:text-gray-300">
                                    {children}
                                  </blockquote>
                                ),
                                // Estilos para texto en negrita
                                strong: ({ children }: { children?: React.ReactNode }) => (
                                  <strong className="font-bold text-gray-900 dark:text-gray-100">{children}</strong>
                                ),
                                // Estilos para texto en cursiva
                                em: ({ children }: { children?: React.ReactNode }) => (
                                  <em className="italic">{children}</em>
                                ),
                                // Estilos para enlaces
                                a: ({ href, children }: { href?: string; children?: React.ReactNode }) => (
                                  <a href={href} className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer">
                                    {children}
                                  </a>
                                ),
                                // Estilos para tablas
                                table: ({ children, ...props }: any) => (
                                  <div className="overflow-x-auto my-4 w-full max-w-full">
                                    <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 table-auto max-w-full" {...props}>
                                      {children}
                                    </table>
                                  </div>
                                ),
                                thead: ({ children, ...props }: any) => (
                                  <thead className="bg-gray-100 dark:bg-gray-700" {...props}>
                                    {children}
                                  </thead>
                                ),
                                tbody: ({ children, ...props }: any) => (
                                  <tbody className="bg-white dark:bg-gray-800" {...props}>
                                    {children}
                                  </tbody>
                                ),
                                tr: ({ children, ...props }: any) => (
                                  <tr className="border-b border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" {...props}>
                                    {children}
                                  </tr>
                                ),
                                th: ({ children, ...props }: any) => (
                                  <th className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-left font-semibold text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-700" {...props}>
                                    {children}
                                  </th>
                                ),
                                td: ({ children, ...props }: any) => (
                                  <td className="border border-gray-300 dark:border-gray-700 px-4 py-3 text-gray-900 dark:text-gray-100" {...props}>
                                    {children}
                                  </td>
                                ),
                                hr: () => (
                                  <hr className="my-4 border-gray-300 dark:border-gray-700" />
                                ),
                              }}
                            >
                              {normalizeMarkdown(msg.text)}
                            </ReactMarkdown>
                          )}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap leading-relaxed break-words">
                          {msg.text}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input Area - Fixed */}
        <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-3 sm:p-4 md:p-6 flex-shrink-0">
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
              <div className="flex items-center gap-2 sm:gap-3 bg-gray-50 dark:bg-gray-800 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 dark:border-gray-700 focus-within:border-[#068959] dark:focus-within:border-[#0dab70] transition-colors">
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
                <button
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                  disabled={isLoading}
                  className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors ${
                    isRecording 
                      ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse' 
                      : 'text-gray-400 hover:text-[#068959]'
                  }`}
                  title={isRecording ? 'Detener grabación' : 'Grabar audio'}
                >
                  {isRecording ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  )}
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Escribe tu mensaje o graba un audio..."
                  className="flex-1 bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm sm:text-base"
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

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <ChatPageContent />
    </ProtectedRoute>
  )
}

