// ============================================================================
// GUARDIAS DE GRAPHQL
// ============================================================================

import { JWTUtils } from './JWTUtils';
import { logger } from '../logging';

export interface GraphQLContext {
  req?: {
    headers?: Record<string, string | string[] | undefined> & {
      authorization?: string;
    };
  };
  user?: any;
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
      // Extraer token del contexto
      const token = context.req?.headers?.authorization 
        ? JWTUtils.extractTokenFromHeader(context.req.headers.authorization)
        : null;

      // Si no hay token y no es requerido, continuar sin autenticación
      if (!token && !required) {
        logger.debug('No se proporcionó token, pero no es requerido en GraphQL');
        return await resolver(parent, args, context, info);
      }

      // Si no hay token y es requerido, rechazar
      if (!token) {
        logger.warn('Token no proporcionado en petición GraphQL', {
          operation: info.operation?.name?.value || 'desconocida',
          fieldName: info.fieldName
        });
        throw new Error('AUTENTICACION_REQUERIDA: Token de autenticación requerido');
      }

      // Validar el token
      const payload = JWTUtils.validateToken(token);

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
