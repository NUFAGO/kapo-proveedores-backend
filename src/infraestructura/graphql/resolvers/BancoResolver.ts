import { IResolvers } from '@graphql-tools/utils';
import { BancoService } from '../../../aplicacion/servicios/BancoService';
import { ErrorHandler } from './ErrorHandler';

/**
 * Resolver de Banco. Nombres idénticos al contrato de inacons.
 * Delega toda la lógica al servicio de aplicación.
 */
export class BancoResolver {
  constructor(private readonly service: BancoService) {}

  getResolvers(): IResolvers {
    return {
      Query: {
        listBancos: () =>
          ErrorHandler.handleError(() => this.service.listBancos(), 'listBancos', {}),
        getBancoById: (_: unknown, { id }: { id: string }) =>
          ErrorHandler.handleError(() => this.service.getBancoById(id), 'getBancoById', { id }),
      },
      Mutation: {
        addBanco: (_: unknown, args: { nombre: string; abreviatura: string }) =>
          ErrorHandler.handleError(() => this.service.addBanco(args), 'addBanco', args),
        updateBanco: (_: unknown, { id, ...rest }: { id: string; nombre?: string; abreviatura?: string }) =>
          ErrorHandler.handleError(() => this.service.updateBanco(id, rest), 'updateBanco', { id }),
        deleteBanco: (_: unknown, { id }: { id: string }) =>
          ErrorHandler.handleError(() => this.service.deleteBanco(id), 'deleteBanco', { id }),
      },
    };
  }
}
