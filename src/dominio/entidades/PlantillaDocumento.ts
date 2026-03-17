export interface PlantillaDocumento {
  id: string
  codigo: string
  tipoDocumentoId: string
  nombrePlantilla: string
  plantillaUrl: string
  activo: boolean
  fechaCreacion: string
  fechaActualizacion?: string
  tipoDocumento?: {
    _id: string
    codigo: string
    nombre: string
    descripcion?: string
  }
}

export interface PlantillaDocumentoInput {
  tipoDocumentoId: string
  nombrePlantilla: string
  plantillaUrl: string
  activo: boolean
}

export interface PlantillaDocumentoFiltros {
  tipoDocumentoId?: string
  nombrePlantilla?: string
  codigo?: string
  activo?: boolean
  busqueda?: string
  tipoDocumento?: string
}

export interface PlantillaDocumentoConnection {
  plantillasDocumento: PlantillaDocumento[]
  totalCount: number
}
