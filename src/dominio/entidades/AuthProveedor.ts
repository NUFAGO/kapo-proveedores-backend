// ============================================================================
// AUTENTICACIÓN PARA USUARIOS PROVEEDOR
// ============================================================================

export interface LoginProveedorRequest {
  usuario: string;
  contrasenna: string;
}

export interface LoginProveedorResponse {
  id: string;
  token: string;
  usuario: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  proveedor_id: string;
  proveedor_nombre: string;
  estado: 'ACTIVO' | 'PENDIENTE' | 'BLOQUEADO' | 'INACTIVO';
}

export interface JWTPayloadProveedor {
  id: string;
  tipo_usuario: 'proveedor';
  proveedor_id: string;
  estado: string;
  iat?: number;
  exp?: number;
}
