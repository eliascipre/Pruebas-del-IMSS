"use client"

/**
 * Componente helper para proteger todas las rutas automáticamente
 * Úsalo envolviendo el contenido de cada página protegida
 */

import ProtectedRoute from "./protected-route"

interface ProtectAllRoutesProps {
  children: React.ReactNode
}

export default function ProtectAllRoutes({ children }: ProtectAllRoutesProps) {
  return <ProtectedRoute>{children}</ProtectedRoute>
}

