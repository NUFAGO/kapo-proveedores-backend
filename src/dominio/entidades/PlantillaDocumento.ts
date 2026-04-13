export interface PlantillaDocumento {
  id: string
  codigo: string
  nombrePlantilla: string
  plantillaUrl: string
  formatosPermitidos?: string
  activo: boolean
  fechaCreacion: string
  fechaActualizacion?: string
}

export interface PlantillaDocumentoInput {
  nombrePlantilla: string
  plantillaUrl: string
  formatosPermitidos?: string
  activo: boolean
}

export interface PlantillaDocumentoFiltros {
  nombrePlantilla?: string
  codigo?: string
  activo?: boolean
  busqueda?: string
}

export interface PlantillaDocumentoConnection {
  plantillasDocumento: PlantillaDocumento[]
  totalCount: number
}
