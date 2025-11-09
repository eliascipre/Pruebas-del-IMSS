"use client"

import { useEffect, useMemo, useState, useRef } from "react"
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

function RadiografiasPageContent() {
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
  const [searchTerm, setSearchTerm] = useState("")
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [radiografiaWidth, setRadiografiaWidth] = useState(384) // 96 * 4 = 384px (w-96)
  const [isResizing, setIsResizing] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastEnterTimeRef = useRef<number>(0)

  const getBackendUrl = useMemo(() => {
    return () => {
      if (typeof window !== 'undefined') {
        const protocol = window.location.protocol
        const hostname = window.location.hostname
        return `${protocol}//${hostname}:7860`
      }
      return process.env.NEXT_PUBLIC_NV_REASON_URL || 'http://localhost:7860'
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
      if (res.ok) {
        const data = await res.json()
        const items: ConversationItem[] = (data.conversations || []).map((c: any) => ({ 
          id: c.id, 
          title: c.title, 
          updated_at: c.updated_at 
        }))
        setConversations(items)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingConvs(false)
    }
  }

  useEffect(() => { 
    if (userId) {
      fetchConversations()
      // Cargar última conversación si existe
      const lastSessionId = sessionStorage.getItem('last_session_id')
      if (lastSessionId && !sessionId) {
        setSessionId(lastSessionId)
        // Cargar historial de la última conversación
        const backendUrl = getBackendUrl()
        const headers = getAuthHeaders()
        fetch(`${backendUrl}/api/history?session_id=${lastSessionId}&user_id=${userId}`, {
          headers: headers
        })
          .then(res => res.json())
          .then(data => {
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
          })
          .catch(e => console.error('Error cargando última conversación:', e))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // Manejo del redimensionamiento del panel de radiografía
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      
      const container = document.querySelector('.main-content-container')
      if (!container) return
      
      const containerRect = container.getBoundingClientRect()
      const newWidth = containerRect.right - e.clientX
      
      // Límites: mínimo 300px, máximo 800px
      const minWidth = 300
      const maxWidth = 800
      const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth))
      
      setRadiografiaWidth(clampedWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  const filteredConversations = useMemo(() => {
    if (!searchTerm.trim()) return conversations
    const term = searchTerm.toLowerCase()
    return conversations.filter(c => 
      (c.title || '').toLowerCase().includes(term)
    )
  }, [conversations, searchTerm])

  const normalizeMarkdown = (content: string): string => {
    if (!content) return content
    
    let normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    const lines = normalized.split('\n')
    const normalizedLines: string[] = []
    let inTable = false
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i]
      const trimmed = line.trim()
      const hasPipes = trimmed.includes('|')
      const isSeparator = /^\|[\s\-:]+\|/.test(trimmed) || 
                         /^[\s\-:]+\|/.test(trimmed) || 
                         /^\|[\s\-:]+$/.test(trimmed) ||
                         /^[\s\-:]+$/.test(trimmed)
      
      if (hasPipes && !isSeparator) {
        if (!inTable) {
          inTable = true
        }
        
        let normalizedLine = trimmed
        normalizedLine = normalizedLine.replace(/^\|+/, '|')
        normalizedLine = normalizedLine.replace(/\|+$/, '|')
        
        if (!normalizedLine.startsWith('|')) {
          normalizedLine = '| ' + normalizedLine
        }
        if (!normalizedLine.endsWith('|')) {
          normalizedLine = normalizedLine + ' |'
        }
        
        normalizedLines.push(normalizedLine)
      } else if (isSeparator && inTable) {
        normalizedLines.push(trimmed)
      } else if (trimmed.length === 0) {
        normalizedLines.push('')
      } else {
        if (inTable) {
          inTable = false
        }
        normalizedLines.push(line)
      }
    }
    
    return normalizedLines.join('\n')
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/') || (!file.type.includes('jpeg') && !file.type.includes('png'))) {
      alert('Por favor selecciona una imagen en formato JPG o PNG')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64String = reader.result as string
      const base64 = base64String.split(',')[1] || base64String
      setSelectedImage(base64)
      setImagePreview(base64String)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
  }

  const handleStopGeneration = async () => {
    if (!isLoading || !currentRequestId) return
    
    try {
      const backendUrl = getBackendUrl()
      await fetch(`${backendUrl}/api/analyze/cancel`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          request_id: currentRequestId,
          session_id: sessionId || undefined,
        }),
      })
      
      // Cancelar también el AbortController si existe
      if (abortController) {
        abortController.abort()
        setAbortController(null)
      }
      
      // Limpiar estados
      setCurrentRequestId(null)
      setIsLoading(false)
      
      // Actualizar el mensaje del asistente para indicar que se canceló
      setMessages((prev) => {
        const newMessages = [...prev]
        if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'assistant') {
          const currentText = newMessages[newMessages.length - 1].text
          newMessages[newMessages.length - 1] = {
            role: 'assistant',
            text: currentText ? currentText + '\n\n[Generación cancelada por el usuario]' : '[Generación cancelada por el usuario]'
          }
        }
        return newMessages
      })
    } catch (error) {
      console.error('Error cancelando generación:', error)
    }
  }

  const handleSendMessage = async () => {
    // Validación: Requerir imagen de radiografía de tórax
    if (!selectedImage) {
      alert('Por favor, sube una imagen de radiografía de tórax antes de enviar tu consulta.')
      return
    }
    
    if (isLoading) return

    const userMessage = input.trim() || "Analiza esta radiografía de tórax, describe los hallazgos principales, las anomalías, los dispositivos de soporte y ofrece recomendaciones clínicas. Responde en español."
    setInput("")
    setImagePreview(null)
    const imageToSend = selectedImage
    setSelectedImage(null)
    setIsLoading(true)

    // Crear AbortController para cancelar la petición
    const controller = new AbortController()
    setAbortController(controller)

    setMessages(prev => [...prev, { 
      role: 'user', 
      text: userMessage || '📷 Radiografía enviada' 
    }])

    try {
      const getBackendUrl = () => {
        if (typeof window !== 'undefined') {
          const protocol = window.location.protocol
          const hostname = window.location.hostname
          return `${protocol}//${hostname}:7860`
        }
        return process.env.NEXT_PUBLIC_NV_REASON_URL || 'http://localhost:7860'
      }
      
      let currentSession = sessionId
      if (!currentSession) {
        try {
          const res = await fetch(`${getBackendUrl()}/api/conversations`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ user_id: userId, title: 'Nueva conversación' })
          })
          if (res.ok) {
            const data = await res.json()
            currentSession = data.session_id
            setSessionId(currentSession)
            fetchConversations()
          }
        } catch (e) { console.error(e) }
      }

      setMessages((prev) => [...prev, { role: "assistant", text: "" }])

      // Generar request_id único
      const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      setCurrentRequestId(requestId)

      // Guardar session_id en sessionStorage para cargar al recargar
      if (currentSession) {
        sessionStorage.setItem('last_session_id', currentSession)
      }

      const backendUrl = getBackendUrl()
      const response = await fetch(`${backendUrl}/api/analyze`, {
        method: 'POST',
        headers: getAuthHeaders(),
        signal: controller.signal,
        body: JSON.stringify({
          message: userMessage,
          image: imageToSend,
          image_format: 'jpeg',
          session_id: currentSession || undefined,
          user_id: userId || undefined,
          request_id: requestId, // Enviar request_id para poder cancelar
        }),
      })

      if (!response.ok) {
        let errorMessage = 'Error al enviar mensaje'
        try {
          const errorData = await response.json()
          errorMessage = errorData.detail || errorData.error || errorMessage
        } catch (e) {
          if (response.status === 404) {
            errorMessage = `Error: El servidor de análisis no está disponible (404). Por favor, verifica que el servidor esté ejecutándose en ${backendUrl}`
          } else {
          errorMessage = `Error ${response.status}: ${response.statusText}`
          }
        }
        throw new Error(errorMessage)
      }

      const data = await response.json()
      const assistantMessage = data.response || data.analysis || ''
      
      if (!assistantMessage || assistantMessage.trim() === '') {
        throw new Error('El servidor no devolvió una respuesta válida')
      }

      setMessages((prev) => {
        const newMessages = [...prev]
        newMessages[newMessages.length - 1] = {
          role: "assistant",
          text: assistantMessage,
        }
        return newMessages
      })

      fetchConversations()
    } catch (error: any) {
      // Ignorar errores de abort
      if (error.name === 'AbortError') {
        console.log('Petición cancelada por el usuario')
        return
      }
      
      console.error('Error:', error)
      
      let errorMessage = 'Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.'
      if (error instanceof Error) {
        const errorText = error.message
        if (errorText && errorText.length > 0 && errorText !== 'Error al enviar mensaje') {
          errorMessage = `Error: ${errorText}`
        }
      }
      
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
      setCurrentRequestId(null)
      setAbortController(null)
    }
  }

  // Ajustar altura del textarea automáticamente
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }

  useEffect(() => {
    adjustTextareaHeight()
  }, [input])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      const now = Date.now()
      const timeSinceLastEnter = now - lastEnterTimeRef.current
      
      // Si es un Enter doble (dos Enter seguidos en menos de 500ms)
      // Verificar si el texto termina con un salto de línea o si es el segundo Enter rápido
      if (timeSinceLastEnter < 500 && timeSinceLastEnter > 0) {
        // Si el texto termina con salto de línea, es un Enter doble
        if (input.endsWith('\n')) {
      e.preventDefault()
          // Remover el salto de línea extra antes de enviar
          const textToSend = input.trimEnd()
          if (textToSend || selectedImage) {
            // Solo enviar si hay imagen
            if (selectedImage) {
              lastEnterTimeRef.current = 0
              // Usar setTimeout para permitir que el textarea procese el cambio
              setTimeout(() => {
      handleSendMessage()
              }, 0)
            } else {
              alert('Por favor, sube una imagen de radiografía de tórax antes de enviar tu consulta.')
              lastEnterTimeRef.current = 0
            }
          } else {
            lastEnterTimeRef.current = 0
          }
        } else {
          // Primer Enter, permitir que se inserte el salto de línea
          lastEnterTimeRef.current = now
        }
      } else {
        // Enter simple = salto de línea (comportamiento normal del textarea)
        lastEnterTimeRef.current = now
      }
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    adjustTextareaHeight()
  }

  const handleNewChat = async () => {
    if (!userId) return
    try {
      const res = await fetch(`${getBackendUrl()}/api/conversations`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ user_id: userId, title: 'Nueva conversación' })
      })
      if (res.ok) {
        const data = await res.json()
        setSessionId(data.session_id)
        setMessages([])
        fetchConversations()
      }
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
            sidebarCollapsed ? 'opacity-0' : 'opacity-100'
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

        <div className={`flex-1 overflow-y-auto p-6 transition-opacity duration-300 ${sidebarCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Tus conversaciones</h3>
            <button onClick={handleDeleteAll} className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">Borrar todo</button>
          </div>
          
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
                    sessionStorage.setItem('last_session_id', c.id)
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
                        <h3 className="text-sm font-semibold text-gray-900">Tus conversaciones</h3>
                        <button onClick={handleDeleteAll} className="text-xs text-blue-600 hover:text-blue-700">Borrar todo</button>
                      </div>
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
                                sessionStorage.setItem('last_session_id', c.id)
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
                                    setMessages(historyMessages)
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
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Image src="/IMSS.png" alt="IMSS" width={400} height={100} className="h-14 md:h-20 lg:h-24 w-auto" />
            </div>
          </div>
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

        {/* Main Content - Two Columns */}
        <div className="flex-1 flex overflow-hidden main-content-container">
          {/* Left Column - Chat Messages */}
          <div className="flex-1 flex flex-col overflow-hidden" style={{ minWidth: 0 }}>
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 md:p-8 min-h-0">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">NV-Reason-CXR-3B - Analizador de radiografías de tórax</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">Sube una radiografía y realiza tu consulta</p>
                  </div>
                </div>
              ) : (
                <div className="w-full max-w-3xl md:max-w-4xl mx-auto space-y-3 sm:space-y-4 overflow-x-hidden pb-4">
                  {messages.map((msg, idx) => (
                    <div key={idx} className="flex gap-2 sm:gap-3">
                      <div className={`flex-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                        <div className={`inline-block px-3 py-2 sm:px-4 sm:py-2 rounded-lg ${
                          msg.role === 'user' ? 'bg-[#068959] text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                        }`}>
                          {msg.role === 'assistant' ? (
                            <div className="max-w-full leading-relaxed markdown-content overflow-x-hidden">
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
                                    p: ({ children }: { children?: React.ReactNode }) => (
                                      <p className="mb-2 last:mb-0 break-words text-gray-900">{children}</p>
                                    ),
                                    h1: ({ children }: { children?: React.ReactNode }) => (
                                      <h1 className="text-2xl font-bold mb-3 mt-4 first:mt-0 text-gray-900">{children}</h1>
                                    ),
                                    h2: ({ children }: { children?: React.ReactNode }) => (
                                      <h2 className="text-xl font-bold mb-2 mt-3 first:mt-0 text-gray-900">{children}</h2>
                                    ),
                                    h3: ({ children }: { children?: React.ReactNode }) => (
                                      <h3 className="text-lg font-bold mb-2 mt-2 first:mt-0 text-gray-900">{children}</h3>
                                    ),
                                    ul: ({ children }: { children?: React.ReactNode }) => (
                                      <ul className="list-disc list-inside mb-2 space-y-1 ml-4 text-gray-900">{children}</ul>
                                    ),
                                    ol: ({ children }: { children?: React.ReactNode }) => (
                                      <ol className="list-decimal list-inside mb-2 space-y-1 ml-4 text-gray-900">{children}</ol>
                                    ),
                                    li: ({ children }: { children?: React.ReactNode }) => (
                                      <li className="break-words">{children}</li>
                                    ),
                                    code: ({ node, className, children, ...props }: any) => {
                                      const match = /language-(\w+)/.exec(className || "")
                                      const isInline = !match || (node as any)?.properties?.className?.includes('inline')
                                      return !isInline && match ? (
                                        <pre className="bg-gray-800 p-3 rounded-lg overflow-x-auto mb-2 border border-gray-300">
                                          <code className={className} {...props}>
                                            {children}
                                          </code>
                                        </pre>
                                      ) : (
                                        <code className="bg-gray-200 px-2 py-1 rounded text-sm font-mono border border-gray-300 text-gray-800" {...props}>
                                          {children}
                                        </code>
                                      )
                                    },
                                    table: ({ children, ...props }: any) => (
                                      <div className="overflow-x-auto my-4 w-full max-w-full">
                                        <table className="min-w-full border-collapse border border-gray-300 bg-white table-auto max-w-full" {...props}>
                                          {children}
                                        </table>
                                      </div>
                                    ),
                                    thead: ({ children, ...props }: any) => (
                                      <thead className="bg-gray-100" {...props}>
                                        {children}
                                      </thead>
                                    ),
                                    tbody: ({ children, ...props }: any) => (
                                      <tbody className="bg-white" {...props}>
                                        {children}
                                      </tbody>
                                    ),
                                    tr: ({ children, ...props }: any) => (
                                      <tr className="border-b border-gray-300 hover:bg-gray-50 transition-colors" {...props}>
                                        {children}
                                      </tr>
                                    ),
                                    th: ({ children, ...props }: any) => (
                                      <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900 bg-gray-100" {...props}>
                                        {children}
                                      </th>
                                    ),
                                    td: ({ children, ...props }: any) => (
                                      <td className="border border-gray-300 px-4 py-3 text-gray-900" {...props}>
                                        {children}
                                      </td>
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

            {/* Input Area */}
            <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-3 sm:p-4 md:p-6 flex-shrink-0">
              <div className="max-w-3xl md:max-w-4xl mx-auto">
                <div className="flex flex-col gap-2">
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
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder={selectedImage ? "Escribe tu consulta sobre la radiografía... (Enter para nueva línea, Enter doble para enviar)" : "Primero sube una radiografía de tórax..."}
                      className="flex-1 bg-transparent outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 text-sm sm:text-base resize-none overflow-y-auto min-h-[2.5rem] max-h-[200px] py-2"
                      disabled={isLoading || !selectedImage}
                      rows={1}
                      style={{ height: 'auto' }}
                    />
                    {isLoading ? (
                      <button 
                        onClick={handleStopGeneration}
                        className="w-9 h-9 sm:w-10 sm:h-10 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                        title="Detener generación"
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6h12v12H6z" />
                        </svg>
                      </button>
                    ) : (
                    <button 
                      onClick={handleSendMessage}
                        disabled={isLoading || !selectedImage}
                      className="w-9 h-9 sm:w-10 sm:h-10 bg-[#068959] rounded-full flex items-center justify-center hover:bg-[#057a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={!selectedImage ? "Primero debes subir una radiografía de tórax" : "Enviar consulta"}
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Resize Handle */}
          {imagePreview && (
            <div
              className="hidden lg:flex w-2 bg-gray-200 dark:bg-gray-700 hover:bg-[#068959] dark:hover:bg-[#0dab70] cursor-col-resize transition-colors relative group"
              onMouseDown={(e) => {
                e.preventDefault()
                setIsResizing(true)
              }}
              style={{ 
                cursor: isResizing ? 'col-resize' : 'col-resize',
                backgroundColor: isResizing ? '#068959' : undefined
              }}
            >
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-1 bg-gray-300 dark:bg-gray-600 group-hover:bg-[#057a4a] dark:group-hover:bg-[#0dab70]" />
            </div>
          )}

          {/* Right Column - X-ray Image */}
          {imagePreview && (
            <div 
              className="hidden lg:flex bg-gray-50 dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex-col p-4 flex-shrink-0"
              style={{ width: `${radiografiaWidth}px` }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Radiografía</h3>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRemoveImage}
                  className="text-xs"
                >
                  Limpiar
                </Button>
              </div>
              <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <img 
                  src={imagePreview} 
                  alt="Radiografía de tórax" 
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            </div>
          )}
          {!imagePreview && (
            <div className="hidden lg:flex w-96 bg-gray-50 dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex-col p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Radiografía</h3>
              </div>
              <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="text-center text-gray-400 dark:text-gray-500 p-8">
                  <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">Sube una radiografía de tórax</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function RadiografiasPage() {
  return (
    <ProtectedRoute>
      <RadiografiasPageContent />
    </ProtectedRoute>
  )
}

