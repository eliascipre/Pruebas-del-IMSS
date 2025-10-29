import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Verificar estado de los servicios
    const services = [
      { name: 'chatbot', url: process.env.SERVICIO_CHATBOT_URL || 'http://localhost:5001' },
      { name: 'educacion', url: process.env.SERVICIO_EDUCACION_URL || 'http://localhost:5002' },
      { name: 'simulacion', url: process.env.SERVICIO_SIMULACION_URL || 'http://localhost:5003' },
      { name: 'radiografias', url: process.env.SERVICIO_RADIOGRAFIAS_URL || 'http://localhost:5004' }
    ]

    const serviceStatus = await Promise.allSettled(
      services.map(async (service) => {
        try {
          const response = await fetch(`${service.url}/api/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000) // 5 segundos timeout
          })
          return {
            name: service.name,
            status: response.ok ? 'healthy' : 'unhealthy',
            statusCode: response.status
          }
        } catch (error) {
          return {
            name: service.name,
            status: 'unreachable',
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      })
    )

    const healthyServices = serviceStatus.filter(
      result => result.status === 'fulfilled' && result.value.status === 'healthy'
    ).length

    const overallStatus = healthyServices === services.length ? 'healthy' : 'degraded'

    return NextResponse.json({
      status: overallStatus,
      gateway: 'healthy',
      timestamp: new Date().toISOString(),
      services: serviceStatus.map(result => 
        result.status === 'fulfilled' ? result.value : { name: 'unknown', status: 'error' }
      ),
      healthyServices,
      totalServices: services.length
    })

  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        gateway: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
