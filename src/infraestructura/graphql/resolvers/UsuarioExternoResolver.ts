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
            // Rol y jerarquía se leen de los CLAIMS del token (ya decodificados
            // en el contexto como `usuarioAuth`), NO de auth: `getUsuarioById` /
            // `getUsuariosByRolCargo` exigen sesión o secreto interno que esta
            // llamada directa no tiene (→ "Acceso denegado"). `user.role` es el
            // CÓDIGO del rol (string); el regex "conta" también matchea códigos.
            const claims = (context as GraphQLContext & {
              usuarioAuth?: { rol?: string; cargo?: { gerarquia?: number } };
            }).usuarioAuth;
            const roleNombre =
              (typeof user.role === 'string' ? user.role : user.role?.nombre) ??
              claims?.rol ??
              null;
            const cargoGerarquia = claims?.cargo?.gerarquia ?? null;
            return ErrorHandler.handleError(
              () =>
                this.usuarioExternoService.puedeAprobarProveedorKanban(
                  user.id,
                  roleNombre,
                  cargoGerarquia
                ),
              'puedeAprobarProveedorKanban'
            );
          }
        ),
      },
    };
  }
}
