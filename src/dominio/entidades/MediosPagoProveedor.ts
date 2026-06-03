import { Proveedor } from './Proveedor';
import { Banco } from './Banco';

// ============================================================================
// ENTIDAD DE DOMINIO: MediosPagoProveedor
// Migrado desde inacons-backend (colección "medios_pago_proveedor")
// `entidad` referencia a Banco (colección "banco").
// ============================================================================

export interface MediosPagoProveedor {
  id: string;
  proveedor_id: Proveedor | null;
  entidad: Banco | null;
  nro_cuenta?: string;
  detalles?: string;
  titular?: string;
  validado?: boolean;
  mostrar?: boolean;
}

export interface MediosPagoProveedorInput {
  proveedor_id: string;
  entidad?: string;
  nro_cuenta?: string;
  detalles?: string;
  titular?: string;
  validado?: boolean;
  mostrar?: boolean;
}

export interface MediosPagoProveedorUpdateInput {
  proveedor_id?: string;
  entidad?: string;
  nro_cuenta?: string;
  detalles?: string;
  titular?: string;
  validado?: boolean;
  mostrar?: boolean;
}

export interface MediosPagoNoValidadoFilter {
  page?: number;
  limit?: number;
  search?: string;
}

export interface MediosPagoProveedorPaginatedResponse {
  data: MediosPagoProveedor[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
