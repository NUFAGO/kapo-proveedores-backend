import { IResolvers } from '@graphql-tools/utils';
import { OrdenCompraService } from '../../../aplicacion/servicios/OrdenCompraService';
import { BaseResolver } from './BaseResolver';
import { ErrorHandler } from './ErrorHandler';

/**
 * Resolver para consumir Órdenes de Compra del inacons-backend
 * Expone el endpoint listOrdenComprasPaginated en el GraphQL de kapo-proveedores-backend
 */
export class OrdenCompraResolver extends BaseResolver<any> {
  constructor(private readonly ordenCompraService: OrdenCompraService) {
    super(ordenCompraService as any);
  }

  /**
   * Implementa los resolvers para consultas de órdenes de compra
   */
  override getResolvers(): IResolvers {
    return {
      Query: {
        listOrdenComprasPaginated: async (_: any, { filter }: { filter?: any }) => {
          return await ErrorHandler.handleError(
            async () => {
              return await this.ordenCompraService.listOrdenComprasPaginated(filter);
            },
            'listOrdenComprasPaginated',
            { filter }
          );
        },
      },
    };
  }

  /**
   * Método abstracto requerido por BaseResolver
   */
  protected getEntityName(): string {
    return 'OrdenCompra';
  }
}
