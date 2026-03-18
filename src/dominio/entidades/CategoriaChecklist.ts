export interface CategoriaChecklist {
  id: string
  nombre: string
  descripcion?: string
  tipoUso: 'pago' | 'documentos_oc'
  permiteMultiple?: boolean // Solo aplica si tipoUso es 'pago'
  permiteVincularReportes?: boolean // Solo aplica si tipoUso es 'pago'
  estado: 'activo' | 'inactivo'
  fechaCreacion: string
  fechaActualizacion?: string
}

export interface CategoriaChecklistInput {
  nombre: string
  descripcion?: string
  tipoUso: 'pago' | 'documentos_oc'
  permiteMultiple?: boolean // Solo aplica si tipoUso es 'pago'
  permiteVincularReportes?: boolean // Solo aplica si tipoUso es 'pago'
  estado: 'activo' | 'inactivo'
}

export interface CategoriaChecklistFiltros {
  nombre?: string
  tipoUso?: 'pago' | 'documentos_oc'
  estado?: 'activo' | 'inactivo'
}

export interface CategoriaChecklistConnection {
  categoriasChecklist: CategoriaChecklist[]
  totalCount: number
}
