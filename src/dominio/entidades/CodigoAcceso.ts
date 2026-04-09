// ============================================================================
// ENTIDAD CÓDIGO ACCESO - Códigos para acceso de proveedores
// ============================================================================

export interface CodigoAcceso {
  id: string;
  codigo: string;
  proveedorId: string;
  proveedorRuc: string;
  proveedorNombre?: string;
  tipo: 'registro' | 'cambio' | 'recuperacion';
  fechaGeneracion: Date;
  fechaExpiracion: Date;
  usado: boolean;
  fechaUso?: Date;
  creadoPor?: string;
  motivoInvalidacion?: string;
  activo: boolean;
}

export interface CodigoAccesoInput {
  proveedorId: string;
  proveedorRuc: string;
  proveedorNombre?: string | undefined;
  tipo: 'registro' | 'cambio' | 'recuperacion';
  creadoPor?: string | undefined;
  diasValidez?: number | undefined;
}

export interface CodigosGenerados {
  codigoProveedor: string;
  codigoAcceso: string;
  codigoVerificacion: string;
  codigoBD: CodigoAcceso;
}

export interface VerificacionResponse {
  valido: boolean;
  proveedorId?: string;
  proveedor?: any; // Proveedor del sistema externo
  error?: string;
  tipo?: string;
}

export interface CodigoAccesoFiltros {
  proveedorId?: string;
  tipo?: string;
  activo?: boolean;
  page?: number;
  limit?: number;
}

export interface CodigoAccesoConnection {
  codigos: CodigoAcceso[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}
