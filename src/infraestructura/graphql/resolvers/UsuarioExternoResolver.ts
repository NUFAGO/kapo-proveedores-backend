import { IResolvers } from '@graphql-tools/utils';
import { UsuarioExternoService } from '../../../aplicacion/servicios/UsuarioExternoService';
import { adminGuard, type GraphQLContext } from '../../auth/GraphQLGuards';
import { ErrorHandler } from './ErrorHandler';

export class UsuarioExternoResolver {
  constructor(private readonly usuarioExternoService: UsuarioExternoService) {}

  getResolvers(): IResolvers {
    return {
      Query: {
        getUsuario: adminGuard(async (_: unknown, { id }: { id: string }) => {
          return ErrorHandler.handleError(
            () => this.usuarioExternoService.getUsuario(id),
            'getUsuario',
            { id }
          );
        }),
        getUsuariosByRolCargo: adminGuard(
          async (
            _: unknown,
            { jerarquia, rolRegex }: { jerarquia?: number; rolRegex?: string }
          ) => {
            return ErrorHandler.handleError(
              () =>
                this.usuarioExternoService.getUsuariosByRolCargo(jerarquia, rolRegex),
              'getUsuariosByRolCargo',
              { jerarquia, rolRegex }
            );
          }
        ),
        listarAprobadoresProveedorKanban: adminGuard(async () => {
          return ErrorHandler.handleError(
            () => this.usuarioExternoService.listarAprobadoresProveedorKanban(),
            'listarAprobadoresProveedorKanban'
          );
        }),
        puedeAprobarProveedorKanban: adminGuard(
          async (_: unknown, __args: unknown, context: GraphQLContext) => {
            const user = context.user;
            if (!user?.id) return false;
            return ErrorHandler.handleError(
              () =>
                this.usuarioExternoService.puedeAprobarProveedorKanban(user.id),
              'puedeAprobarProveedorKanban'
            );
          }
        ),
      },
    };
  }
}
