import { NextRequest, NextResponse } from 'next/server'

const SERVICE_URLS = {
  chatbot: process.env.SERVICIO_CHATBOT_URL || 'http://localhost:5001',
  educacion: process.env.SERVICIO_EDUCACION_URL || 'http://localhost:5002',
  simulacion: process.env.SERVICIO_SIMULACION_URL || 'http://localhost:5003',
  radiografias: process.env.SERVICIO_RADIOGRAFIAS_URL || 'http://localhost:5004'
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'GET')
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'POST')
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'PUT')
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'DELETE')
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'PATCH')
}

export async function OPTIONS(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  // Manejar preflight CORS
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  })
}

async function handleRequest(
  request: NextRequest,
  params: { path: string[] },
  method: string
) {
  try {
    const resolvedParams = await params
    const [service, ...path] = resolvedParams.path
    
    if (!service || !SERVICE_URLS[service as keyof typeof SERVICE_URLS]) {
      return NextResponse.json(
        { error: 'Servicio no encontrado' }, 
        { status: 404 }
      )
    }

    const serviceUrl = SERVICE_URLS[service as keyof typeof SERVICE_URLS]
    const url = new URL(request.url)
    const targetPath = path.join('/')
    const targetUrl = `${serviceUrl}/api/${targetPath}${url.search}`
    
    console.log(`Proxying ${method} request to: ${targetUrl}`)
    
    // Preparar headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    
    // Copiar headers relevantes del request original
    const requestContentType = request.headers.get('content-type')
    if (requestContentType) {
      headers['Content-Type'] = requestContentType
    }
    
    const authorization = request.headers.get('authorization')
    if (authorization) {
      headers['Authorization'] = authorization
    }

    // Preparar body para requests que lo requieren
    let body: BodyInit | undefined
    if (method === 'POST' || method === 'PUT' || method === 'PATCH') {
      try {
        body = await request.text()
      } catch (error) {
        console.error('Error reading request body:', error)
      }
    }

    // Realizar la llamada al servicio
    const response = await fetch(targetUrl, {
      method,
      headers,
      body,
      // Timeout de 30 segundos
      signal: AbortSignal.timeout(30000)
    })

    // Agregar headers CORS a la respuesta
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }

    // Verificar si es una respuesta de streaming (text/event-stream o text/plain con stream)
    const contentType = response.headers.get('content-type') || ''
    const isStreaming = contentType.includes('text/event-stream') || 
                        contentType.includes('text/plain') ||
                        response.headers.get('transfer-encoding') === 'chunked'

    // Si es streaming, retornar el stream directamente
    if (isStreaming && response.body) {
      return new NextResponse(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          'Content-Type': contentType || 'text/plain',
          'Transfer-Encoding': 'chunked',
          ...corsHeaders
        }
      })
    }

    // Si la respuesta es JSON, parsearla y retornarla
    if (contentType.includes('application/json')) {
      const data = await response.json()
      return NextResponse.json(data, { 
        status: response.status,
        statusText: response.statusText,
        headers: corsHeaders
      })
    }

    // Para respuestas que no son JSON (como archivos, etc.)
    const responseBody = await response.text()
    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': contentType || 'text/plain',
        ...corsHeaders
      }
    })

  } catch (error) {
    console.error('Error en proxy:', error)
    
    if (error instanceof Error && error.name === 'TimeoutError') {
      return NextResponse.json(
        { error: 'Timeout: El servicio no respondió a tiempo' }, 
        { status: 504 }
      )
    }
    
    return NextResponse.json(
      { error: 'Error interno del proxy' }, 
      { status: 500 }
    )
  }
}
