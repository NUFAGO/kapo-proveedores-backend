// ============================================================================
// MIDDLEWARE DE AUTENTICACIÓN JWT
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { JWTUtils, JWTPayload } from './JWTUtils';
import { logger } from '../logging';

// Extender la interfaz Request para incluir información del usuario
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export interface AuthMiddlewareOptions {
  required?: boolean; // Si es false, permite continuar sin token
  allowedTypes?: ('admin' | 'proveedor')[]; // Tipos de usuario permitidos
}

/**
 * Middleware de autenticación JWT
 * Valida el token y extrae la información del usuario
 */
export const authMiddleware = (options: AuthMiddlewareOptions = {}) => {
  const {
    required = true,
    allowedTypes = ['admin', 'proveedor']
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Extraer token del header
      const token = JWTUtils.extractTokenFromHeader(req.headers.authorization);

      // Si no hay token y no es requerido, continuar sin autenticación
      if (!token && !required) {
        logger.debug('No se proporcionó token, pero no es requerido');
        next();
        return;
      }

      // Si no hay token y es requerido, rechazar
      if (!token) {
        logger.warn('Token no proporcionado en petición', {
          path: req.path,
          method: req.method,
          ip: req.ip
        });
        res.status(401).json({
          error: 'No autorizado',
          message: 'Token de autenticación requerido'
        });
        return;
      }

      // Validar el token
      const payload = JWTUtils.validateToken(token);

      // Verificar tipo de usuario permitido
      if (!allowedTypes.includes(payload.tipo_usuario)) {
        logger.warn('Tipo de usuario no permitido', {
          tipo_usuario: payload.tipo_usuario,
          allowedTypes,
          userId: payload.id
        });
        res.status(403).json({
          error: 'Prohibido',
          message: 'Tipo de usuario no autorizado para esta operación'
        });
        return;
      }

      // Agregar información del usuario al request
      req.user = payload;

      logger.debug('Usuario autenticado exitosamente', {
        userId: payload.id,
        tipo_usuario: payload.tipo_usuario,
        proveedor_id: payload.proveedor_id,
        path: req.path
      });

      next();
    } catch (error) {
      logger.error('Error en middleware de autenticación', {
        error: error instanceof Error ? error.message : String(error),
        path: req.path,
        method: req.method
      });

      if (error instanceof Error) {
        if (error.message.includes('expirado')) {
          res.status(401).json({
            error: 'No autorizado',
            message: 'Token expirado'
          });
          return;
        } else if (error.message.includes('inválido')) {
          res.status(401).json({
            error: 'No autorizado',
            message: 'Token inválido'
          });
          return;
        }
      }

      res.status(401).json({
        error: 'No autorizado',
        message: 'Error en la autenticación'
      });
    }
  };
};

/**
 * Middleware específico para administradores
 */
export const adminOnly = authMiddleware({
  required: true,
  allowedTypes: ['admin']
});

/**
 * Middleware específico para proveedores
 */
export const proveedorOnly = authMiddleware({
  required: true,
  allowedTypes: ['proveedor']
});

/**
 * Middleware opcional (no requiere token pero lo procesa si existe)
 */
export const optionalAuth = authMiddleware({
  required: false
});

/**
 * Middleware que verifica si el usuario puede acceder a un proveedor específico
 */
export const proveedorAccessMiddleware = (proveedorIdParam: string = 'proveedor_id') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        res.status(401).json({
          error: 'No autorizado',
          message: 'Usuario no autenticado'
        });
        return;
      }

      const targetProveedorId = req.params[proveedorIdParam] || req.body[proveedorIdParam] || req.query[proveedorIdParam];

      if (!targetProveedorId) {
        res.status(400).json({
          error: 'Solicitud inválida',
          message: 'ID de proveedor no especificado'
        });
        return;
      }

      if (!JWTUtils.canAccessProveedor(req.user, targetProveedorId as string)) {
        logger.warn('Intento de acceso no autorizado a proveedor', {
          userId: req.user.id,
          tipo_usuario: req.user.tipo_usuario,
          userProveedorId: req.user.proveedor_id,
          targetProveedorId,
          path: req.path
        });

        res.status(403).json({
          error: 'Prohibido',
          message: 'No tienes acceso a este proveedor'
        });
        return;
      }

      logger.debug('Acceso a proveedor autorizado', {
        userId: req.user.id,
        tipo_usuario: req.user.tipo_usuario,
        targetProveedorId
      });

      next();
    } catch (error) {
      logger.error('Error en middleware de acceso a proveedor', {
        error: error instanceof Error ? error.message : String(error)
      });

      res.status(500).json({
        error: 'Error interno',
        message: 'Error al verificar acceso al proveedor'
      });
    }
  };
};
