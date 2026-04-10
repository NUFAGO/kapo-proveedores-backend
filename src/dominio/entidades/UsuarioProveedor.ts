export interface UsuarioProveedor {
  id: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  dni: string;
  username: string;
  password: string; // hasheado
  proveedor_id: string;
  proveedor_nombre: string;
  estado: 'ACTIVO' | 'PENDIENTE' | 'BLOQUEADO' | 'INACTIVO';
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}

export interface UsuarioProveedorInput {
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  dni: string;
  username: string;
  password: string;
  proveedor_id: string;
  proveedor_nombre: string;
  estado?: 'ACTIVO' | 'PENDIENTE' | 'BLOQUEADO' | 'INACTIVO';
}

export interface UsuarioProveedorResponse {
  id: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  dni: string;
  username: string;
  proveedor_id: string;
  proveedor_nombre: string;
  estado: 'ACTIVO' | 'PENDIENTE' | 'BLOQUEADO' | 'INACTIVO';
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}

export interface UsuarioProveedorListFilter {
  page?: number;
  limit?: number;
  searchTerm?: string;
  estado?: 'ACTIVO' | 'PENDIENTE' | 'BLOQUEADO' | 'INACTIVO';
  proveedor_id?: string;
}

export interface UsuarioProveedorConnection {
  data: UsuarioProveedorResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
