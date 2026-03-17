// ============================================================================
// INTERFAZ PARA AUTENTICACIÓN DE USUARIO PROVEEDOR
// ============================================================================

export interface UsuarioProveedorAuth {
  id: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  dni: string;
  username: string;
  password: string; // Incluir password para autenticación
  proveedor_id: string;
  proveedor_nombre: string;
  estado: 'ACTIVO' | 'PENDIENTE' | 'BLOQUEADO' | 'INACTIVO';
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}
