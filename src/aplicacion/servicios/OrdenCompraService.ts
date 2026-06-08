import { IOrdenCompraRepository, OrdenCompraFilter, OrdenCompraPaginatedResponse } from '../../dominio/repositorios/IOrdenCompraRepository';
import {
  collectProveedorIdsFromComprasRows,
  mapComprasRowToProveedoresOc,
  type ComprasOrdenCompraRow,
} from '../../dominio/servicios/OrdenCompraComprasMapper';
import { HttpOrdenCompraRepository } from '../../infraestructura/persistencia/http/HttpOrdenCompraRepository';
import { logger } from '../../infraestructura/logging';
import type { ProveedorService } from './ProveedorService';

/**
 * Consume Órdenes de Compra desde Kapo-Compras y las adapta al shape legacy del FE Proveedores.
 */
export class OrdenCompraService {
  private repository: IOrdenCompraRepository;
  private readonly proveedorService: ProveedorService | undefined;

  constructor(repository?: IOrdenCompraRepository, proveedorService?: ProveedorService) {
    this.repository = repository || new HttpOrdenCompraRepository();
    this.proveedorService = proveedorService;
  }

  async listOrdenComprasPaginated(filter?: OrdenCompraFilter): Promise<OrdenCompraPaginatedResponse> {
    try {
      logger.info('Consumiendo listOrdenComprasPaginated de Kapo-Compras', { filter });

      const result = await this.repository.listOrdenComprasPaginated(filter);
      const enriched = await this.enriquecerFilas(result.data as ComprasOrdenCompraRow[]);

      logger.info('Respuesta obtenida de listOrdenComprasPaginated (Compras)', {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        dataCount: enriched.length,
      });

      return {
        ...result,
        data: enriched,
      };
    } catch (error) {
      logger.error('Error consumiendo listOrdenComprasPaginated de Kapo-Compras', {
        error: error instanceof Error ? error.message : String(error),
        filter,
      });
      throw error;
    }
  }

  private async enriquecerFilas(rows: ComprasOrdenCompraRow[]): Promise<Record<string, unknown>[]> {
    if (!rows.length) return [];

    const proveedorById = new Map<string, import('../../dominio/entidades/Proveedor').Proveedor>();
    if (this.proveedorService) {
      const ids = collectProveedorIdsFromComprasRows(rows);
      const proveedores = await this.proveedorService.obtenerProveedoresPorIds(ids);
      for (const p of proveedores) {
        proveedorById.set(p.id, p);
      }
    }

    return rows.map((row) => mapComprasRowToProveedoresOc(row, proveedorById));
  }

  async getOrdenesComprasPorObra(obraId: string, page: number = 1, limit: number = 10): Promise<OrdenCompraPaginatedResponse> {
    return this.listOrdenComprasPaginated({
      obras: [obraId],
      page,
      limit,
    });
  }

  async getOrdenesComprasPorEstado(estados: string[], page: number = 1, limit: number = 10): Promise<OrdenCompraPaginatedResponse> {
    return this.listOrdenComprasPaginated({
      estados,
      page,
      limit,
    });
  }

  async buscarOrdenesCompras(searchTerm: string, page: number = 1, limit: number = 10): Promise<OrdenCompraPaginatedResponse> {
    return this.listOrdenComprasPaginated({
      searchTerm,
      page,
      limit,
    });
  }

  async getOrdenesComprasPorFechas(
    fechaInicio: string,
    fechaFin: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<OrdenCompraPaginatedResponse> {
    return this.listOrdenComprasPaginated({
      fechaInicio,
      fechaFin,
      page,
      limit,
    });
  }
}
