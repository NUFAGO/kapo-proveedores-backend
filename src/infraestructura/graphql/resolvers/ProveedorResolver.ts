import { IResolvers } from '@graphql-tools/utils';
import { ProveedorService } from '../../../aplicacion/servicios/ProveedorService';
import { ProveedorInput, ProveedorPaginationInput } from '../../../dominio/entidades/Proveedor';
import { ErrorHandler } from './ErrorHandler';

/**
 * Resolver de Proveedor. Nombres y campos idénticos al contrato de inacons.
 * Consume el ProveedorService (datos propios en Mongo).
 */
export class ProveedorResolver {
  constructor(private readonly proveedorService: ProveedorService) {}

  getResolvers(): IResolvers {
    return {
      Query: {
        listProveedor: () =>
          ErrorHandler.handleError(
            () => this.proveedorService.listarProveedores(),
            'listProveedor',
            {}
          ),
        listProveedoresPaginated: (_: unknown, { filter }: { filter?: ProveedorPaginationInput }) =>
          ErrorHandler.handleError(
            () => this.proveedorService.listarProveedoresPaginados(filter),
            'listProveedoresPaginated',
            { filter }
          ),
        getProveedorById: (_: unknown, { id }: { id: string }) =>
          ErrorHandler.handleError(
            () => this.proveedorService.obtenerProveedorPorId(id),
            'getProveedorById',
            { id }
          ),
        getProveedoresByIds: (_: unknown, { ids }: { ids: string[] }) =>
          ErrorHandler.handleError(
            () => this.proveedorService.obtenerProveedoresPorIds(ids),
            'getProveedoresByIds',
            { count: Array.isArray(ids) ? ids.length : 0 }
          ),
        getProveedorByRuc: (_: unknown, { ruc }: { ruc: string }) =>
          ErrorHandler.handleError(
            () => this.proveedorService.buscarProveedorPorRuc(ruc),
            'getProveedorByRuc',
            { ruc }
          ),
        listProveedoresSubContrata: () =>
          ErrorHandler.handleError(
            () => this.proveedorService.listarProveedoresSubContrata(),
            'listProveedoresSubContrata',
            {}
          ),
        getEstadisticasCotizaciones: (_: unknown, { proveedorId }: { proveedorId: string }) =>
          ErrorHandler.handleError(
            () => this.proveedorService.obtenerEstadisticasCotizaciones(proveedorId),
            'getEstadisticasCotizaciones',
            { proveedorId }
          ),
      },
      Mutation: {
        addProveedor: (_: unknown, args: ProveedorInput) =>
          ErrorHandler.handleError(
            () => this.proveedorService.crearProveedor(args),
            'addProveedor',
            { ruc: args.ruc }
          ),
        updateProveedor: (_: unknown, { id, ...rest }: { id: string } & ProveedorInput) =>
          ErrorHandler.handleError(
            () => this.proveedorService.actualizarProveedor(id, rest),
            'updateProveedor',
            { id }
          ),
        deleteProveedor: (_: unknown, { id }: { id: string }) =>
          ErrorHandler.handleError(
            () => this.proveedorService.eliminarProveedor(id),
            'deleteProveedor',
            { id }
          ),
      },
    };
  }
}
