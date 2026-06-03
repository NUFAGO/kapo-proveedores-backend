import { Banco } from './Banco';

// ============================================================================
// ENTIDAD DE DOMINIO: Proveedor
// Migrado desde inacons-backend (colección "proveedor").
// `ruc` se almacena como Number en Mongo y se expone como String (igual inacons).
// El campo estadisticasCotizaciones NO se migra (cotizaciones queda en inacons).
// ============================================================================

export interface ProveedorMedioPago {
  id: string;
  entidad: Banco | null;
  nro_cuenta?: string;
  detalles?: string;
  titular?: string;
  validado?: boolean;
  mostrar?: boolean;
}

export interface ProveedorContacto {
  id: string;
  nombres: string;
  apellidos: string;
  cargo?: string;
  telefono?: string;
}

export interface CotizacionPorEstado {
  estado: string;
  cantidad: number;
  porcentaje: number;
}

export interface EstadisticasDetalladas {
  proveedor_id: string;
  razon_social: string;
  totalCotizaciones: number;
  cotizacionesPorEstado: CotizacionPorEstado[];
  primeraCotizacion: string | null;
  ultimaCotizacion: string | null;
}

export interface Proveedor {
  id: string;
  razon_social: string;
  direccion?: string;
  nombre_comercial?: string;
  ruc: string;
  rubro?: string;
  estado?: string;
  tipo?: string;
  actividad?: string;
  correo?: string;
  telefono?: string;
  estado_sunat?: string;
  condicion?: string;
  agente_retencion?: boolean;
  sub_contrata?: boolean;
  distrito?: string;
  provincia?: string;
  departamento?: string;
  mediosPago?: ProveedorMedioPago[];
  contactos?: ProveedorContacto[];
  estadisticasCotizaciones?: EstadisticasDetalladas | null;
}

export interface ProveedorInput {
  razon_social: string;
  ruc: string;
  direccion?: string;
  nombre_comercial?: string;
  rubro?: string;
  estado?: string;
  tipo?: string;
  actividad?: string;
  correo?: string;
  telefono?: string;
  estado_sunat?: string;
  condicion?: string;
  agente_retencion?: boolean;
  sub_contrata?: boolean;
  distrito?: string;
  provincia?: string;
  departamento?: string;
}

export type ProveedorUpdateInput = Partial<ProveedorInput>;

export interface ProveedorFilterInput {
  estado?: string;
  estados?: string[]; // filtra por varios estados (ej. pendientes de aprobación)
  tipo?: string;
  rubro?: string;
  sub_contrata?: boolean;
  departamento?: string;
  provincia?: string;
  distrito?: string;
  searchTerm?: string;
}

export interface ProveedorPaginationInput {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
  filter?: ProveedorFilterInput;
}

export interface ProveedorPaginatedResponse {
  data: Proveedor[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
