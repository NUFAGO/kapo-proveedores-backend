import { IResolvers } from '@graphql-tools/utils';
import { ArchivoSustentoProveedorService } from '../../../aplicacion/servicios/ArchivoSustentoProveedorService';
import { ErrorHandler } from './ErrorHandler';

export class ArchivoSustentoProveedorResolver {
  constructor(private readonly service: ArchivoSustentoProveedorService) {}

  getResolvers(): IResolvers {
    return {
      Query: {
        getArchivosSustentoProveedor: (_: unknown, { referencia_id, tipo }: { referencia_id: string; tipo: string }) =>
          ErrorHandler.handleError(
            () => this.service.getFiles(referencia_id, tipo),
            'getArchivosSustentoProveedor',
            { referencia_id, tipo }
          ),
      },
      Mutation: {
        registrarArchivoSustentoProveedor: (_: unknown, args: { url: string; referencia_id: string; tipo: string }) =>
          ErrorHandler.handleError(
            () => this.service.registrar(args),
            'registrarArchivoSustentoProveedor',
            { referencia_id: args.referencia_id, tipo: args.tipo }
          ),
        eliminarArchivoSustentoProveedor: (_: unknown, { id }: { id: string }) =>
          ErrorHandler.handleError(
            () => this.service.eliminar(id),
            'eliminarArchivoSustentoProveedor',
            { id }
          ),
      },
    };
  }
}
