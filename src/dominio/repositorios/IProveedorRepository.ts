import { IBaseRepository } from './IBaseRepository';

/**
 * Interfaz para el repositorio de Proveedores (consume API externa)
 */
export interface IProveedorRepository extends IBaseRepository<any> {
  /**
   * Listar todos los proveedores con relaciones completas
   */
  listProveedor(): Promise<any[]>;

  /**
   * Listar proveedores paginados con filtros
   */
  listProveedoresPaginated(filter?: Record<string, any>): Promise<any>;

  /**
   * Obtener proveedor por ID con relaciones completas
   */
  getProveedorById(id: string): Promise<any>;

  /**
   * Buscar proveedor por RUC
   */
  getProveedorByRuc(ruc: string): Promise<any>;

  /**
   * Listar proveedores con subcontratación habilitada
   */
  listProveedoresSubContrata(): Promise<any[]>;

  /**
   * Obtener estadísticas de cotizaciones por proveedor
   */
  getEstadisticasCotizaciones(proveedorId: string): Promise<any>;

  /**
   * Crear nuevo proveedor
   */
  addProveedor(input: any): Promise<any>;

  /**
   * Actualizar proveedor existente
   */
  updateProveedor(id: string, input: any): Promise<any>;

  /**
   * Eliminar proveedor
   */
  deleteProveedor(id: string): Promise<any>;
}
