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
            // `user.role` en el contexto es el CÓDIGO del rol (string), no un
            // objeto `{ nombre }`. Antes se pasaba `user.role?.nombre` → siempre
            // `undefined`, por lo que la regla "conta" nunca acertaba. Pasamos el
            // código directo: el regex "conta" también matchea códigos de rol.
            const roleNombre =
              typeof user.role === 'string' ? user.role : user.role?.nombre;
            // La jerarquía del cargo YA viene en los claims del token
            // (decodificados en el contexto como `usuarioAuth`). Se pasa directo
            // para evitar llamar a auth `getUsuarioById` (exige token de usuario
            // → "Acceso denegado" en llamada M2M) y ahorrar un viaje de red.
            const claims = (context as GraphQLContext & {
              usuarioAuth?: { cargo?: { gerarquia?: number } };
            }).usuarioAuth;
            const cargoGerarquiaClaim = claims?.cargo?.gerarquia ?? null;
            return ErrorHandler.handleError(
              () =>
                this.usuarioExternoService.puedeAprobarProveedorKanban(
                  user.id,
                  roleNombre,
                  cargoGerarquiaClaim
                ),
              'puedeAprobarProveedorKanban'
            );
          }
        ),
      },
    };
  }
}
