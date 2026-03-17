// ============================================================================
// SERVICIO DE AUTENTICACIÓN PARA USUARIOS PROVEEDOR
// ============================================================================

import { UsuarioProveedorService } from './UsuarioProveedorService';
import { LoginProveedorRequest, LoginProveedorResponse } from '../../dominio/entidades/AuthProveedor';
import { JWTUtils } from '../../infraestructura/auth/JWTUtils';
import { ValidationException } from '../../dominio/exceptions/DomainException';
import * as bcrypt from 'bcrypt';

/**
 * Servicio de autenticación específico para usuarios proveedor
 */
export class AuthProveedorService {
  constructor(private readonly usuarioProveedorService: UsuarioProveedorService) {}

  /**
   * Realiza el login de un usuario proveedor
   * @param credentials - Credenciales de login (usuario y contraseña)
   * @returns Respuesta de login con token y datos completos del usuario proveedor
   * @throws ValidationException si las credenciales son inválidas
   * @throws Error si el usuario no está activo
   */
  async login(credentials: LoginProveedorRequest): Promise<LoginProveedorResponse> {
    if (!credentials.usuario || !credentials.contrasenna) {
      throw new ValidationException('Usuario y contraseña son requeridos');
    }

    // Buscar usuario por DNI o username
    let usuario = await this.usuarioProveedorService.getUsuarioProveedorByDni(credentials.usuario);
    
    // Si no encuentra por DNI, intentar buscar por username
    if (!usuario) {
      usuario = await this.usuarioProveedorService.getUsuarioProveedorByUsername(credentials.usuario);
    }
    
    if (!usuario) {
      throw new ValidationException('Usuario o contraseña incorrectos');
    }

    // Para autenticación, necesitamos obtener el usuario con password desde el repositorio
    // Usamos el DNI del usuario encontrado para buscar el que tiene password
    const usuarioConPassword = await this.usuarioProveedorService.getUsuarioProveedorByDniForAuth(usuario.dni);
    
    if (!usuarioConPassword) {
      throw new ValidationException('Usuario o contraseña incorrectos');
    }

    // Verificar contraseña
    const passwordValida = await bcrypt.compare(credentials.contrasenna, usuarioConPassword.password);
    if (!passwordValida) {
      throw new ValidationException('Usuario o contraseña incorrectos');
    }

    // Verificar estado del usuario
    if (usuario.estado !== 'ACTIVO') {
      throw new Error(`AUTENTICACION_DENEGADA: Usuario ${usuario.estado}. Contacte al administrador.`);
    }

    // Generar token JWT con información completa
    const tokenPayload = {
      id: usuario.id,
      tipo_usuario: 'proveedor' as const,
      proveedor_id: usuario.proveedor_id,
      estado: usuario.estado
    };

    const { token } = JWTUtils.generateToken(tokenPayload);

    // Retornar respuesta completa
    return {
      id: usuario.id,
      token,
      usuario: usuario.dni, // Usamos DNI como usuario
      nombres: usuario.nombres,
      apellido_paterno: usuario.apellido_paterno,
      apellido_materno: usuario.apellido_materno,
      proveedor_id: usuario.proveedor_id,
      proveedor_nombre: usuario.proveedor_nombre,
      estado: usuario.estado
    };
  }

  /**
   * Verifica si un token de proveedor es válido
   * @param token - Token JWT a verificar
   * @returns Payload del token si es válido
   */
  verifyToken(token: string) {
    return JWTUtils.validateToken(token);
  }

  /**
   * Refresca un token de proveedor
   * @param token - Token a refrescar
   * @returns Nuevo token
   */
  refreshToken(token: string) {
    return JWTUtils.refreshToken(token);
  }
}
