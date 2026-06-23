// ============================================================================
// GUARDIAS DE GRAPHQL
// ============================================================================

import { JWTUtils, type JWTPayload } from './JWTUtils';
import { logger } from '../logging';
import { ServiceIntegrationAuthRules } from '../../dominio/servicios/ServiceIntegrationAuthRules';

type JWTPayloadLike = JWTPayload;

export interface GraphQLContext {
  req?: {
    headers?: Record<string, string | string[] | undefined> & {
      authorization?: string;
      'x-service-token'?: string;
    };
  };
  user?: any;
  token?: string;
  serviceToken?: string;
}

export interface GraphQLGuardOptions {
  required?: boolean;
  allowedTypes?: ('admin' | 'proveedor')[];
  requireProveedorAccess?: boolean;
  proveedorIdField?: string;
}

// Tipo para resolver GraphQL compatible
type GraphQLResolverFunction = (
  parent: any,
  args: any,
  context: GraphQLContext,
  info: any
) => Promise<any>;

/**
 * Guardia de GraphQL para autenticación JWT - Versión final sin errores
 */
export const authGuard = (
  resolver: GraphQLResolverFunction,
  options: GraphQLGuardOptions = {}
): GraphQLResolverFunction => {
  const {
    required = true,
    allowedTypes = ['admin', 'proveedor'],
    requireProveedorAccess = false,
    proveedorIdField = 'proveedor_id'
  } = options;

  return async (parent: any, args: any, context: GraphQLContext, info: any): Promise<any> => {
    try {
      // El usuario YA viene resuelto en el context (server.ts): admin desde los
      // claims del IAM (token RS256 ya validado por el gateway) o proveedor
      // desde su token local (HS256 validado en el context). El guard ya NO
      // re-valida el token — solo aplica la autorización fina de negocio.
      const payload = context.user as JWTPayloadLike | undefined;

      // Si no hay usuario y no es requerido, continuar sin autenticación
      if (!payload && !required) {
        logger.debug('No hay usuario en contexto, pero no es requerido en GraphQL');
        return await resolver(parent, args, context, info);
      }

      // Si no hay usuario y es requerido, rechazar
      if (!payload) {
        logger.warn('Usuario no autenticado en petición GraphQL', {
          operation: info.operation?.name?.value || 'desconocida',
          fieldName: info.fieldName
        });
        throw new Error('AUTENTICACION_REQUERIDA: Token de autenticación requerido');
      }

      // Verificar tipo de usuario permitido
      if (!allowedTypes.includes(payload.tipo_usuario)) {
        logger.warn('Tipo de usuario no permitido en GraphQL', {
          tipo_usuario: payload.tipo_usuario,
          allowedTypes,
          userId: payload.id,
          operation: info.operation?.name?.value
        });
        throw new Error('AUTORIZACION_DENEGADA: Tipo de usuario no autorizado para esta operación');
      }

      // Verificar acceso a proveedor si es requerido
      if (requireProveedorAccess) {
        const targetProveedorId = args[proveedorIdField] || parent?.[proveedorIdField];
        
        if (!targetProveedorId) {
          logger.warn('ID de proveedor no especificado para operación que lo requiere', {
            operation: info.operation?.name?.value,
            fieldName: info.fieldName
          });
          throw new Error('SOLICITUD_INVALIDA: ID de proveedor requerido para esta operación');
        }

        if (!JWTUtils.canAccessProveedor(payload, targetProveedorId as string)) {
          logger.warn('Intento de acceso no autorizado a proveedor en GraphQL', {
            userId: payload.id,
            tipo_usuario: payload.tipo_usuario,
            userProveedorId: payload.proveedor_id,
            targetProveedorId,
            operation: info.operation?.name?.value
          });
          throw new Error('AUTORIZACION_DENEGADA: No tienes acceso a este proveedor');
        }
      }

      // Agregar información del usuario al contexto
      context.user = payload;

      logger.debug('Usuario autenticado exitosamente en GraphQL', {
        userId: payload.id,
        tipo_usuario: payload.tipo_usuario,
        proveedor_id: payload.proveedor_id,
        operation: info.operation?.name?.value,
        fieldName: info.fieldName
      });

      // Ejecutar el resolver original
      return await resolver(parent, args, context, info);
    } catch (error) {
      // Si el error ya es de autenticación/autorización, relanzarlo directamente
      if (error instanceof Error && (
        error.message.includes('AUTENTICACION_REQUERIDA') ||
        error.message.includes('AUTORIZACION_DENEGADA') ||
        error.message.includes('SOLICITUD_INVALIDA') ||
        error.message.includes('inválido') ||
        error.message.includes('expirado')
      )) {
        // Error de autenticación, lanzar sin envolver
        throw error;
      }

      // Si es un error de negocio específico (Ya existe, no encontrado, etc.), lanzarlo directamente
      if (error instanceof Error && (
        error.message.includes('Ya existe') ||
        error.message.includes('no encontrado') ||
        error.message.includes('inválido') ||
        error.message.includes('No se pudo ejecutar')
      )) {
        // Error de negocio específico, lanzar sin envolver
        throw error;
      }

      // Manejar errores de JWT específicos
      if (error instanceof Error) {
        if (error.message.includes('expirado')) {
          logger.warn('Token JWT expirado en GraphQL', {
            operation: info.operation?.name?.value,
            fieldName: info.fieldName
          });
          throw new Error('AUTENTICACION_REQUERIDA: Token expirado');
        } else if (error.message.includes('inválido')) {
          logger.warn('Token JWT inválido en GraphQL', {
            operation: info.operation?.name?.value,
            fieldName: info.fieldName
          });
          throw new Error('AUTENTICACION_REQUERIDA: Token inválido');
        }
      }

      logger.error('Error en guardia de autenticación GraphQL', {
        error: error instanceof Error ? error.message : String(error),
        operation: info.operation?.name?.value,
        fieldName: info.fieldName
      });

      throw new Error('AUTENTICACION_REQUERIDA: Error en la autenticación');
    }
  };
};

/**
 * Guardia específico para administradores
 */
export const adminGuard = (
  resolver: GraphQLResolverFunction
): GraphQLResolverFunction => {
  return authGuard(resolver, {
    required: true,
    allowedTypes: ['admin']
  });
};

/**
 * Guardia específico para proveedores
 */
export const proveedorGuard = (
  resolver: GraphQLResolverFunction
): GraphQLResolverFunction => {
  return authGuard(resolver, {
    required: true,
    allowedTypes: ['proveedor']
  });
};

/**
 * Guardia para operaciones que requieren acceso a un proveedor específico
 */
export const proveedorAccessGuard = (
  resolver: GraphQLResolverFunction,
  proveedorIdField: string = 'proveedor_id'
): GraphQLResolverFunction => {
  return authGuard(resolver, {
    required: true,
    allowedTypes: ['admin', 'proveedor'],
    requireProveedorAccess: true,
    proveedorIdField
  });
};

/**
 * Guardia opcional (no requiere token pero lo procesa si existe)
*/
export const optionalAuthGuard = (
  resolver: GraphQLResolverFunction
): GraphQLResolverFunction => {
  return authGuard(resolver, {
    required: false
  });
};

function resolveServiceToken(context: GraphQLContext): string | undefined {
  const headerToken = context.serviceToken?.trim()
    || (typeof context.req?.headers?.['x-service-token'] === 'string'
      ? context.req.headers['x-service-token'].trim()
      : undefined);
  if (headerToken) return headerToken;
  const bearer = context.req?.headers?.authorization
    ? JWTUtils.extractTokenFromHeader(context.req.headers.authorization)
    : null;
  return bearer?.trim() || undefined;
}

/**
 * Guardia M2M — Pagos/Compras con `X-Service-Token` o Bearer service token.
 * Si `PROVEEDORES_SERVICE_TOKEN` no está configurado, permite (dev local).
 */
export const serviceTokenGuard = (
  resolver: GraphQLResolverFunction,
): GraphQLResolverFunction => {
  return async (parent: any, args: any, context: GraphQLContext, info: any): Promise<any> => {
    ServiceIntegrationAuthRules.assertProveedoresServiceToken(resolveServiceToken(context));
    return resolver(parent, args, context, info);
  };
};
