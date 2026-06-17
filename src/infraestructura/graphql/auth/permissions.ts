// ============================================================================
// AUTORIZACIÓN GRAPHQL (graphql-shield) — alineado con kapo-autentificacion
// ============================================================================
// Catch-all que exige CONTEXTO de usuario, con DOS orígenes válidos:
//   · ADMIN: token RS256 del IAM (claims con sid) + sistema correcto. El MS NO
//     valida la firma (eso es del gateway); solo decodifica claims.
//   · PROVEEDOR: usuario externo (NO está en el IAM) autenticado LOCAL (JWTUtils
//     HS256). El context ya validó/pobló `user.tipo_usuario === 'proveedor'`.
// Las mutaciones de login proveedor son PÚBLICAS (sin token).
// Códigos de error para que el front reaccione (refresh / toast / login).

import { rule, shield, allow } from 'graphql-shield';
import { GraphQLError } from 'graphql';

import { AuthClaims } from '../../../dominio/seguridad/AuthClaims';
import { ConfigService } from '../../config/ConfigService';

export interface ProveedoresAuthContext {
  req?: unknown;
  token?: string;
  /** Claims del token IAM (admin). Null si no es un token IAM. */
  usuarioAuth?: AuthClaims | null;
  /** Usuario resuelto: admin (desde claims) o proveedor (local). */
  user?: { id?: string; tipo_usuario?: 'admin' | 'proveedor'; proveedor_id?: string | null } | null;
  /** Motivo cuando NO hay auth válido: TOKEN_EXPIRADO | TOKEN_INVALIDO | undefined */
  authMotivo?: string;
}

function errorNoAutenticado(ctx: ProveedoresAuthContext): GraphQLError {
  const code = ctx.authMotivo ?? 'UNAUTHENTICATED';
  const msg =
    code === 'TOKEN_EXPIRADO'
      ? 'Tu sesión expiró. Renueva tus credenciales.'
      : code === 'TOKEN_INVALIDO'
        ? 'Credenciales inválidas. Renueva tus credenciales.'
        : 'No autenticado.';
  return new GraphQLError(msg, { extensions: { code } });
}

/** Autenticado: admin del IAM (sistema correcto) O proveedor local válido. */
const isAuthenticated = (sistemaCodigo: string) =>
  rule({ cache: 'contextual' })(async (_p, _a, ctx: ProveedoresAuthContext) => {
    const u = ctx.usuarioAuth;
    if (u?.sid) {
      if (u.sistema && u.sistema !== sistemaCodigo) {
        return new GraphQLError('Token de otro sistema.', {
          extensions: { code: 'SIN_PERMISO' },
        });
      }
      return true;
    }
    // Proveedor externo (autenticado local, no IAM)
    if (ctx.user?.tipo_usuario === 'proveedor') return true;
    return errorNoAutenticado(ctx);
  });

/** Permiso del token del IAM (solo aplica a admin; UX/poda). */
export const hasPermission = (permiso: string) =>
  rule({ cache: 'contextual' })(async (_p, _a, ctx: ProveedoresAuthContext) => {
    const u = ctx.usuarioAuth;
    if (u?.sid) {
      if (Array.isArray(u.permisos) && u.permisos.includes(permiso)) return true;
      return new GraphQLError('No tienes permiso para esta acción.', {
        extensions: { code: 'SIN_PERMISO' },
      });
    }
    if (ctx.user?.tipo_usuario === 'proveedor') return true;
    return errorNoAutenticado(ctx);
  });

export function buildPermissions(config: ConfigService) {
  const sistema = config.getSistemaCodigo();
  const protegerTodo = isAuthenticated(sistema);

  return shield(
    {
      Query: {
        '*': protegerTodo,
      },
      Mutation: {
        '*': protegerTodo,
        // Auth proveedor (externo) — PÚBLICAS (no requieren token).
        loginProveedor: allow,
        refreshTokenProveedor: allow,
        verifyTokenProveedor: allow,
        // login/loginAdmin ELIMINADOS — identidad admin vía gateway→auth.
      },
    },
    {
      fallbackRule: allow, // tipos hijos (Usuario, etc.)
      allowExternalErrors: true,
    },
  );
}
