import { Proveedor } from './Proveedor';

// ============================================================================
// ENTIDAD DE DOMINIO: ContactoProveedor
// Migrado desde inacons-backend (colección "contacto_proveedor")
// ============================================================================

export interface ContactoProveedor {
  id: string;
  proveedor_id: Proveedor | null;
  nombres: string;
  apellidos: string;
  cargo?: string;
  telefono?: string;
}

export interface ContactoProveedorInput {
  proveedor_id: string;
  nombres: string;
  apellidos: string;
  cargo: string;
  telefono: string;
}

export interface ContactoProveedorUpdateInput {
  proveedor_id?: string;
  nombres?: string;
  apellidos?: string;
  cargo?: string;
  telefono?: string;
}
