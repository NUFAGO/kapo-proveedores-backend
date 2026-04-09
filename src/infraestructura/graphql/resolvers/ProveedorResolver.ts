import { IResolvers } from '@graphql-tools/utils';
import { ProveedorService } from '../../../aplicacion/servicios/ProveedorService';
import { BaseResolver } from './BaseResolver';
import { ErrorHandler } from './ErrorHandler';

/**
 * Resolver para consumir Proveedores del inacons-backend
 * Expone los endpoints de proveedores en el GraphQL de kapo-proveedores-backend
 */
export class ProveedorResolver extends BaseResolver<any> {
  constructor(private readonly proveedorService: ProveedorService) {
    super(proveedorService as any);
  }

  /**
   * Implementa los resolvers para consultas y mutaciones de proveedores
   */
  override getResolvers(): IResolvers {
    return {
      Query: {
        // Listar todos los proveedores con relaciones completas
        listProveedor: async () => {
          return await ErrorHandler.handleError(
            async () => {
              return await this.proveedorService.listarProveedores();
            },
            'listProveedor',
            {}
          );
        },

        // Listar proveedores paginados con filtros
        listProveedoresPaginated: async (_: any, { filter }: { filter?: Record<string, any> }) => {
          return await ErrorHandler.handleError(
            async () => {
              return await this.proveedorService.listarProveedoresPaginados(filter);
            },
            'listProveedoresPaginated',
            { filter }
          );
        },

        // Obtener proveedor por ID con relaciones completas
        getProveedorById: async (_: any, { id }: { id: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              return await this.proveedorService.obtenerProveedorPorId(id);
            },
            'getProveedorById',
            { id }
          );
        },

        // Buscar proveedor por RUC
        getProveedorByRuc: async (_: any, { ruc }: { ruc: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              return await this.proveedorService.buscarProveedorPorRuc(ruc);
            },
            'getProveedorByRuc',
            { ruc }
          );
        },

        // Listar proveedores con subcontratación habilitada
        listProveedoresSubContrata: async () => {
          return await ErrorHandler.handleError(
            async () => {
              return await this.proveedorService.listarProveedoresSubContrata();
            },
            'listProveedoresSubContrata',
            {}
          );
        },

        // Obtener estadísticas de cotizaciones por proveedor
        getEstadisticasCotizaciones: async (_: any, { proveedorId }: { proveedorId: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              return await this.proveedorService.obtenerEstadisticasCotizaciones(proveedorId);
            },
            'getEstadisticasCotizaciones',
            { proveedorId }
          );
        },
      },

      Mutation: {
        // Crear nuevo proveedor
        addProveedor: async (_: any, { input }: { input: any }) => {
          return await ErrorHandler.handleError(
            async () => {
              return await this.proveedorService.crearProveedor(input);
            },
            'addProveedor',
            { input }
          );
        },

        // Actualizar proveedor existente
        updateProveedor: async (_: any, { id, input }: { id: string; input: any }) => {
          return await ErrorHandler.handleError(
            async () => {
              return await this.proveedorService.actualizarProveedor(id, input);
            },
            'updateProveedor',
            { id, input }
          );
        },

        // Eliminar proveedor
        deleteProveedor: async (_: any, { id }: { id: string }) => {
          return await ErrorHandler.handleError(
            async () => {
              return await this.proveedorService.eliminarProveedor(id);
            },
            'deleteProveedor',
            { id }
          );
        },
      },
    };
  }

  /**
   * Método abstracto requerido por BaseResolver
   */
  protected getEntityName(): string {
    return 'Proveedor';
  }
}
