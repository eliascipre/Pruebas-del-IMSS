"use client"

import { useEffect, useState } from "react"

interface MetricRow {
  id: number
  session_id: string | null
  input_chars: number | null
  output_chars: number | null
  input_tokens: number | null
  output_tokens: number | null
  total_tokens: number | null
  started_at: number | null
  ended_at: number | null
  duration_ms: number | null
  model: string | null
  provider: string | null
  stream: number | null
  is_image: number | null
  success: number | null
  error_message: string | null
}

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<MetricRow[]>([])
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState("")

  const getBackendUrl = () => {
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol
      const hostname = window.location.hostname
      return `${protocol}//${hostname}:5001`
    }
    return process.env.NEXT_PUBLIC_CHATBOT_URL || 'http://localhost:5001'
  }

  const fetchMetrics = async () => {
    setLoading(true)
    try {
      const url = new URL(`${getBackendUrl()}/api/metrics`)
      if (sessionId.trim()) url.searchParams.set('session_id', sessionId.trim())
      url.searchParams.set('limit', '200')
      const res = await fetch(url.toString())
      const data = await res.json()
      setMetrics(data.metrics || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Métricas del Chatbot</h1>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Filtrar por session_id"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
            />
            <button onClick={fetchMetrics} className="bg-[#068959] text-white px-3 py-1 rounded text-sm">
              {loading ? 'Cargando...' : 'Refrescar'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-2 text-left">ID</th>
                <th className="px-2 py-2 text-left">Session</th>
                <th className="px-2 py-2 text-left">Modelo</th>
                <th className="px-2 py-2 text-left">Provider</th>
                <th className="px-2 py-2 text-right">Input chars</th>
                <th className="px-2 py-2 text-right">Output chars</th>
                <th className="px-2 py-2 text-right">Prompt tokens</th>
                <th className="px-2 py-2 text-right">Completion tokens</th>
                <th className="px-2 py-2 text-right">Total tokens</th>
                <th className="px-2 py-2 text-right">Duración (ms)</th>
                <th className="px-2 py-2 text-center">Stream</th>
                <th className="px-2 py-2 text-center">Imagen</th>
                <th className="px-2 py-2 text-center">OK</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="px-2 py-2">{m.id}</td>
                  <td className="px-2 py-2 font-mono text-xs">{m.session_id}</td>
                  <td className="px-2 py-2">{m.model}</td>
                  <td className="px-2 py-2">{m.provider}</td>
                  <td className="px-2 py-2 text-right">{m.input_chars ?? '-'}</td>
                  <td className="px-2 py-2 text-right">{m.output_chars ?? '-'}</td>
                  <td className="px-2 py-2 text-right">{m.input_tokens ?? '-'}</td>
                  <td className="px-2 py-2 text-right">{m.output_tokens ?? '-'}</td>
                  <td className="px-2 py-2 text-right">{m.total_tokens ?? '-'}</td>
                  <td className="px-2 py-2 text-right">{m.duration_ms ?? '-'}</td>
                  <td className="px-2 py-2 text-center">{m.stream ? 'Sí' : 'No'}</td>
                  <td className="px-2 py-2 text-center">{m.is_image ? 'Sí' : 'No'}</td>
                  <td className="px-2 py-2 text-center">{m.success ? '✔' : '✖'}</td>
                </tr>
              ))}
              {metrics.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-4 py-8 text-center text-gray-500">Sin datos</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
