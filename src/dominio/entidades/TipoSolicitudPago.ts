export interface TipoSolicitudPago {
  id: string
  codigo: string
  nombre: string
  descripcion?: string
  categoria: 'anticipado' | 'avance' | 'cierre' | 'entrega' | 'gasto' | 'ajuste'
  permiteMultiple: boolean
  permiteVincularReportes: boolean
  estado: 'activo' | 'inactivo'
  fechaCreacion: string
  fechaActualizacion?: string
}

export interface TipoSolicitudPagoInput {
  nombre: string
  descripcion?: string
  categoria: 'anticipado' | 'avance' | 'cierre' | 'entrega' | 'gasto' | 'ajuste'
  permiteMultiple: boolean
  permiteVincularReportes: boolean
  estado: 'activo' | 'inactivo'
}

export interface TipoSolicitudPagoFiltros {
  nombre?: string
  categoria?: 'anticipado' | 'avance' | 'cierre' | 'entrega' | 'gasto' | 'ajuste'
  estado?: 'activo' | 'inactivo'
}

export interface TipoSolicitudPagoConnection {
  tiposSolicitudPago: TipoSolicitudPago[]
  totalCount: number
}
