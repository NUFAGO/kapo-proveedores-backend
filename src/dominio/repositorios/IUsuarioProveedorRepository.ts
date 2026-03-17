import { UsuarioProveedorInput, UsuarioProveedorResponse } from '../entidades/UsuarioProveedor';
import { UsuarioProveedorAuth } from '../entidades/UsuarioProveedorAuth';

export interface IUsuarioProveedorRepository {
  getAllUsuariosProveedor(): Promise<UsuarioProveedorResponse[]>;
  getUsuarioProveedor(id: string): Promise<UsuarioProveedorResponse | null>;
  getUsuarioProveedorByDni(dni: string): Promise<UsuarioProveedorResponse | null>;
  getUsuarioProveedorByUsername(username: string): Promise<UsuarioProveedorResponse | null>;
  getUsuarioProveedorByDniForAuth(dni: string): Promise<UsuarioProveedorAuth | null>;
  getUsuariosProveedorByProveedorId(proveedor_id: string): Promise<UsuarioProveedorResponse[]>;
  createUsuarioProveedor(data: UsuarioProveedorInput): Promise<UsuarioProveedorResponse>;
  updateUsuarioProveedor(id: string, data: UsuarioProveedorInput): Promise<UsuarioProveedorResponse>;
  deleteUsuarioProveedor(id: string): Promise<UsuarioProveedorResponse>;
  cambiarEstado(id: string, estado: 'ACTIVO' | 'PENDIENTE' | 'BLOQUEADO' | 'INACTIVO'): Promise<UsuarioProveedorResponse>;
}
