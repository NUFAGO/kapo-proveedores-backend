import { IResolvers } from '@graphql-tools/utils';
import { ComentarioProveedorService } from '../../../aplicacion/servicios/ComentarioProveedorService';
import { ErrorHandler } from './ErrorHandler';

export class ComentarioProveedorResolver {
  constructor(private readonly service: ComentarioProveedorService) {}

  getResolvers(): IResolvers {
    return {
      Query: {
        listComentariosProveedor: (_: unknown, { referencia_id, tabla }: { referencia_id: string; tabla?: string }) =>
          ErrorHandler.handleError(
            () => this.service.listComentarios(referencia_id, tabla),
            'listComentariosProveedor',
            { referencia_id, tabla }
          ),
      },
      Mutation: {
        addComentarioProveedor: (
          _: unknown,
          args: { referencia_id: string; tabla: string; comentario: string; usuario_id?: string; usuario_nombre?: string }
        ) =>
          ErrorHandler.handleError(
            () => this.service.agregarComentario(args),
            'addComentarioProveedor',
            { referencia_id: args.referencia_id, tabla: args.tabla }
          ),
      },
    };
  }
}
