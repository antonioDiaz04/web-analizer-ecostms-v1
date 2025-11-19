"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/header"
import { Calendar, TrendingUp, Camera, ArrowLeft, Loader2 } from "lucide-react"
import { useEffect, useState, useMemo } from "react"
import Link from "next/link"

import { useRouter } from 'next/navigation'




interface Ecosystem {
  id: number
  name: string
  location: string | null
  created_at: string
}

interface ImageRecord {
  id: number
  ecosystem: number
  image: string
  capture_date: string
  vegetation_percentage: number
  water_percentage: number
}

const API_ECOSYSTEMS = "https://sistemahidalgodroneva.site/api/monitoring/ecosystems/"
const API_IMAGES = "https://sistemahidalgodroneva.site/api/monitoring/images/"

export default function HistoricoPage() {
  const [ecosystems, setEcosystems] = useState<Ecosystem[]>([])
  const [images, setImages] = useState<ImageRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initAOS = async () => {
      try {
        const AOS = (await import("aos")).default
        AOS.init({
          duration: 800,
          easing: "ease-out-cubic",
          once: true,
          offset: 100,
        })
      } catch (e) {
        console.error("Error loading AOS:", e)
      }
    }

    const handleReload = () => {
      router.refresh()
    }


    const fetchData = async () => {
      setLoading(true)
      setError(null)
      try {
        const [ecosystemsRes, imagesRes] = await Promise.all([fetch(API_ECOSYSTEMS), fetch(API_IMAGES)])

        if (!ecosystemsRes.ok || !imagesRes.ok) {
          throw new Error("Fallo al cargar uno o más recursos de la API.")
        }

        const ecosystemsData: Ecosystem[] = await ecosystemsRes.json()
        const imagesData: ImageRecord[] = await imagesRes.json()

        setEcosystems(ecosystemsData)
        setImages(imagesData)
      } catch (e) {
        setError("Error al obtener los datos. Verifique la conexión con la API.")
        console.error("Error fetching data:", e)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    initAOS()
  }, [])

  const processedData = useMemo(() => {
    // Los 3 ecosistemas más recientes (últimos creados)
    const recentEcosystems = ecosystems
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3)

    // Las 12 imágenes más recientes (últimas tomas)
    const recentImages = images
      .slice()
      .sort((a, b) => new Date(b.capture_date).getTime() - new Date(a.capture_date).getTime())
      .slice(0, 12)

    const totalImages = images.length
    const avgVegetation =
      totalImages > 0 ? images.reduce((sum, img) => sum + img.vegetation_percentage, 0) / totalImages : 0
    const avgWater = totalImages > 0 ? images.reduce((sum, img) => sum + img.water_percentage, 0) / totalImages : 0

    return {
      recentEcosystems,
      recentImages,
      totalEcosystems: ecosystems.length,
      totalImages,
      avgVegetation: avgVegetation.toFixed(2),
      avgWater: avgWater.toFixed(2),
    }
  }, [ecosystems, images])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-xl text-primary font-medium">Cargando datos históricos del sistema...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Header />
        <div className="container mx-auto mt-20 text-center">
          <h2 className="text-3xl font-bold text-red-600 mb-4">Error de Carga de Datos</h2> {/* Eliminado emoji */}
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={handleReload} className="mt-6">
            Recargar Página
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">

      {/* === Hero Section: Se mantiene el diseño premium === */}
      <section className="relative pt-32 pb-48">
        <div className="absolute inset-0 z-0">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-80"
            style={{ backgroundImage: `url('/imagenes/Gemini_Generated_Image_sgf3bpsgf3bpsgf3.png')` }}
          />
          <div className="absolute inset-0 bg-black/50"
            style={{ background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7))' }}
          />
        </div>

        <div className="relative z-10 container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Link
              href="/"
              className="inline-flex items-center text-gray-300 transition-colors hover:text-white mb-6 font-medium text-sm"
            >
              Volver a la Página Principal
            </Link>
            <h1 className="text-5xl md:text-6xl font-semibold text-white tracking-tight">
              Monitoreo Histórico
            </h1>
            <p className="mt-4 text-lg text-gray-300 max-w-2xl mx-auto">
              Explore la evolución de los cuerpos de agua, analice tendencias y visualice el registro completo de capturas.
            </p>
          </div>
        </div>
      </section>

      {/* === Panel de Contenido Principal: Diseño limpio y superpuesto === */}
      <section className="relative z-10 -mt-32 pb-24">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-xl shadow-lg ring-1 ring-gray-900/5 p-8 sm:p-10 space-y-12">

            {/* --- Fila 1: Ecosistemas y Métricas --- */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* CARD 1: Ecosistemas Recientes */}
              <div className="bg-white rounded-lg">
                <div className="pb-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Ecosistemas Recientes</h3>
                  <p className="text-sm text-gray-500 mt-1">Cuerpos de agua recién configurados para análisis.</p>
                </div>
                <div className="mt-4">
                  <ul className="divide-y divide-gray-200">
                    {processedData.recentEcosystems.map((eco) => (
                      <li key={eco.id} className="flex items-center justify-between py-3">
                        <div>
                          <p className="font-medium text-sm text-blue-600">{eco.name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Creado: {new Date(eco.created_at).toLocaleDateString("es-ES")}
                          </p>
                        </div>
                        <Badge variant="outline" className="font-mono text-xs">ID: {eco.id}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
                <Link href="/historico/linea-tiempo" className="mt-4 block">
                  <Button className="w-full bg-gray-800 hover:bg-gray-900 text-white" disabled={processedData.totalEcosystems === 0}>
                    Ver todos los Ecosistemas ({processedData.totalEcosystems})
                  </Button>
                </Link>
              </div>

              {/* CARD 2: Métricas Históricas */}
              <div className="bg-white rounded-lg">
                <div className="pb-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Métricas Históricas</h3>
                  <p className="text-sm text-gray-500 mt-1">Valores promedio de {processedData.totalImages} capturas.</p>
                </div>
                <div className="mt-4 space-y-5">
                  {/* Cobertura Vegetal */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <p className="font-medium text-sm text-gray-700">Cobertura Vegetal</p>
                      <span className="text-sm font-semibold text-green-600">{processedData.avgVegetation}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-2 bg-green-500" style={{ width: `${processedData.avgVegetation}%` }} />
                    </div>
                  </div>
                  {/* Cobertura Agua */}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <p className="font-medium text-sm text-gray-700">Área de Agua</p>
                      <span className="text-sm font-semibold text-blue-600">{processedData.avgWater}%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-2 bg-blue-500" style={{ width: `${processedData.avgWater}%` }} />
                    </div>
                  </div>
                </div>
                <Link href="/historico/tendencias" className="mt-6 block">
                  <Button className="w-full" variant="outline">Revisar Tendencias Detalladas</Button>
                </Link>
              </div>
            </div>

            {/* --- Fila 2: Galería de Imágenes --- */}
            <div className="bg-white rounded-lg">
              <div className="pb-4 border-b border-gray-200">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Registro de Capturas</h3>
                    <p className="text-sm text-gray-500 mt-1">{processedData.totalImages.toLocaleString()} imágenes disponibles para análisis.</p>
                  </div>
                  <Link href="/historico/galeria">
                    <Button variant="outline" size="sm" className="w-full sm:w-auto" disabled={processedData.totalImages === 0}>
                      Ver Galería Completa
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="mt-6">
                {processedData.totalImages === 0 ? (
                  <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500">No hay capturas disponibles en el sistema.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {processedData.recentImages.map((img) => (
                      <div key={img.id} className="relative rounded-lg overflow-hidden group/image aspect-[4/3]">
                        <img
                          src={img.image || "/placeholder.svg"}
                          alt={`Captura del ecosistema ${img.ecosystem}`}
                          className="w-full h-full object-cover transition-all duration-500 ease-in-out group-hover/image:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute inset-0 ring-1 ring-inset ring-black/10 rounded-lg" />
                        <div className="absolute bottom-0 left-0 right-0 p-3 text-white text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">ID Eco: {img.ecosystem}</span>
                            <span className="font-mono text-gray-200">
                              {new Date(img.capture_date).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "2-digit" })}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  )
}