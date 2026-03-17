// ============================================================================
// SERVICIO WRAPPER PARA AUTENTICACIÓN EXTERNA (ADMIN)
// ============================================================================

import { AuthService } from './AuthService';
import { LoginRequest, LoginResponse } from '../../dominio/entidades/Auth';
import { JWTUtils } from '../../infraestructura/auth/JWTUtils';
import { ValidationException } from '../../dominio/exceptions/DomainException';

/**
 * Wrapper que toma el login externo y genera nuestro propio JWT
 */
export class AuthAdminService {
  constructor(private readonly authService: AuthService) {}

  /**
   * Login para usuarios externos (admin)
   * Usa el servicio externo pero genera nuestro propio JWT
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    if (!credentials.usuario || !credentials.contrasenna) {
      throw new ValidationException('Usuario y contraseña son requeridos');
    }

    // 1. Autenticar con el servicio externo
    const externalResponse = await this.authService.login(credentials);
    
    // 2. Por el momento, todos los usuarios externos son admin
    // TODO: Más adelante se implementará validación de roles específicos
    // Comentado temporalmente - todos los usuarios externos son admin por ahora
    // const isAdmin = externalResponse.role?.nombre?.toLowerCase() === 'admin';
    // if (!isAdmin) {
    //   throw new ValidationException('ACCESO_DENEGADO: El usuario no tiene rol de administrador');
    // }

    // 3. Generar nuestro propio JWT con información del admin
    const ourTokenPayload = {
      id: externalResponse.id,
      tipo_usuario: 'admin' as const,
      proveedor_id: null, // Los admin no tienen proveedor_id
      role: externalResponse.role
    };

    const { token } = JWTUtils.generateToken(ourTokenPayload);

    // 4. Retornar respuesta con nuestro token
    return {
      id: externalResponse.id,
      token, // ← Nuestro JWT
      usuario: externalResponse.usuario,
      nombresA: externalResponse.nombresA,
      role: externalResponse.role
    };
  }

  /**
   * Verifica si un token de admin es válido
   */
  verifyToken(token: string) {
    return JWTUtils.validateToken(token);
  }

  /**
   * Refresca un token de admin
   */
  refreshToken(token: string) {
    return JWTUtils.refreshToken(token);
  }
}
