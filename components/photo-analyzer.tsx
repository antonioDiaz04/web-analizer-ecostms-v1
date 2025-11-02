'use client'

import type React from "react"
import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import {
  Upload,
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  FileText,
  Sparkles,
  Loader2,
  Trash2,
  Plus,
  Eye,
  Map,
} from "lucide-react"

const REMOTE_BASE_URL = "https://sistemahidalgodroneva.site"

// ------------------------------ //
// INTERFACES
// ------------------------------ //

interface Ecosystem {
  id: number
  name: string
  created_at: string
}

interface ImageResult {
  id: number
  ecosystem?: number
  image: string
  description: string
  metadata: {
    resolution_m_per_px: number
  }
  vegetation_percentage: number
  vegetation_area_m2: number
  water_percentage: number
  water_area_m2: number
  is_adjusted: boolean
  parent_image: number | null
  adjusted_images: number[]
  capture_date?: string
}

interface UploadResponse {
  message: string
  ecosystem_id: number
  ecosystem_name: string
  images: ImageResult[]
}

interface FilterValues {
  brightness: number
  contrast: number
  saturate: number
}

interface PolygonData {
  geoJson: any
  locationName: string
  location: string // WKT format
  drawnItemsCount: number
  ecosystemId?: string
  useExisting?: boolean
  coordinates?: number[][][] // Coordenadas en formato array
}

interface PhotoAnalyzerModalProps {
  isOpen: boolean
  onClose: () => void
  polygonData?: PolygonData
  compact?: boolean
}

type StepType = "upload" | "configure" | "analyze" | "results"

// ------------------------------ //
// COMPONENTE MODAL BASE CORREGIDO
// ------------------------------ //

const Modal: React.FC<{
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: "sm" | "md" | "lg" | "xl" | "full"
}> = ({ isOpen, onClose, title, children, size = "xl" }) => {
  const sizeClass = useMemo(() => {
    switch (size) {
      case "sm":
        return "max-w-md"
      case "md":
        return "max-w-lg"
      case "lg":
        return "max-w-2xl"
      case "xl":
        return "max-w-4xl"
      case "full":
        return "max-w-7xl"
      default:
        return "max-w-4xl"
    }
  }, [size])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
      <div className={`relative w-full ${sizeClass} bg-white rounded-lg shadow-2xl max-h-[90vh] overflow-hidden`}>
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <Button onClick={onClose} variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-slate-100">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">{children}</div>
      </div>
    </div>
  )
}

// ------------------------------ //
// COMPONENTES DE PASOS OPTIMIZADOS
// ------------------------------ //

const UploadStep: React.FC<{
  isDragging: boolean
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  onAreaClick: () => void
  fileInputRef: React.RefObject<HTMLInputElement>
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}> = ({ isDragging, onDragOver, onDragLeave, onDrop, onAreaClick, fileInputRef, onFileChange }) => (
  <Card
    className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 cursor-pointer ${
      isDragging
        ? "border-blue-500 bg-blue-50 scale-[1.02]"
        : "border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50"
    }`}
    onDragOver={onDragOver}
    onDragLeave={onDragLeave}
    onDrop={onDrop}
    onClick={onAreaClick}
  >
    <Input
      type="file"
      ref={fileInputRef}
      onChange={onFileChange}
      className="hidden"
      accept="image/jpeg,image/png,image/webp"
      multiple
    />
    <div className="flex flex-col items-center">
      <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
        <Upload className="w-8 h-8 text-blue-600" />
      </div>
      <h3 className="text-lg font-medium text-slate-900 mb-2">Arrastra tus imágenes aquí</h3>
      <p className="text-sm text-slate-600 mb-4">o haz clic para seleccionar archivos</p>
      <Button className="bg-blue-600 hover:bg-blue-700 text-white">Seleccionar Imágenes</Button>
      <p className="text-xs text-slate-500 mt-4">Formatos: JPG, PNG, WEBP</p>
    </div>
  </Card>
)

const ConfigureStep: React.FC<{
  selectedFiles: File[]
  imagePreviewUrls: string[]
  getImageFilterStyle: () => React.CSSProperties
  onRemoveFile: (index: number) => void
  descriptions: string[]
  captureDates: string[]
  onDescriptionChange: (index: number, desc: string) => void
  onDateChange: (index: number, date: string) => void
  ecosystemName: string
  setEcosystemName: (name: string) => void
  ecosystemId: string | null
  setEcosystemId: (id: string | null) => void
  onAddMore: () => void
  fileInputRef: React.RefObject<HTMLInputElement>
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  ecosystems: Ecosystem[]
  polygonData?: PolygonData
}> = ({
  selectedFiles,
  imagePreviewUrls,
  getImageFilterStyle,
  onRemoveFile,
  descriptions,
  captureDates,
  onDescriptionChange,
  onDateChange,
  ecosystemName,
  setEcosystemName,
  ecosystemId,
  setEcosystemId,
  onAddMore,
  ecosystems,
  polygonData,
}) => {
  const selectedEcosystem = useMemo(() => {
    return ecosystems.find((e) => e.id.toString() === ecosystemId)
  }, [ecosystemId, ecosystems])

  // Función para mostrar coordenadas de forma legible
  const formatCoordinatesForDisplay = useCallback((coords: number[][][]): string => {
    try {
      if (coords && coords[0] && coords[0].length > 0) {
        const firstCoords = coords[0].slice(0, 3) // Mostrar solo las primeras 3 coordenadas
        return firstCoords.map((coord) => `${coord[1].toFixed(6)}, ${coord[0].toFixed(6)}`).join("; ")
      }
      return "Coordenadas no disponibles"
    } catch (error) {
      return "Error al procesar coordenadas"
    }
  }, [])

  // Usar datos del polígono si están disponibles
  useEffect(() => {
    if (polygonData?.ecosystemId && polygonData.ecosystemId !== "new") {
      setEcosystemId(polygonData.ecosystemId)
      const selected = ecosystems.find((e) => e.id.toString() === polygonData.ecosystemId)
      if (selected) {
        setEcosystemName(selected.name)
      }
    } else if (polygonData?.locationName) {
      setEcosystemName(polygonData.locationName)
      setEcosystemId("new")
    }
  }, [polygonData, ecosystems, setEcosystemId, setEcosystemName])

  const handleSelectChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value
      setEcosystemId(value)
      if (value === "new") {
        setEcosystemName("")
      } else {
        const selected = ecosystems.find((e) => e.id.toString() === value)
        setEcosystemName(selected ? selected.name : "")
      }
    },
    [ecosystems, setEcosystemId, setEcosystemName],
  )

  return (
    <div className="space-y-4">
      <Card className="p-4 border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="ecosystem-select" className="mb-2 text-sm font-medium text-slate-700">
              Seleccionar Ecosistema
            </Label>
            <select
              id="ecosystem-select"
              value={ecosystemId || "new"}
              onChange={handleSelectChange}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="new">Crear nuevo cuerpo de agua</option>
              {ecosystems.map((ecosystem) => (
                <option key={ecosystem.id} value={ecosystem.id}>
                  {ecosystem.name} (ID: {ecosystem.id})
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="ecosystem-name" className="mb-2 text-sm font-medium text-slate-700">
              Nombre del Cuerpo de Agua
            </Label>
            <Input
              id="ecosystem-name"
              placeholder="Ej: Laguna de Términos"
              value={ecosystemName}
              onChange={(e) => setEcosystemName(e.target.value)}
              disabled={!!selectedEcosystem}
            />
          </div>
        </div>

        {polygonData && (
          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Map className="w-4 h-4 text-blue-600" />
              <p className="text-sm font-medium text-blue-700">Información del Polígono</p>
            </div>
            <p className="text-sm text-blue-700">
              <strong>Ubicación:</strong> {polygonData.locationName}
            </p>
            <p className="text-xs text-blue-600">
              <strong>Polígono:</strong> {polygonData.drawnItemsCount} elemento(s) dibujado(s)
            </p>
            {polygonData.coordinates && (
              <p className="text-xs text-blue-600 mt-1">
                <strong>Coordenadas:</strong> {formatCoordinatesForDisplay(polygonData.coordinates)}
              </p>
            )}
            {polygonData.location && (
              <p className="text-xs text-blue-600 mt-1">
                <strong>Formato WKT:</strong> {polygonData.location.substring(0, 60)}...
              </p>
            )}
          </div>
        )}
      </Card>

      <h3 className="text-lg font-medium text-slate-900">Imágenes a Analizar ({selectedFiles.length})</h3>

      <div className="space-y-3">
        {selectedFiles.map((file, index) => (
          <Card key={index} className="p-3 border border-slate-200 flex space-x-3">
            <div className="flex-shrink-0 w-32 h-24 relative rounded-lg overflow-hidden">
              <img
                src={imagePreviewUrls[index] || "/placeholder.svg"}
                alt={`Vista previa de ${file.name}`}
                style={getImageFilterStyle()}
                className="w-full h-full object-cover"
              />
              <Button
                onClick={() => onRemoveFile(index)}
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 rounded-full opacity-80"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <Label htmlFor={`date-${index}`} className="text-xs font-medium text-slate-700">
                  Fecha de Captura
                </Label>
                <Input
                  id={`date-${index}`}
                  type="datetime-local"
                  value={captureDates[index] || ""}
                  onChange={(e) => onDateChange(index, e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label htmlFor={`desc-${index}`} className="text-xs font-medium text-slate-700">
                  Descripción (Opcional)
                </Label>
                <Input
                  id={`desc-${index}`}
                  placeholder="Ej: Toma aérea con drone"
                  value={descriptions[index] || ""}
                  onChange={(e) => onDescriptionChange(index, e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Button
        onClick={onAddMore}
        variant="outline"
        className="w-full border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 bg-transparent"
      >
        <Plus className="w-4 h-4 mr-2" />
        Añadir más imágenes
      </Button>
    </div>
  )
}

const AnalyzeStep: React.FC<{
  loading: boolean
}> = ({ loading }) => (
  <Card className="p-8 text-center">
    <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-600" />
    <h3 className="text-xl font-medium text-slate-900 mb-2">Analizando Imágenes</h3>
    <p className="text-slate-600">Procesando las imágenes seleccionadas...</p>
  </Card>
)

const ResultsStep: React.FC<{
  result: UploadResponse
  onOpenModal: (result: ImageResult) => void
}> = ({ result, onOpenModal }) => (
  <div className="space-y-4">
    <Card className="p-4 bg-blue-50 border border-blue-200">
      <h3 className="text-lg font-semibold text-slate-900 mb-2">Análisis Finalizado</h3>
      <p className="text-slate-700">
        Las {result.images.length} imágenes fueron analizadas en {result.ecosystem_name}
        (ID: {result.ecosystem_id}).
      </p>
    </Card>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {result.images.map((image, index) => (
        <Card key={image.id} className="p-3 border border-slate-200 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-slate-900">Captura #{index + 1}</span>
            <span className="text-xs text-slate-500">
              {image.capture_date ? new Date(image.capture_date).toLocaleDateString() : "N/A"}
            </span>
          </div>

          <div className="h-24 rounded-lg overflow-hidden bg-slate-100">
            <img
              src={`${REMOTE_BASE_URL}${image.image}` || "/placeholder.svg"}
              alt={`Imagen ${image.id}`}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="p-2 bg-blue-50 rounded-lg">
              <p className="text-slate-600 text-xs">Agua</p>
              <p className="font-bold text-blue-700">{image.water_percentage.toFixed(1)}%</p>
            </div>
            <div className="p-2 bg-green-50 rounded-lg">
              <p className="text-slate-600 text-xs">Lirio</p>
              <p className="font-bold text-green-700">{image.vegetation_percentage.toFixed(1)}%</p>
            </div>
          </div>

          <Button
            onClick={() => onOpenModal(image)}
            variant="outline"
            className="w-full text-blue-600 bg-slate-100 hover:bg-slate-200 text-sm"
          >
            <Eye className="w-3 h-3 mr-1" />
            Ver Detalle
          </Button>
        </Card>
      ))}
    </div>
  </div>
)

// ------------------------------ //
// COMPONENTE PRINCIPAL MODAL
// ------------------------------ //

export const PhotoAnalyzerModal: React.FC<PhotoAnalyzerModalProps> = ({
  isOpen,
  onClose,
  polygonData,
  compact = false,
}) => {
  const [currentStep, setCurrentStep] = useState<StepType>("upload")
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [imagePreviewUrls, setImagePreviewUrls] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<UploadResponse | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const [ecosystemName, setEcosystemName] = useState<string>("")
  const [ecosystemId, setEcosystemId] = useState<string | null>(null)
  const [descriptions, setDescriptions] = useState<string[]>([])
  const [captureDates, setCaptureDates] = useState<string[]>([])

  const [ecosystems, setEcosystems] = useState<Ecosystem[]>([])
  const [filterValues, setFilterValues] = useState<FilterValues>({
    brightness: 100,
    contrast: 100,
    saturate: 100,
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const configureFileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  // Función segura para crear URLs de objeto
  const createObjectURL = (file: File): string => {
    if (typeof window === 'undefined') return ''
    return URL.createObjectURL(file)
  }

  // Función segura para revocar URLs
  const revokeObjectURL = (url: string) => {
    if (typeof window === 'undefined') return
    URL.revokeObjectURL(url)
  }

  const getNowDatetimeLocal = () => {
    if (typeof window === 'undefined') return ''
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  }

  // Función para extraer coordenadas del GeoJSON en formato simple
  const extractSimpleCoordinates = useCallback((geoJson: any): number[][] => {
    try {
      if (geoJson && geoJson.features && geoJson.features.length > 0) {
        const polygonCoords = geoJson.features[0].geometry.coordinates[0]
        // Convertir a formato simple: [[lng, lat], [lng, lat], ...]
        return polygonCoords.map((coord: number[]) => [coord[0], coord[1]])
      }
      return []
    } catch (error) {
      console.error("Error extrayendo coordenadas:", error)
      return []
    }
  }, [])

  // Función para manejar la selección de archivos
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const newFiles = Array.from(e.target.files)
        setSelectedFiles((prevFiles) => [...prevFiles, ...newFiles])
        if (currentStep === "upload") {
          setCurrentStep("configure")
        }
        e.target.value = ""
      }
    },
    [currentStep],
  )

  // Función para manejar el drag & drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const newFiles = Array.from(e.dataTransfer.files)
        setSelectedFiles((prevFiles) => [...prevFiles, ...newFiles])
        if (currentStep === "upload") {
          setCurrentStep("configure")
        }
      }
    },
    [currentStep],
  )

  const handleUploadAreaClick = () => {
    fileInputRef.current?.click()
  }

  const handleAddMoreClick = () => {
    configureFileInputRef.current?.click()
  }

  // Sincronizar previsualizaciones - CORREGIDO
  useEffect(() => {
    if (selectedFiles.length > imagePreviewUrls.length) {
      const newFiles = selectedFiles.slice(imagePreviewUrls.length)
      const newUrls = newFiles.map((file) => createObjectURL(file))
      setImagePreviewUrls((prevUrls) => [...prevUrls, ...newUrls])

      const newDescriptions = Array(newFiles.length).fill("")
      setDescriptions((prev) => [...prev, ...newDescriptions])
      const newDates = Array(newFiles.length).fill(getNowDatetimeLocal())
      setCaptureDates((prev) => [...prev, ...newDates])
    } else if (selectedFiles.length < imagePreviewUrls.length) {
      // Revocar URLs que ya no se necesitan
      const urlsToRevoke = imagePreviewUrls.slice(selectedFiles.length)
      urlsToRevoke.forEach(url => revokeObjectURL(url))
      
      setImagePreviewUrls((prev) => prev.slice(0, selectedFiles.length))
      setDescriptions((prev) => prev.slice(0, selectedFiles.length))
      setCaptureDates((prev) => prev.slice(0, selectedFiles.length))
    }
  }, [selectedFiles, imagePreviewUrls.length])

  // Cleanup de URLs al desmontar
  useEffect(() => {
    return () => {
      imagePreviewUrls.forEach(url => revokeObjectURL(url))
    }
  }, [])

  // Cargar ecosistemas
  useEffect(() => {
    const fetchEcosystems = async () => {
      try {
        const response = await fetch(`${REMOTE_BASE_URL}/api/monitoring/ecosystems/`)
        if (response.ok) {
          const data: Ecosystem[] = await response.json()
          setEcosystems(data)
        }
      } catch (error) {
        console.error("Error al cargar ecosistemas:", error)
      }
    }
    fetchEcosystems()
  }, [])

  // Efecto para inicializar con datos del polígono
  useEffect(() => {
    if (polygonData && isOpen) {
      // Si hay datos del polígono, ir directamente al paso de configuración
      if (currentStep === "upload") {
        setCurrentStep("configure")
      }

      // Configurar nombre del ecosistema desde el polígono
      if (polygonData.locationName && !ecosystemName) {
        setEcosystemName(polygonData.locationName)
      }

      // Configurar ecosystemId si viene del polígono
      if (polygonData.ecosystemId && polygonData.ecosystemId !== "new") {
        setEcosystemId(polygonData.ecosystemId)
      } else if (polygonData.locationName) {
        setEcosystemId("new")
      }
    }
  }, [polygonData, isOpen, currentStep, ecosystemName])

  const getImageFilterStyle = useCallback(() => {
    const { brightness, contrast, saturate } = filterValues
    return {
      filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)`,
    }
  }, [filterValues])

  const handleRemoveFile = useCallback((indexToRemove: number) => {
    // Revocar URL antes de eliminar
    if (imagePreviewUrls[indexToRemove]) {
      revokeObjectURL(imagePreviewUrls[indexToRemove])
    }
    
    setSelectedFiles((prevFiles) => prevFiles.filter((_, index) => index !== indexToRemove))
    setDescriptions((prevDesc) => prevDesc.filter((_, index) => index !== indexToRemove))
    setCaptureDates((prevDates) => prevDates.filter((_, index) => index !== indexToRemove))
  }, [imagePreviewUrls])

  const handleDescriptionChange = useCallback((index: number, description: string) => {
    setDescriptions((prev) => prev.map((item, i) => (i === index ? description : item)))
  }, [])

  const handleDateChange = useCallback((index: number, date: string) => {
    setCaptureDates((prev) => prev.map((item, i) => (i === index ? date : item)))
  }, [])

  const handleReset = useCallback(() => {
    // Revocar todas las URLs
    imagePreviewUrls.forEach(url => revokeObjectURL(url))
    
    setSelectedFiles([])
    setAnalysisResult(null)
    setDescriptions([])
    setCaptureDates([])
    setEcosystemName("")
    setEcosystemId(null)
    setCurrentStep("upload")
    setFilterValues({ brightness: 100, contrast: 100, saturate: 100 })
    setImagePreviewUrls([])
  }, [imagePreviewUrls])

  const validateForm = () => {
    if (selectedFiles.length === 0) {
      return "Selecciona al menos una imagen para analizar."
    }
    if (!ecosystemName.trim()) {
      return "El nombre del cuerpo de agua es requerido."
    }
    // Si se selecciona un ecosistema existente, no se requiere polígono
    if (ecosystemId === "new" && !polygonData) {
      return "Debes dibujar un polígono en el mapa para crear un nuevo ecosistema."
    }
    return null
  }

  const handleAnalyze = async () => {
    const validationError = validateForm()
    if (validationError) {
      toast({
        title: "Atención",
        description: validationError,
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setCurrentStep("analyze")

    try {
      const formData = new FormData()

      // Si es un ecosistema existente, solo enviar el ID
      if (polygonData?.ecosystemId && polygonData.ecosystemId !== "new") {
        formData.append("ecosystem_id", polygonData.ecosystemId)
      } else if (ecosystemId && ecosystemId !== "new") {
        formData.append("ecosystem_id", ecosystemId)
      } else {
        // Solo para ecosistemas nuevos
        formData.append("ecosystem_name", ecosystemName.trim())
      }

      if (ecosystemId === "new" && polygonData) {
        // Enviar coordenadas en formato simple
        if (polygonData.coordinates) {
          const simpleCoords = polygonData.coordinates[0]
          formData.append("coordinates", JSON.stringify(simpleCoords))
          console.log("Enviando coordenadas procesadas:", simpleCoords)
        } else if (polygonData.geoJson) {
          const simpleCoords = extractSimpleCoordinates(polygonData.geoJson)
          if (simpleCoords.length > 0) {
            formData.append("coordinates", JSON.stringify(simpleCoords))
            console.log("Enviando coordenadas extraídas del GeoJSON:", simpleCoords)
          }
        }

        // También enviar el WKT para ecosistemas nuevos
        if (polygonData.location) {
          formData.append("location", polygonData.location)
        }

        formData.append("polygon_name", polygonData.locationName)
      }

      // Agregar imágenes
      selectedFiles.forEach((file) => {
        formData.append("images", file)
      })

      // Fechas y descripciones
      captureDates.forEach((date) => {
        const normalizedDate = date ? `${date}:00Z` : `${getNowDatetimeLocal()}:00Z`
        formData.append("capture_dates", normalizedDate)
      })

      descriptions.forEach((desc) => {
        formData.append("descriptions", desc || "")
      })

      console.log("Enviando datos al servidor...")
      console.log("Tipo de análisis:", ecosystemId === "new" ? "Nuevo ecosistema" : "Ecosistema existente")

      const response = await fetch(`${REMOTE_BASE_URL}/api/monitoring/images/upload-multiple/`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("Error del servidor:", errorText)
        throw new Error(`Error del servidor: ${response.status} - ${errorText}`)
      }

      const result: UploadResponse = await response.json()
      setAnalysisResult(result)
      setCurrentStep("results")

      toast({
        title: "Análisis Completado",
        description:
          ecosystemId === "new"
            ? "Las imágenes se analizaron con éxito y el nuevo ecosistema fue creado."
            : "Las imágenes se analizaron con éxito en el ecosistema existente.",
      })

      console.log("✅ Análisis completado exitosamente")
    } catch (error) {
      console.error("ERROR en el análisis:", error)
      toast({
        title: "Error de Análisis",
        description: error instanceof Error ? error.message : "No se pudo conectar con el servidor.",
        variant: "destructive",
      })
      setCurrentStep("configure")
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { id: "upload", label: "Subir", icon: Upload },
    { id: "configure", label: "Configurar", icon: FileText },
    { id: "analyze", label: "Analizar", icon: Sparkles },
    { id: "results", label: "Resultados", icon: Check },
  ]

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Análisis de Imágenes" size={compact ? "lg" : "xl"}>
      <div className="space-y-4 p-6">
        {/* Barra de progreso */}
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => {
            const Icon = step.icon
            const isActive = currentStepIndex === index
            const isCompleted = currentStepIndex > index

            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                      isCompleted
                        ? "bg-blue-600 text-white"
                        : isActive
                          ? "bg-blue-100 text-blue-600 border-2 border-blue-600"
                          : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span
                    className={`mt-1 text-xs ${
                      isActive ? "text-slate-900 font-medium" : isCompleted ? "text-blue-600" : "text-slate-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-2 ${isCompleted ? "bg-blue-600" : "bg-slate-200"}`} />
                )}
              </div>
            )
          })}
        </div>

        {/* Contenido del paso actual */}
        <div className="min-h-[400px]">
          {currentStep === "upload" && (
            <UploadStep
              isDragging={isDragging}
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onAreaClick={handleUploadAreaClick}
              fileInputRef={fileInputRef}
              onFileChange={handleFileChange}
            />
          )}

          {currentStep === "configure" && (
            <>
              <ConfigureStep
                selectedFiles={selectedFiles}
                imagePreviewUrls={imagePreviewUrls}
                getImageFilterStyle={getImageFilterStyle}
                onRemoveFile={handleRemoveFile}
                descriptions={descriptions}
                captureDates={captureDates}
                onDescriptionChange={handleDescriptionChange}
                onDateChange={handleDateChange}
                ecosystemName={ecosystemName}
                setEcosystemName={setEcosystemName}
                ecosystemId={ecosystemId}
                setEcosystemId={setEcosystemId}
                onAddMore={handleAddMoreClick}
                fileInputRef={configureFileInputRef}
                onFileChange={handleFileChange}
                ecosystems={ecosystems}
                polygonData={polygonData}
              />
              <Input
                type="file"
                ref={configureFileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                multiple
              />
            </>
          )}

          {currentStep === "analyze" && <AnalyzeStep loading={loading} />}

          {currentStep === "results" && analysisResult && (
            <ResultsStep
              result={analysisResult}
              onOpenModal={() => {}} // Puedes implementar esto si necesitas
            />
          )}
        </div>

        {/* Controles */}
        <div className="flex justify-between pt-4 border-t border-slate-200">
          {currentStep === "upload" && selectedFiles.length > 0 && (
            <Button onClick={() => setCurrentStep("configure")} className="bg-blue-600 hover:bg-blue-700 text-white">
              Continuar
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}

          {currentStep === "configure" && (
            <div className="flex space-x-2 w-full">
              <Button onClick={() => setCurrentStep("upload")} variant="outline" className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-2" />
                Volver
              </Button>
              <Button
                onClick={handleAnalyze}
                disabled={
                  selectedFiles.length === 0 || !ecosystemName.trim() || (ecosystemId === "new" && !polygonData)
                }
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "Iniciar Análisis"}
              </Button>
            </div>
          )}

          {currentStep === "results" && (
            <div className="flex space-x-2 w-full">
              <Button onClick={handleReset} variant="outline" className="flex-1 bg-transparent">
                Nuevo Análisis
              </Button>
              <Button onClick={onClose} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                Finalizar
              </Button>
            </div>
          )}
        </div>
      </div>
      <Toaster />
    </Modal>
  )
}

export default PhotoAnalyzerModal