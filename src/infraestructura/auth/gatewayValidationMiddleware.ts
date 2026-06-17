// ============================================================================
// MIDDLEWARE - Validación de origen gateway (X-Gateway-Secret)
// ============================================================================
// Bloquea el acceso DIRECTO a /graphql cuando REQUIRE_GATEWAY_SECRET=true:
// solo el kapo-gateway (que inyecta X-Gateway-Secret) puede llegar. En dev se
// deja en false; en producción se activa junto con red privada.
//
// EXCEPCIÓN PROVEEDOR (propia de este MS): los proveedores externos NO están en
// kapo-autentificacion (no tienen token RS256 del IAM) — se autentican LOCAL
// (JWTUtils HS256) y pegan al backend directo, no por el gateway. Ese tráfico
// debe pasar aunque no traiga X-Gateway-Secret: si el bearer es un token
// proveedor local válido, se permite. La autorización fina la hacen el shield
// y los guards. El flujo ADMIN (interno) sí entra por el gateway (RS256).

import type { NextFunction, Request, Response } from 'express';

import type { ConfigService } from '../config/ConfigService';
import { JWTUtils } from './JWTUtils';
import { logger } from '../logging';

export function createGatewayValidationMiddleware(config: ConfigService) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!config.requireGatewaySecret()) {
      return next();
    }

    const secretEsperado = config.getInternalGatewaySecret();
    const secretRecibido = req.headers['x-gateway-secret'];

    if (
      secretEsperado &&
      typeof secretRecibido === 'string' &&
      secretRecibido === secretEsperado
    ) {
      return next();
    }

    // Bypass proveedor: bearer con token local válido (proveedor externo).
    const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, '').trim();
    if (bearer) {
      try {
        const payload = JWTUtils.validateToken(bearer);
        if (payload?.tipo_usuario === 'proveedor') {
          return next();
        }
      } catch {
        /* no es un token proveedor local válido → sigue al rechazo */
      }
    }

    logger.warn('petición directa rechazada (sin X-Gateway-Secret válido)', {
      ip: req.ip,
      path: req.path,
    });
    res.status(401).json({
      errors: [
        {
          message: 'No autorizado: acceso solo a través del gateway',
          extensions: { code: 'UNAUTHENTICATED' },
        },
      ],
    });
  };
}
