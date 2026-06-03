import { Empresa } from './Empresa';

// ============================================================================
// ENTIDAD DE DOMINIO: MediosPagoEmpresa
// Migrado desde inacons-backend (colección "medios_pago_empresa")
// `entidad` es texto libre (NO referencia a Banco, igual que inacons).
// ============================================================================

export interface MediosPagoEmpresa {
  id: string;
  empresa_id: Empresa | null;
  entidad: string;
  nro_cuenta: string;
  detalles?: string;
  titular: string;
  validado?: boolean;
}

export interface MediosPagoEmpresaInput {
  empresa_id: string;
  entidad: string;
  nro_cuenta: string;
  detalles?: string;
  titular: string;
}

export interface MediosPagoEmpresaUpdateInput {
  empresa_id?: string;
  entidad?: string;
  nro_cuenta?: string;
  detalles?: string;
  titular?: string;
}

export interface MediosPagoEmpresaGrouped {
  empresa_id: Empresa;
  medios_pago: MediosPagoEmpresa[];
}
