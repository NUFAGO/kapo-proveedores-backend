import {
  Proveedor,
  ProveedorInput,
  ProveedorUpdateInput,
  ProveedorPaginationInput,
  ProveedorPaginatedResponse,
} from '../entidades/Proveedor';

/**
 * Puerto del repositorio de Proveedor.
 * Métodos nombrados igual que el contrato de inacons para mantener consistencia
 * con los sistemas que ya consumen el API.
 */
export interface IProveedorRepository {
  listProveedor(): Promise<Proveedor[]>;
  listProveedoresPaginated(filter?: ProveedorPaginationInput): Promise<ProveedorPaginatedResponse>;
  getProveedorById(id: string): Promise<Proveedor | null>;
  /**
   * Hidratación batch: devuelve los proveedores cuyos IDs se pasan, en una sola
   * consulta. Pensado para consumidores externos (p. ej. kapo-compras) que de otro
   * modo harían N llamadas `getProveedorById` (N+1).
   */
  getProveedoresByIds(ids: string[]): Promise<Proveedor[]>;
  getProveedorByRuc(ruc: string): Promise<Proveedor | null>;
  listProveedoresSubContrata(): Promise<Proveedor[]>;
  addProveedor(input: ProveedorInput): Promise<Proveedor>;
  updateProveedor(id: string, input: ProveedorUpdateInput): Promise<Proveedor | null>;
  deleteProveedor(id: string): Promise<Proveedor | null>;
}
