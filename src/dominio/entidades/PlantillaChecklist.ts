export interface PlantillaChecklist {
  id: string
  codigo: string
  nombre: string
  descripcion?: string
  categoriaChecklistId: string
  plantillaBaseId?: string
  categoria?: {
    id: string
    nombre: string
    tipoUso: string
    descripcion?: string
    fechaCreacion: string
    fechaActualizacion?: string
  }
  activo: boolean
  fechaCreacion: string
  fechaActualizacion?: string
  requisitos?: RequisitoDocumento[]
}

export interface PlantillaChecklistInput {
  codigo?: string // Opcional para autogeneración
  nombre: string
  descripcion?: string
  categoriaChecklistId: string
  activo: boolean
}

export interface PlantillaChecklistFiltros {
  codigo?: string
  nombre?: string
  categoriaChecklistId?: string
  activo?: boolean
  categoriaTipoUso?: 'pago' | 'documentos_oc'
}

export interface PlantillaChecklistConnection {
  plantillasChecklist: PlantillaChecklist[]
  totalCount: number
}

export interface RequisitoDocumento {
  id: string
  checklistId: string
  tipoRequisito: 'documento' | 'formulario'
  plantillaDocumentoId?: string
  formularioId?: string
  obligatorio: boolean
  formatosPermitidos?: string
  orden: number
  activo: boolean
  plantillaDocumento?: {
    id: string
    nombrePlantilla: string
    plantillaUrl: string
    activo: boolean
    tipoDocumento: {
      id: string
      nombre: string
    }
  }
  formulario?: {
    id: string
    nombre: string
    version: number
    activo: boolean
  }
}

export interface RequisitoDocumentoInput {
  checklistId: string
  tipoRequisito: 'documento' | 'formulario'
  plantillaDocumentoId?: string
  formularioId?: string
  obligatorio: boolean
  formatosPermitidos?: string
  orden: number
  activo?: boolean
}

export interface RequisitoDocumentoFiltros {
  checklistId?: string
  tipoRequisito?: 'documento' | 'formulario'
  obligatorio?: boolean
  plantillaDocumentoId?: string
  formularioId?: string
  activo?: boolean
}
