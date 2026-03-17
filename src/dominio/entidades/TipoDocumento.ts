// ============================================================================
// ENTIDAD TIPO DOCUMENTO - Catálogo maestro de tipos de documentos
// ============================================================================

export interface TipoDocumento {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | undefined;
  estado: 'activo' | 'inactivo';
  fechaCreacion: Date;
  fechaActualizacion?: Date;
}

export interface TipoDocumentoInput {
  nombre: string;
  descripcion?: string;
  estado: 'activo' | 'inactivo';
}

export interface TipoDocumentoFiltros {
  nombre?: string;
  estado?: 'activo' | 'inactivo';
  limit?: number;
  offset?: number;
}

export interface TipoDocumentoConnection {
  tiposDocumento: TipoDocumento[];
  totalCount: number;
}
