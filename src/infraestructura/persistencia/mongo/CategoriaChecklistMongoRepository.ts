import { BaseMongoRepository } from './BaseMongoRepository';
import { CategoriaChecklist, CategoriaChecklistInput, CategoriaChecklistFiltros, CategoriaChecklistConnection } from '../../../dominio/entidades/CategoriaChecklist';
import { ICategoriaChecklistRepository } from '../../../dominio/repositorios/ICategoriaChecklistRepository';
import { CategoriaChecklistModel } from './schemas/CategoriaChecklistSchema';

export class CategoriaChecklistMongoRepository extends BaseMongoRepository<CategoriaChecklist> implements ICategoriaChecklistRepository {
  constructor() {
    super(CategoriaChecklistModel as any);
  }

  protected toDomain(doc: any): CategoriaChecklist {
    return {
      id: doc._id.toString(),
      nombre: doc.nombre,
      descripcion: doc.descripcion,
      tipoUso: doc.tipoUso,
      permiteMultiple: doc.permiteMultiple,
      permiteVincularReportes: doc.permiteVincularReportes,
      estado: doc.estado,
      fechaCreacion: doc.fechaCreacion.toISOString(),
      fechaActualizacion: doc.fechaActualizacion?.toISOString()
    };
  }

  async crearCategoriaChecklist(input: CategoriaChecklistInput): Promise<CategoriaChecklist> {
    const newCategoriaChecklist = new CategoriaChecklistModel({
      nombre: input.nombre.trim(),
      descripcion: input.descripcion?.trim(),
      tipoUso: input.tipoUso,
      permiteMultiple: input.permiteMultiple,
      permiteVincularReportes: input.permiteVincularReportes,
      estado: input.estado
    });

    const saved = await newCategoriaChecklist.save();
    return this.toDomain(saved.toObject());
  }

  async obtenerCategoriaChecklist(id: string): Promise<CategoriaChecklist | null> {
    try {
      const doc = await CategoriaChecklistModel.findById(id);
      return doc ? this.toDomain(doc.toObject()) : null;
    } catch (error) {
      console.error('Error al obtener categoría de checklist:', error);
      throw error;
    }
  }

  async actualizarCategoriaChecklist(id: string, input: Partial<CategoriaChecklistInput>): Promise<CategoriaChecklist> {
    try {
      const updateData: any = {};
      
      if (input.nombre !== undefined) updateData.nombre = input.nombre.trim();
      if (input.descripcion !== undefined) updateData.descripcion = input.descripcion?.trim();
      if (input.tipoUso !== undefined) updateData.tipoUso = input.tipoUso;
      if (input.permiteMultiple !== undefined) updateData.permiteMultiple = input.permiteMultiple;
      if (input.permiteVincularReportes !== undefined) updateData.permiteVincularReportes = input.permiteVincularReportes;
      if (input.estado !== undefined) updateData.estado = input.estado;

      const doc = await CategoriaChecklistModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!doc) {
        throw new Error('Categoría de checklist no encontrada');
      }

      return this.toDomain(doc.toObject());
    } catch (error) {
      console.error('Error al actualizar categoría de checklist:', error);
      throw error;
    }
  }

  async eliminarCategoriaChecklist(id: string): Promise<boolean> {
    try {
      const result = await CategoriaChecklistModel.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      console.error('Error al eliminar categoría de checklist:', error);
      throw error;
    }
  }

  async listarCategoriasChecklist(filtros?: CategoriaChecklistFiltros, limit = 20, offset = 0): Promise<CategoriaChecklistConnection> {
    try {
      const query: any = {};

      // Aplicar filtros
      if (filtros) {
        if (filtros.nombre) {
          query.nombre = { $regex: filtros.nombre, $options: 'i' };
        }
        if (filtros.tipoUso) {
          query.tipoUso = filtros.tipoUso;
        }
        if (filtros.estado) {
          query.estado = filtros.estado;
        }
      }

      // Contar total de documentos
      const totalCount = await CategoriaChecklistModel.countDocuments(query);

      // Obtener documentos con paginación
      const docs = await CategoriaChecklistModel.find(query)
        .sort({ fechaCreacion: -1 })
        .skip(offset)
        .limit(limit);

      const categoriasChecklist = docs.map(doc => this.toDomain(doc.toObject()));

      return {
        categoriasChecklist,
        totalCount
      };
    } catch (error) {
      console.error('Error al listar categorías de checklist:', error);
      throw error;
    }
  }

  async obtenerCategoriasChecklistActivas(): Promise<CategoriaChecklist[]> {
    try {
      const docs = await CategoriaChecklistModel.find({ estado: 'activo' })
        .sort({ nombre: 1 });

      return docs.map(doc => this.toDomain(doc.toObject()));
    } catch (error) {
      console.error('Error al obtener categorías de checklist activas:', error);
      throw error;
    }
  }

  async obtenerCategoriasChecklistInactivas(): Promise<CategoriaChecklist[]> {
    try {
      const docs = await CategoriaChecklistModel.find({ estado: 'inactivo' })
        .sort({ nombre: 1 });

      return docs.map(doc => this.toDomain(doc.toObject()));
    } catch (error) {
      console.error('Error al obtener categorías de checklist inactivas:', error);
      throw error;
    }
  }

  async existeNombre(nombre: string, excludeId?: string): Promise<boolean> {
    try {
      const query: any = { nombre: nombre.trim() };
      if (excludeId) {
        query._id = { $ne: excludeId };
      }

      const count = await CategoriaChecklistModel.countDocuments(query);
      return count > 0;
    } catch (error) {
      console.error('Error al verificar existencia de nombre:', error);
      throw error;
    }
  }

  async existeCategoriaChecklist(id: string): Promise<boolean> {
    try {
      const doc = await CategoriaChecklistModel.findById(id);
      return !!doc;
    } catch (error) {
      console.error('Error al verificar existencia de categoría de checklist:', error);
      throw error;
    }
  }

  // MÉTODO BATCH OPTIMIZADO
  async obtenerCategoriasPorIds(ids: string[]): Promise<CategoriaChecklist[]> {
    try {
      if (!ids || ids.length === 0) {
        return [];
      }

      const docs = await CategoriaChecklistModel.find({ 
        _id: { $in: ids } 
      });

      return docs.map(doc => this.toDomain(doc.toObject()));
    } catch (error) {
      console.error('Error al obtener categorías por IDs:', error);
      throw error;
    }
  }
}
