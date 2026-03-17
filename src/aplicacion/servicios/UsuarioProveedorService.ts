import { UsuarioProveedorInput, UsuarioProveedorResponse } from '../../dominio/entidades/UsuarioProveedor';
import { UsuarioProveedorAuth } from '../../dominio/entidades/UsuarioProveedorAuth';
import { IUsuarioProveedorRepository } from '../../dominio/repositorios/IUsuarioProveedorRepository';
import { BaseService } from './BaseService';
import { IBaseRepository } from '../../dominio/repositorios/IBaseRepository';
import bcrypt from 'bcrypt';

/**
 * Servicio de usuarios proveedor que extiende BaseService para mantener consistencia
 * Implementa métodos específicos de IUsuarioProveedorRepository además de los métodos base
 */
export class UsuarioProveedorService extends BaseService<UsuarioProveedorResponse> {
  private readonly usuarioProveedorRepository: IUsuarioProveedorRepository;
  
  constructor(repository: IUsuarioProveedorRepository) {
    // BaseService requiere IBaseRepository, creamos un adaptador mínimo
    super({} as IBaseRepository<UsuarioProveedorResponse>);
    this.usuarioProveedorRepository = repository;
  }

  async getAllUsuariosProveedor(): Promise<UsuarioProveedorResponse[]> {
    return await this.usuarioProveedorRepository.getAllUsuariosProveedor();
  }

  async getUsuarioProveedor(id: string): Promise<UsuarioProveedorResponse | null> {
    return await this.usuarioProveedorRepository.getUsuarioProveedor(id);
  }

  async getUsuarioProveedorByDni(dni: string): Promise<UsuarioProveedorResponse | null> {
    return await this.usuarioProveedorRepository.getUsuarioProveedorByDni(dni);
  }

  async getUsuarioProveedorByUsername(username: string): Promise<UsuarioProveedorResponse | null> {
    return await this.usuarioProveedorRepository.getUsuarioProveedorByUsername(username);
  }

  async getUsuarioProveedorByDniForAuth(dni: string): Promise<UsuarioProveedorAuth | null> {
    return await this.usuarioProveedorRepository.getUsuarioProveedorByDniForAuth(dni);
  }

  async getUsuariosProveedorByProveedorId(proveedor_id: string): Promise<UsuarioProveedorResponse[]> {
    return await this.usuarioProveedorRepository.getUsuariosProveedorByProveedorId(proveedor_id);
  }

  async createUsuarioProveedor(data: UsuarioProveedorInput): Promise<UsuarioProveedorResponse> {
    // Hashear la contraseña antes de guardar
    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    const dataWithHashedPassword = {
      ...data,
      password: hashedPassword
    };
    
    return await this.usuarioProveedorRepository.createUsuarioProveedor(dataWithHashedPassword);
  }

  async updateUsuarioProveedor(id: string, data: UsuarioProveedorInput): Promise<UsuarioProveedorResponse> {
    // Hashear la contraseña si se proporciona una nueva
    let updateData = { ...data };
    
    if (data.password) {
      const hashedPassword = await bcrypt.hash(data.password, 10);
      updateData = {
        ...data,
        password: hashedPassword
      };
    }
    
    return await this.usuarioProveedorRepository.updateUsuarioProveedor(id, updateData);
  }

  async deleteUsuarioProveedor(id: string): Promise<UsuarioProveedorResponse> {
    return await this.usuarioProveedorRepository.deleteUsuarioProveedor(id);
  }

  async cambiarEstado(id: string, estado: 'ACTIVO' | 'PENDIENTE' | 'BLOQUEADO' | 'INACTIVO'): Promise<UsuarioProveedorResponse> {
    return await this.usuarioProveedorRepository.cambiarEstado(id, estado);
  }
}
