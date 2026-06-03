import { IResolvers } from '@graphql-tools/utils';
import { RucService } from '../../../aplicacion/servicios/RucService';
import { ErrorHandler } from './ErrorHandler';

/**
 * Resolver de consulta de RUC. Mismo contrato que inacons: consultarRuc(numeroDocumento).
 */
export class RucResolver {
  constructor(private readonly service: RucService) {}

  getResolvers(): IResolvers {
    return {
      Query: {
        consultarRuc: (_: unknown, { numeroDocumento }: { numeroDocumento: string }) =>
          ErrorHandler.handleError(
            () => this.service.consultarRuc(numeroDocumento),
            'consultarRuc',
            { numeroDocumento }
          ),
      },
    };
  }
}
