"use client";

import { useEffect, useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { Header } from "@/components/header"
import { Dialog, DialogContent } from "@/components/ui/dialog"

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
  const router = useRouter()

  const [ecosystems, setEcosystems] = useState<Ecosystem[]>([])
  const [images, setImages] = useState<ImageRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [modalError, setModalError] = useState<string | null>(null)

  // ===== Modal que regresa automáticamente a /mapa-panel =====
  const showModalError = (msg: string) => {
    setModalError(msg)

    setTimeout(() => {
      setModalError(null)
      router.push("/mapa-panel") // Redirección al panel de mapas
    }, 2500)
  }

  const fetchData = async () => {
    try {
      const [ecoRes, imgRes] = await Promise.all([
        fetch(API_ECOSYSTEMS),
        fetch(API_IMAGES),
      ])

      if (!ecoRes.ok || !imgRes.ok) {
        throw new Error("Fallo en la conexión con el servidor")
      }

      const ecosystemData: Ecosystem[] = await ecoRes.json()
      const imagesData: ImageRecord[] = await imgRes.json()

      setEcosystems(ecosystemData)
      setImages(imagesData)
    } catch (error) {
      showModalError("Error al obtener los datos del sistema")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const processed = useMemo(() => {
    const recentEco = ecosystems
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3)

    const recentImages = images
      .sort((a, b) => new Date(b.capture_date).getTime() - new Date(a.capture_date).getTime())
      .slice(0, 12)

    const total = images.length
    const avgVeg = total ? images.reduce((s, i) => s + i.vegetation_percentage, 0) / total : 0
    const avgWater = total ? images.reduce((s, i) => s + i.water_percentage, 0) / total : 0

    return {
      recentEco,
      recentImages,
      totalEco: ecosystems.length,
      totalImages: total,
      avgVeg: avgVeg.toFixed(2),
      avgWater: avgWater.toFixed(2),
    }
  }, [ecosystems, images])

  // =======================
  // LOADING GENERAL
  // =======================
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
        <p className="text-primary text-lg">Cargando datos históricos...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">

      {/* =================================== */}
      {/* MODAL DE ERRORES AUTOMÁTICO */}
      {/* =================================== */}
      <Dialog open={!!modalError}>
        <DialogContent className="max-w-sm text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600">{modalError}</p>
          <p className="text-xs text-gray-400 mt-3">Redirigiendo a Mapa Panel...</p>
        </DialogContent>
      </Dialog>

      {/* ================================
          HERO SECTION
      ================================ */}
      <section className="relative pt-32 pb-48">
        <div className="absolute inset-0 z-0">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-80"
            style={{ backgroundImage: "url('/imagenes/Gemini_Generated_Image_sgf3bpsgf3bpsgf3.png')" }}
          />
          <div
            className="absolute inset-0 bg-black/50"
            style={{
              background: "radial-gradient(circle, transparent 30%, rgba(0,0,0,0.8))",
            }}
          />
        </div>

        <div className="relative z-10 text-center container mx-auto px-4">
          <Link href="/" className="text-gray-300 hover:text-white text-sm inline-block mb-4">
            Volver a la Página Principal
          </Link>

          <h1 className="text-5xl font-semibold text-white">Monitoreo Histórico</h1>
          <p className="text-gray-300 mt-4 max-w-xl mx-auto">
            Analiza tendencias, ecosistemas y capturas del sistema.
          </p>
        </div>
      </section>

      {/* ================================
          PANEL PRINCIPAL
      ================================ */}
      <section className="-mt-32 relative z-10 pb-24">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-xl shadow-lg ring-1 ring-gray-900/5 p-8 sm:p-10 space-y-12">

            {/* =================================== */}
            {/* ECOSISTEMAS RECIENTES */}
            {/* =================================== */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold">Ecosistemas Recientes</h3>
                <p className="text-sm text-gray-500">
                  Cuerpos de agua monitorizados recientemente.
                </p>

                <div className="mt-4 border rounded-lg divide-y">
                  {processed.recentEco.length === 0 ? (
                    <p className="text-gray-500 text-center py-6">No hay ecosistemas registrados.</p>
                  ) : (
                    processed.recentEco.map((eco) => (
                      <div key={eco.id} className="p-4 flex justify-between">
                        <div>
                          <p className="text-blue-600 font-medium">{eco.name}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(eco.created_at).toLocaleDateString("es-MX")}
                          </p>
                        </div>
                        <Badge variant="outline">ID: {eco.id}</Badge>
                      </div>
                    ))
                  )}
                </div>

                <Link href="/historico/linea-tiempo">
                  <Button
                    className="w-full mt-4"
                    disabled={processed.totalEco === 0}
                  >
                    Ver todos ({processed.totalEco})
                  </Button>
                </Link>
              </div>

              {/* =================================== */}
              {/* MÉTRICAS */}
              {/* =================================== */}
              <div>
                <h3 className="text-lg font-semibold">Métricas Históricas</h3>
                <p className="text-sm text-gray-500">
                  Basado en {processed.totalImages} capturas.
                </p>

                <div className="space-y-6 mt-4">
                  {/* Vegetación */}
                  <div>
                    <div className="flex justify-between text-sm font-medium mb-1">
                      <span>Cobertura Vegetal</span>
                      <span className="text-green-600">{processed.avgVeg}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="h-2 bg-green-500 rounded-full" style={{ width: `${processed.avgVeg}%` }} />
                    </div>
                  </div>

                  {/* Agua */}
                  <div>
                    <div className="flex justify-between text-sm font-medium mb-1">
                      <span>Área de Agua</span>
                      <span className="text-blue-600">{processed.avgWater}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${processed.avgWater}%` }} />
                    </div>
                  </div>
                </div>

                <Link href="/historico/tendencias">
                  <Button variant="outline" className="w-full mt-6">
                    Revisar Tendencias
                  </Button>
                </Link>
              </div>
            </div>

            {/* =================================== */}
            {/* GALERÍA */}
            {/* =================================== */}
            <div>
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <h3 className="text-lg font-semibold">Registro de Capturas</h3>
                  <p className="text-sm text-gray-500">
                    {processed.totalImages} imágenes disponibles.
                  </p>
                </div>

                <Link href="/historico/galeria">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={processed.totalImages === 0}
                  >
                    Ver Galería Completa
                  </Button>
                </Link>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {processed.totalImages === 0 ? (
                  <div className="col-span-full text-center py-12 text-gray-500">
                    No hay imágenes disponibles.
                  </div>
                ) : (
                  processed.recentImages.map((img) => (
                    <div
                      key={img.id}
                      className="relative rounded-lg overflow-hidden aspect-[4/3] bg-gray-100 group"
                    >
                      <img
                        src={img.image || "/placeholder.svg"}
                        onError={(e) => (e.currentTarget.src = "/placeholder.svg")}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        alt="Imagen del ecosistema"
                      />
                      <div className="absolute bottom-0 left-0 right-0 p-2 text-white text-xs bg-gradient-to-t from-black/60">
                        <div className="flex justify-between">
                          <span>ID Eco: {img.ecosystem}</span>
                          <span>
                            {new Date(img.capture_date).toLocaleDateString("es-MX", {
                              day: "numeric",
                              month: "short",
                              year: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  )
}
