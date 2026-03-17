// ============================================================================
// REPOSITORIO MONGODB PARA TIPOS DOCUMENTO
// ============================================================================

import { BaseMongoRepository } from './BaseMongoRepository';
import { ITipoDocumentoRepository } from '../../../dominio/repositorios/ITipoDocumentoRepository';
import { TipoDocumento, TipoDocumentoInput, TipoDocumentoFiltros, TipoDocumentoConnection } from '../../../dominio/entidades/TipoDocumento';
import { TipoDocumentoModel } from './schemas/TipoDocumentoSchema';

/**
 * Repositorio MongoDB para la gestión de tipos de documento
 * Implementa la interfaz ITipoDocumentoRepository
 */
export class TipoDocumentoMongoRepository extends BaseMongoRepository<TipoDocumento> implements ITipoDocumentoRepository {
  constructor() {
    super(TipoDocumentoModel as any);
  }

  /**
   * Convierte documento de MongoDB a entidad de dominio
   */
  protected toDomain(doc: any): TipoDocumento {
    return {
      id: doc._id.toString(),
      codigo: doc.codigo,
      nombre: doc.nombre,
      descripcion: doc.descripcion,
      estado: doc.estado,
      fechaCreacion: doc.fechaCreacion,
      fechaActualizacion: doc.fechaActualizacion
    };
  }

  /**
   * Genera el siguiente código consecutivo tipo TD0001
   */
  private async generarSiguienteCodigo(): Promise<string> {
    try {
      // Buscar el último tipo de documento ordenado por código descendente
      const ultimoDocumento = await this.model
        .findOne({ codigo: { $regex: '^TD' } })
        .sort({ codigo: -1 })
        .select('codigo')
        .exec();

      if (!ultimoDocumento) {
        // Si no hay documentos, empezar con TD0001
        return 'TD0001';
      }

      // Extraer el número del código (ej: TD0001 -> 0001 -> 1)
      const ultimoCodigo = ultimoDocumento.codigo;
      const match = ultimoCodigo.match(/^TD(\d+)$/);
      
      if (!match) {
        // Si el formato es inválido, empezar con TD0001
        return 'TD0001';
      }

      // Convertir a número, incrementar y formatear con padStart(3)
      const ultimoNumero = parseInt(match[1], 10);
      const siguienteNumero = ultimoNumero + 1;
      const siguienteCodigo = `TD${String(siguienteNumero).padStart(4, '0')}`;

      return siguienteCodigo;
    } catch (error) {
      console.error('Error al generar siguiente código:', error);
      // En caso de error, devolver un código por defecto
      return 'TD0001';
    }
  }

  /**
   * Obtiene un tipo de documento por ID
   */
  async obtenerTipoDocumento(id: string): Promise<TipoDocumento | null> {
    return await this.findById(id);
  }

  /**
   * Busca tipos de documento con filtros y paginación
   */
  async buscarTiposDocumento(filtros: TipoDocumentoFiltros): Promise<TipoDocumentoConnection> {
    try {
      // Construir query de filtros
      const query: any = {};
      
      if (filtros.nombre) {
        query.nombre = { $regex: filtros.nombre, $options: 'i' };
      }
      
      if (filtros.estado) {
        query.estado = filtros.estado;
      }

      // Contar total de documentos que coinciden con los filtros
      const totalCount = await this.model.countDocuments(query);

      // Aplicar paginación
      const limit = filtros.limit || 20;
      const offset = filtros.offset || 0;
      
      const docs = await this.model
        .find(query)
        .sort({ fechaCreacion: -1 })
        .skip(offset)
        .limit(limit);

      // Convertir a entidades de dominio
      const tiposDocumento = docs.map(doc => this.toDomain(doc));

      return {
        tiposDocumento,
        totalCount
      };
    } catch (error) {
      console.error('Error al buscar tipos de documento:', error);
      throw error;
    }
  }

  /**
   * Crea un nuevo tipo de documento
   */
  async crearTipoDocumento(input: TipoDocumentoInput): Promise<TipoDocumento> {
    // Generar código consecutivo automáticamente
    const codigo = await this.generarSiguienteCodigo();
    
    const now = new Date();
    const newTipoDocumento: TipoDocumento = {
      id: '', // Se asignará en el método create
      codigo,
      nombre: input.nombre,
      descripcion: input.descripcion,
      estado: input.estado,
      fechaCreacion: now,
      fechaActualizacion: now
    };

    return await this.create(newTipoDocumento);
  }

  /**
   * Actualiza un tipo de documento
   */
  async actualizarTipoDocumento(id: string, input: Partial<TipoDocumentoInput>): Promise<TipoDocumento> {
    const updateData: Partial<TipoDocumento> = {
      ...input,
      fechaActualizacion: new Date()
    };

    const updated = await this.update(id, updateData);
    if (!updated) {
      throw new Error('Tipo de documento no encontrado');
    }

    return updated;
  }

  /**
   * Elimina un tipo de documento
   */
  async eliminarTipoDocumento(id: string): Promise<boolean> {
    try {
      await this.delete(id);
      return true;
    } catch (error) {
      console.error('Error al eliminar tipo de documento:', error);
      throw error;
    }
  }

  /**
   * Obtiene tipos de documento inactivos
   */
  async findInactivos(): Promise<TipoDocumento[]> {
    try {
      const docs = await this.model.find({ estado: 'inactivo' }).sort({ nombre: 1 });
      return docs.map(doc => this.toDomain(doc));
    } catch (error) {
      console.error('Error al buscar tipos inactivos:', error);
      throw error;
    }
  }

  /**
   * Obtiene tipos de documento activos
   */
  async findActivos(): Promise<TipoDocumento[]> {
    try {
      const docs = await this.model.find({ estado: 'activo' }).sort({ nombre: 1 });
      return docs.map(doc => this.toDomain(doc));
    } catch (error) {
      console.error('Error al buscar tipos activos:', error);
      throw error;
    }
  }
}
