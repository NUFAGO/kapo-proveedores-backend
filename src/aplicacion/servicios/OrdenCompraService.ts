import { IOrdenCompraRepository, OrdenCompraFilter, OrdenCompraPaginatedResponse } from '../../dominio/repositorios/IOrdenCompraRepository';
import { HttpOrdenCompraRepository } from '../../infraestructura/persistencia/http/HttpOrdenCompraRepository';
import { logger } from '../../infraestructura/logging';

/**
 * Servicio para consumir Órdenes de Compra del inacons-backend
 * Sigue la misma lógica que los otros servicios del proyecto
 */
export class OrdenCompraService {
  private repository: IOrdenCompraRepository;

  constructor(repository?: IOrdenCompraRepository) {
    this.repository = repository || new HttpOrdenCompraRepository();
  }

  /**
   * Obtener órdenes de compra paginadas desde el inacons-backend
   */
  async listOrdenComprasPaginated(filter?: OrdenCompraFilter): Promise<OrdenCompraPaginatedResponse> {
    try {
      logger.info('Consumiendo endpoint listOrdenComprasPaginated del inacons-backend', { filter });
      
      const result = await this.repository.listOrdenComprasPaginated(filter);
      
      logger.info('Respuesta obtenida de listOrdenComprasPaginated', {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        dataCount: result.data.length
      });

      return result;
    } catch (error) {
      logger.error('Error consumiendo listOrdenComprasPaginated del inacons-backend', {
        error: error instanceof Error ? error.message : String(error),
        filter
      });
      throw error;
    }
  }

  /**
   * Obtener órdenes de compra con filtros comunes
   */
  async getOrdenesComprasPorObra(obraId: string, page: number = 1, limit: number = 10): Promise<OrdenCompraPaginatedResponse> {
    return this.listOrdenComprasPaginated({
      obras: [obraId],
      page,
      limit
    });
  }

  /**
   * Obtener órdenes de compra por estado
   */
  async getOrdenesComprasPorEstado(estados: string[], page: number = 1, limit: number = 10): Promise<OrdenCompraPaginatedResponse> {
    return this.listOrdenComprasPaginated({
      estados,
      page,
      limit
    });
  }

  /**
   * Buscar órdenes de compra por término de búsqueda
   */
  async buscarOrdenesCompras(searchTerm: string, page: number = 1, limit: number = 10): Promise<OrdenCompraPaginatedResponse> {
    return this.listOrdenComprasPaginated({
      searchTerm,
      page,
      limit
    });
  }

  /**
   * Obtener órdenes de compra por rango de fechas
   */
  async getOrdenesComprasPorFechas(fechaInicio: string, fechaFin: string, page: number = 1, limit: number = 10): Promise<OrdenCompraPaginatedResponse> {
    return this.listOrdenComprasPaginated({
      fechaInicio,
      fechaFin,
      page,
      limit
    });
  }
}
