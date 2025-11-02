'use client'

import dynamic from 'next/dynamic'

// Cargar el MapComponent dinámicamente con SSR deshabilitado
const MapComponent = dynamic(() => import('./MapComponent'), {
  
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando mapa...</p>
        <p className="text-sm text-gray-500 mt-2">Espera un momento por favor</p>
      </div>
    </div>
  ),
})

export default function MapComponentWrapper() {
  return <MapComponent />
}