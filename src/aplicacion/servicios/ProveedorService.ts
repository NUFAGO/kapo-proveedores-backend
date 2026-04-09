import { IProveedorRepository } from '../../dominio/repositorios/IProveedorRepository';
import { HttpProveedorRepository } from '../../infraestructura/persistencia/http/HttpProveedorRepository';
import { logger } from '../../infraestructura/logging';

/**
 * Servicio para consumir Proveedores del inacons-backend
 * Sigue el mismo patrón que OrdenCompraService
 */
export class ProveedorService {
  private repository: IProveedorRepository;

  constructor(repository?: IProveedorRepository) {
    this.repository = repository || new HttpProveedorRepository();
  }

  /**
   * Listar todos los proveedores con relaciones completas
   */
  async listarProveedores(): Promise<any[]> {
    try {
      logger.info('Consumiendo endpoint listProveedor del inacons-backend');
      
      const result = await this.repository.listProveedor();
      
      logger.info('Respuesta obtenida de listProveedor', {
        count: result.length
      });

      return result;
    } catch (error) {
      logger.error('Error consumiendo listProveedor del inacons-backend', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Listar proveedores paginados con filtros
   */
  async listarProveedoresPaginados(filter?: Record<string, any>): Promise<any> {
    try {
      const result = await this.repository.listProveedoresPaginated(filter);
      return result;
    } catch (error) {
      logger.error('Error en ProveedorService.listarProveedoresPaginados:', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Obtener proveedor por ID con relaciones completas
   */
  async obtenerProveedorPorId(id: string): Promise<any> {
    try {
      logger.info('Consumiendo endpoint getProveedorById del inacons-backend', { id });
      
      const result = await this.repository.getProveedorById(id);
      
      if (!result) {
        logger.warn('Proveedor no encontrado', { id });
        throw new Error('Proveedor no encontrado');
      }
      
      logger.info('Respuesta obtenida de getProveedorById', {
        id,
        razon_social: result.razon_social,
        ruc: result.ruc
      });

      return result;
    } catch (error) {
      logger.error('Error consumiendo getProveedorById del inacons-backend', {
        error: error instanceof Error ? error.message : String(error),
        id
      });
      throw error;
    }
  }

  /**
   * Buscar proveedor por RUC
   */
  async buscarProveedorPorRuc(ruc: string): Promise<any> {
    try {
      logger.info('Consumiendo endpoint getProveedorByRuc del inacons-backend', { ruc });
      
      const result = await this.repository.getProveedorByRuc(ruc);
      
      logger.info('Respuesta obtenida de getProveedorByRuc', {
        ruc,
        found: !!result
      });

      return result;
    } catch (error) {
      logger.error('Error consumiendo getProveedorByRuc del inacons-backend', {
        error: error instanceof Error ? error.message : String(error),
        ruc
      });
      throw error;
    }
  }

  /**
   * Listar proveedores con subcontratación habilitada
   */
  async listarProveedoresSubContrata(): Promise<any[]> {
    try {
      logger.info('Consumiendo endpoint listProveedoresSubContrata del inacons-backend');
      
      const result = await this.repository.listProveedoresSubContrata();
      
      logger.info('Respuesta obtenida de listProveedoresSubContrata', {
        count: result.length
      });

      return result;
    } catch (error) {
      logger.error('Error consumiendo listProveedoresSubContrata del inacons-backend', {
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Obtener estadísticas de cotizaciones por proveedor
   */
  async obtenerEstadisticasCotizaciones(proveedorId: string): Promise<any> {
    try {
      logger.info('Consumiendo endpoint getEstadisticasCotizaciones del inacons-backend', { proveedorId });
      
      const result = await this.repository.getEstadisticasCotizaciones(proveedorId);
      
      if (!result) {
        logger.warn('Estadísticas no encontradas', { proveedorId });
        throw new Error('Estadísticas no encontradas');
      }
      
      logger.info('Respuesta obtenida de getEstadisticasCotizaciones', {
        proveedorId,
        totalCotizaciones: result.totalCotizaciones
      });

      return result;
    } catch (error) {
      logger.error('Error consumiendo getEstadisticasCotizaciones del inacons-backend', {
        error: error instanceof Error ? error.message : String(error),
        proveedorId
      });
      throw error;
    }
  }

  /**
   * Crear nuevo proveedor
   */
  async crearProveedor(input: any): Promise<any> {
    try {
      logger.info('Consumiendo endpoint addProveedor del inacons-backend', { 
        razon_social: input.razon_social,
        ruc: input.ruc
      });
      
      const result = await this.repository.addProveedor(input);
      
      logger.info('Respuesta obtenida de addProveedor', {
        id: result.id,
        razon_social: result.razon_social,
        ruc: result.ruc
      });

      return result;
    } catch (error) {
      logger.error('Error consumiendo addProveedor del inacons-backend', {
        error: error instanceof Error ? error.message : String(error),
        input: {
          razon_social: input.razon_social,
          ruc: input.ruc
        }
      });
      throw error;
    }
  }

  /**
   * Actualizar proveedor existente
   */
  async actualizarProveedor(id: string, input: any): Promise<any> {
    try {
      logger.info('Consumiendo endpoint updateProveedor del inacons-backend', { 
        id,
        razon_social: input.razon_social,
        ruc: input.ruc
      });
      
      const result = await this.repository.updateProveedor(id, input);
      
      if (!result) {
        logger.warn('Proveedor no encontrado para actualizar', { id });
        throw new Error('Proveedor no encontrado');
      }
      
      logger.info('Respuesta obtenida de updateProveedor', {
        id,
        razon_social: result.razon_social,
        ruc: result.ruc
      });

      return result;
    } catch (error) {
      logger.error('Error consumiendo updateProveedor del inacons-backend', {
        error: error instanceof Error ? error.message : String(error),
        id,
        input: {
          razon_social: input.razon_social,
          ruc: input.ruc
        }
      });
      throw error;
    }
  }

  /**
   * Eliminar proveedor
   */
  async eliminarProveedor(id: string): Promise<any> {
    try {
      logger.info('Consumiendo endpoint deleteProveedor del inacons-backend', { id });
      
      const result = await this.repository.deleteProveedor(id);
      
      if (!result) {
        logger.warn('Proveedor no encontrado para eliminar', { id });
        throw new Error('Proveedor no encontrado');
      }
      
      logger.info('Respuesta obtenida de deleteProveedor', {
        id,
        razon_social: result.razon_social,
        ruc: result.ruc
      });

      return result;
    } catch (error) {
      logger.error('Error consumiendo deleteProveedor del inacons-backend', {
        error: error instanceof Error ? error.message : String(error),
        id
      });
      throw error;
    }
  }

  /**
   * Verificar conexión con el servicio de proveedores
   */
  async verificarConexion(): Promise<boolean> {
    try {
      logger.info('Verificando conexión con el servicio de proveedores');
      
      // Intentamos listar proveedores como prueba de conexión
      await this.repository.listProveedor();
      
      logger.info('Conexión con servicio de proveedores verificada exitosamente');
      return true;
    } catch (error) {
      logger.error('Error verificando conexión con servicio de proveedores', {
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }
}
