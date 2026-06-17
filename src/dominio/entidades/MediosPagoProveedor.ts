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

/** Medio de pago en listado agrupado caja chica (paridad inacons `MedioPagoLitleBox`). */
export interface MedioPagoLitleBox {
  id: string;
  nro_cuenta?: string | null;
  entidad?: Banco | null;
  detalles?: string | null;
  titular?: string | null;
  validado?: boolean | null;
  mostrar?: boolean | null;
}

/** Proveedor resumido en listado caja chica (paridad inacons `ProveedorLitleBox`). */
export interface ProveedorLitleBox {
  id: string;
  razon_social: string;
  nombre_comercial?: string | null;
  tipo: string;
  ruc: string;
  direccion?: string | null;
  rubro?: string | null;
  estado?: string | null;
  actividad?: string | null;
  correo?: string | null;
  horario?: string | null;
}

export interface MediosPagoProveedorLitleBoxGroup {
  proveedor_id: ProveedorLitleBox;
  medios_pago: MedioPagoLitleBox[];
}
