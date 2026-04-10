// ============================================================================
// REPOSITORIO MONGODB PARA USUARIOS PROVEEDOR
// ============================================================================

import { BaseMongoRepository } from './BaseMongoRepository';
import { IUsuarioProveedorRepository } from '../../../dominio/repositorios/IUsuarioProveedorRepository';
import {
  UsuarioProveedor,
  UsuarioProveedorInput,
  UsuarioProveedorResponse,
  UsuarioProveedorListFilter,
  UsuarioProveedorConnection,
} from '../../../dominio/entidades/UsuarioProveedor';
import { UsuarioProveedorAuth } from '../../../dominio/entidades/UsuarioProveedorAuth';
import { UsuarioProveedorModel } from './schemas/UsuarioProveedorSchema';

/**
 * Repositorio MongoDB para la gestión de usuarios proveedor
 * Implementa la interfaz IUsuarioProveedorRepository
 */
export class UsuarioProveedorMongoRepository extends BaseMongoRepository<UsuarioProveedor> implements IUsuarioProveedorRepository {
  constructor() {
    super(UsuarioProveedorModel as any);
  }

  /**
   * Convierte documento de MongoDB a entidad de dominio
   */
  protected toDomain(doc: any): UsuarioProveedor {
    return {
      id: doc._id.toString(),
      nombres: doc.nombres,
      apellido_paterno: doc.apellido_paterno,
      apellido_materno: doc.apellido_materno,
      dni: doc.dni,
      username: doc.username,
      password: doc.password,
      proveedor_id: doc.proveedor_id,
      proveedor_nombre: doc.proveedor_nombre,
      estado: doc.estado,
      fecha_creacion: doc.fecha_creacion,
      fecha_actualizacion: doc.fecha_actualizacion
    };
  }

  /**
   * Mapea entidad a response
   */
  private mapToResponse(usuario: UsuarioProveedor): UsuarioProveedorResponse {
    return {
      id: usuario.id,
      nombres: usuario.nombres,
      apellido_paterno: usuario.apellido_paterno,
      apellido_materno: usuario.apellido_materno,
      dni: usuario.dni,
      username: usuario.username,
      proveedor_id: usuario.proveedor_id,
      proveedor_nombre: usuario.proveedor_nombre,
      estado: usuario.estado,
      fecha_creacion: usuario.fecha_creacion,
      fecha_actualizacion: usuario.fecha_actualizacion
    };
  }

  /**
   * Obtiene todos los usuarios proveedor
   */
  async getAllUsuariosProveedor(): Promise<UsuarioProveedorResponse[]> {
    const usuarios = await this.list();
    return usuarios.map(this.mapToResponse);
  }

  /**
   * Listado paginado para admin (filtros opcionales)
   */
  async listUsuariosProveedorPaginated(filter: UsuarioProveedorListFilter): Promise<UsuarioProveedorConnection> {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 10));
    const q: Record<string, unknown> = {};
    if (filter.proveedor_id?.trim()) {
      q['proveedor_id'] = filter.proveedor_id.trim();
    }
    if (filter.estado) {
      q['estado'] = filter.estado;
    }
    const search = filter.searchTerm?.trim();
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const term = new RegExp(escaped, 'i');
      q['$or'] = [
        { nombres: term },
        { apellido_paterno: term },
        { apellido_materno: term },
        { dni: term },
        { username: term },
        { proveedor_nombre: term },
      ];
    }
    const skip = (page - 1) * limit;
    const [total, docs] = await Promise.all([
      this.model.countDocuments(q).exec(),
      this.model.find(q).sort({ fecha_creacion: -1 }).skip(skip).limit(limit).exec(),
    ]);
    const totalPages = total > 0 ? Math.ceil(total / limit) : 0;
    const data = docs.map((doc: any) => this.mapToResponse(this.toDomain(doc)));
    return { data, total, page, limit, totalPages };
  }

  /**
   * Obtiene un usuario proveedor por ID
   */
  async getUsuarioProveedor(id: string): Promise<UsuarioProveedorResponse | null> {
    const usuario = await this.findById(id);
    return usuario ? this.mapToResponse(usuario) : null;
  }

  /**
   * Obtiene un usuario proveedor por DNI
   */
  async getUsuarioProveedorByDni(dni: string): Promise<UsuarioProveedorResponse | null> {
    try {
      const doc = await this.model.findOne({ dni });
      return doc ? this.mapToResponse(this.toDomain(doc)) : null;
    } catch (error) {
      console.error('Error al buscar usuario por DNI:', error);
      throw error;
    }
  }

  /**
   * Obtiene un usuario proveedor por username
   */
  async getUsuarioProveedorByUsername(username: string): Promise<UsuarioProveedorResponse | null> {
    try {
      const doc = await this.model.findOne({ username });
      return doc ? this.mapToResponse(this.toDomain(doc)) : null;
    } catch (error) {
      console.error('Error al buscar usuario por username:', error);
      throw error;
    }
  }

  /**
   * Obtiene un usuario proveedor por DNI (sin mapear a response para auth)
   */
  async getUsuarioProveedorByDniForAuth(dni: string): Promise<UsuarioProveedorAuth | null> {
    try {
      const doc = await this.model.findOne({ dni });
      if (!doc) return null;
      
      return {
        id: doc._id.toString(),
        nombres: doc.nombres,
        apellido_paterno: doc.apellido_paterno,
        apellido_materno: doc.apellido_materno,
        dni: doc.dni,
        username: doc.username,
        password: doc.password,
        proveedor_id: doc.proveedor_id,
        proveedor_nombre: doc.proveedor_nombre,
        estado: doc.estado,
        fecha_creacion: doc.fecha_creacion,
        fecha_actualizacion: doc.fecha_actualizacion
      };
    } catch (error) {
      console.error('Error al buscar usuario por DNI para auth:', error);
      throw error;
    }
  }

  /**
   * Obtiene usuarios proveedor por proveedor_id
   */
  async getUsuariosProveedorByProveedorId(proveedor_id: string): Promise<UsuarioProveedorResponse[]> {
    try {
      const docs = await this.model.find({ proveedor_id });
      return docs.map((doc: any) => this.mapToResponse(this.toDomain(doc)));
    } catch (error) {
      console.error('Error al buscar usuarios por proveedor_id:', error);
      throw error;
    }
  }

  /**
   * Crea un nuevo usuario proveedor
   */
  async createUsuarioProveedor(data: UsuarioProveedorInput): Promise<UsuarioProveedorResponse> {
    const now = new Date();
    const newUsuario: UsuarioProveedor = {
      id: '', // Se asignará en el método create
      nombres: data.nombres,
      apellido_paterno: data.apellido_paterno,
      apellido_materno: data.apellido_materno,
      dni: data.dni,
      username: data.username,
      password: data.password,
      proveedor_id: data.proveedor_id,
      proveedor_nombre: data.proveedor_nombre,
      estado: data.estado || 'PENDIENTE',
      fecha_creacion: now,
      fecha_actualizacion: now
    };

    const created = await this.create(newUsuario);
    return this.mapToResponse(created);
  }

  /**
   * Actualiza un usuario proveedor
   */
  async updateUsuarioProveedor(id: string, data: UsuarioProveedorInput): Promise<UsuarioProveedorResponse> {
    const updateData: Partial<UsuarioProveedor> = {
      ...data,
      fecha_actualizacion: new Date()
    };

    const updated = await this.update(id, updateData);
    if (!updated) {
      throw new Error('Usuario proveedor no encontrado');
    }

    return this.mapToResponse(updated);
  }

  async actualizarContrasenaUsuarioProveedor(
    id: string,
    passwordHasheada: string
  ): Promise<UsuarioProveedorResponse> {
    const updated = await this.update(id, {
      password: passwordHasheada,
      fecha_actualizacion: new Date(),
    });
    if (!updated) {
      throw new Error('Usuario proveedor no encontrado');
    }
    return this.mapToResponse(updated);
  }

  /**
   * Elimina un usuario proveedor
   */
  async deleteUsuarioProveedor(id: string): Promise<UsuarioProveedorResponse> {
    const usuario = await this.findById(id);
    if (!usuario) {
      throw new Error('Usuario proveedor no encontrado');
    }

    await this.delete(id);
    return this.mapToResponse(usuario);
  }

  /**
   * Cambia el estado de un usuario proveedor
   */
  async cambiarEstado(id: string, estado: 'ACTIVO' | 'PENDIENTE' | 'BLOQUEADO' | 'INACTIVO'): Promise<UsuarioProveedorResponse> {
    const updated = await this.update(id, { estado, fecha_actualizacion: new Date() });
    if (!updated) {
      throw new Error('Usuario proveedor no encontrado');
    }

    return this.mapToResponse(updated);
  }
}
