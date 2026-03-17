// ============================================================================
// UTILIDADES JWT - GENERACIÓN Y VALIDACIÓN DE TOKENS
// ============================================================================

import jwt, { SignOptions } from 'jsonwebtoken';
import { logger } from '../logging';

export interface JWTPayload {
  id: string;
  tipo_usuario: 'admin' | 'proveedor';
  proveedor_id?: string | null; // Solo para usuarios proveedor
  iat?: number;
  exp?: number;
}

export interface TokenInfo {
  payload: JWTPayload;
  token: string;
}

export class JWTUtils {
  private static readonly SECRET = process.env['JWT_SECRET'] || 'fallback-secret-key-change-in-production';
  private static readonly EXPIRES_IN = process.env['JWT_EXPIRES_IN'] || '24h';

  /**
   * Genera un token JWT para un usuario
   */
  static generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): TokenInfo {
    try {
      const tokenPayload: JWTPayload = {
        ...payload,
        iat: Math.floor(Date.now() / 1000)
      };

      const signOptions: SignOptions = {
        expiresIn: this.EXPIRES_IN,
        algorithm: 'HS256'
      } as SignOptions;

      const token = jwt.sign(tokenPayload, this.SECRET, signOptions);

      logger.debug('Token JWT generado', {
        userId: payload.id,
        tipo_usuario: payload.tipo_usuario,
        proveedor_id: payload.proveedor_id
      });

      return {
        payload: tokenPayload,
        token
      };
    } catch (error) {
      logger.error('Error al generar token JWT', { error });
      throw new Error('No se pudo generar el token de autenticación');
    }
  }

  /**
   * Valida y decodifica un token JWT
   */
  static validateToken(token: string): JWTPayload {
    try {
      if (!token) {
        throw new Error('Token no proporcionado');
      }

      // Remover prefijo "Bearer " si existe
      const cleanToken = token.replace(/^Bearer\s+/, '');

      const decoded = jwt.verify(cleanToken, this.SECRET, {
        algorithms: ['HS256']
      }) as JWTPayload;

      logger.debug('Token JWT validado', {
        userId: decoded.id,
        tipo_usuario: decoded.tipo_usuario,
        proveedor_id: decoded.proveedor_id
      });

      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn('Token JWT expirado');
        throw new Error('Token expirado');
      } else if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Token JWT inválido', { error: error.message });
        throw new Error('Token inválido');
      } else {
        logger.error('Error al validar token JWT', { error });
        throw new Error('Error en la validación del token');
      }
    }
  }

  /**
   * Verifica si un token está próximo a expirar (menos de 15 minutos)
   */
  static isTokenExpiringSoon(token: string): boolean {
    try {
      const decoded = this.validateToken(token);
      if (!decoded.exp) return false;

      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = decoded.exp - now;
      const fifteenMinutes = 15 * 60;

      return timeUntilExpiry <= fifteenMinutes && timeUntilExpiry > 0;
    } catch {
      return false;
    }
  }

  /**
   * Refresca un token existente
   */
  static refreshToken(token: string): TokenInfo {
    try {
      const decoded = this.validateToken(token);
      
      // Crear nuevo token con la misma información pero nuevo timestamp
      const newPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
        id: decoded.id,
        tipo_usuario: decoded.tipo_usuario,
        proveedor_id: decoded.proveedor_id ?? null
      };

      return this.generateToken(newPayload);
    } catch (error) {
      logger.error('Error al refrescar token JWT', { error });
      throw new Error('No se pudo refrescar el token');
    }
  }

  /**
   * Extrae el token del header Authorization
   */
  static extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader) return null;
    
    const match = authHeader.match(/^Bearer\s+(.+)$/);
    return match?.[1] ?? null;
  }

  /**
   * Verifica si el usuario es de tipo admin
   */
  static isAdmin(payload: JWTPayload): boolean {
    return payload.tipo_usuario === 'admin';
  }

  /**
   * Verifica si el usuario es de tipo proveedor
   */
  static isProveedor(payload: JWTPayload): boolean {
    return payload.tipo_usuario === 'proveedor';
  }

  /**
   * Verifica si un usuario proveedor tiene acceso a un proveedor_id específico
   */
  static canAccessProveedor(payload: JWTPayload, proveedorId: string): boolean {
    if (payload.tipo_usuario === 'admin') return true;
    if (payload.tipo_usuario === 'proveedor') {
      return (payload.proveedor_id ?? null) === proveedorId;
    }
    return false;
  }
}
