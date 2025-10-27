"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Message {
  role: 'user' | 'assistant'
  text: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")

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
            <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 hover:bg-blue-100 cursor-pointer">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
                <span className="text-sm text-gray-700 flex-1">Proyecto Lorem...</span>
              <button className="p-1 hover:bg-gray-200 rounded">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button className="p-1 hover:bg-gray-200 rounded">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
            
            <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 cursor-pointer">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span className="text-sm text-gray-700 flex-1">Create html game environment...</span>
            </div>
            
            <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 cursor-pointer">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
                <span className="text-sm text-gray-700 flex-1">Proyecto Lorem Ipsum</span>
            </div>
            
            <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 cursor-pointer">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
                <span className="text-sm text-gray-700 flex-1">Aplicación de Préstamos Crypto</span>
            </div>
            
            <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 cursor-pointer">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
                <span className="text-sm text-gray-700 flex-1">Tipos de Gramática de Operadores</span>
            </div>
            
            <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 cursor-pointer">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
                <span className="text-sm text-gray-700 flex-1">Estados Mínimos para DFA Binario</span>
            </div>
            
            <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 cursor-pointer">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
                <span className="text-sm text-gray-700 flex-1">Sistema POS Lorem</span>
            </div>

            <div className="pt-4 border-t border-gray-200 mt-4">
              <div className="text-xs text-gray-500 mb-2">Últimos 7 días</div>
              <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 cursor-pointer">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span className="text-sm text-gray-700 flex-1">Crear entorno de juego html...</span>
              </div>
            </div>
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
      <div className="flex-1 flex flex-col">
        {/* Top Navigation */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
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

        {/* Chat Messages Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="mb-8">
            <div className="w-16 h-16 bg-[#068959] rounded-full flex items-center justify-center">
              <span className="text-white text-2xl font-bold">Q</span>
            </div>
          </div>
          
          {messages.length === 0 ? (
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">¿Cómo puedo ayudarte hoy?</h2>
              <p className="text-gray-500 mb-6">Inicia una conversación con nuestro asistente de IA</p>
              
              {/* Regenerate response button (if needed) */}
              <button className="px-4 py-2 border-2 border-[#068959] text-[#068959] rounded-lg hover:bg-[#068959] hover:text-white transition-colors flex items-center gap-2 mx-auto">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Regenerar respuesta
              </button>
            </div>
          ) : (
            <div className="flex-1 w-full max-w-4xl space-y-4">
              {messages.length > 0 && messages.map((msg, idx) => (
                <div key={idx} className="flex gap-3">
                  <div className={`flex-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                    <div className={`inline-block px-4 py-2 rounded-lg ${
                      msg.role === 'user' ? 'bg-[#068959] text-white' : 'bg-gray-100 text-gray-900'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-4 py-3 border border-gray-200 focus-within:border-[#068959] transition-colors">
              <div className="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center">
                <span className="text-xs">🧠</span>
              </div>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="¿Qué tienes en mente?..."
                className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-400"
              />
              <button className="w-8 h-8 bg-[#068959] rounded-full flex items-center justify-center hover:bg-[#057a4a] transition-colors">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

