import { BaseMongoRepository } from './BaseMongoRepository';
import { TipoSolicitudPago, TipoSolicitudPagoInput, TipoSolicitudPagoFiltros, TipoSolicitudPagoConnection } from '../../../dominio/entidades/TipoSolicitudPago';
import { ITipoSolicitudPagoRepository } from '../../../dominio/repositorios/ITipoSolicitudPagoRepository';
import { TipoSolicitudPagoModel } from './schemas/TipoSolicitudPagoSchema';

export class TipoSolicitudPagoMongoRepository extends BaseMongoRepository<TipoSolicitudPago> implements ITipoSolicitudPagoRepository {
  constructor() {
    super(TipoSolicitudPagoModel as any);
  }

  protected toDomain(doc: any): TipoSolicitudPago {
    return {
      id: doc._id.toString(),
      codigo: doc.codigo,
      nombre: doc.nombre,
      descripcion: doc.descripcion,
      categoria: doc.categoria,
      permiteMultiple: doc.permiteMultiple,
      permiteVincularReportes: doc.permiteVincularReportes,
      estado: doc.estado,
      fechaCreacion: doc.fechaCreacion.toISOString(),
      fechaActualizacion: doc.fechaActualizacion?.toISOString()
    };
  }

  async crearTipoSolicitudPago(input: TipoSolicitudPagoInput): Promise<TipoSolicitudPago> {
    const codigo = await this.generarSiguienteCodigo();
    
    const newTipoSolicitudPago = new TipoSolicitudPagoModel({
      codigo,
      nombre: input.nombre.trim(),
      descripcion: input.descripcion?.trim(),
      categoria: input.categoria,
      permiteMultiple: input.permiteMultiple,
      permiteVincularReportes: input.permiteVincularReportes,
      estado: input.estado
    });

    const saved = await newTipoSolicitudPago.save();
    return this.toDomain(saved.toObject());
  }

  async obtenerTipoSolicitudPago(id: string): Promise<TipoSolicitudPago | null> {
    try {
      const doc = await TipoSolicitudPagoModel.findById(id);
      return doc ? this.toDomain(doc.toObject()) : null;
    } catch (error) {
      console.error('Error al obtener tipo de solicitud de pago:', error);
      throw error;
    }
  }

  async actualizarTipoSolicitudPago(id: string, input: Partial<TipoSolicitudPagoInput>): Promise<TipoSolicitudPago> {
    try {
      const updateData: any = {};
      
      if (input.nombre !== undefined) updateData.nombre = input.nombre.trim();
      if (input.descripcion !== undefined) updateData.descripcion = input.descripcion?.trim();
      if (input.categoria !== undefined) updateData.categoria = input.categoria;
      if (input.permiteMultiple !== undefined) updateData.permiteMultiple = input.permiteMultiple;
      if (input.permiteVincularReportes !== undefined) updateData.permiteVincularReportes = input.permiteVincularReportes;
      if (input.estado !== undefined) updateData.estado = input.estado;

      const doc = await TipoSolicitudPagoModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!doc) {
        throw new Error('Tipo de solicitud de pago no encontrado');
      }

      return this.toDomain(doc.toObject());
    } catch (error) {
      console.error('Error al actualizar tipo de solicitud de pago:', error);
      throw error;
    }
  }

  async eliminarTipoSolicitudPago(id: string): Promise<boolean> {
    try {
      const result = await TipoSolicitudPagoModel.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      console.error('Error al eliminar tipo de solicitud de pago:', error);
      throw error;
    }
  }

  async listarTiposSolicitudPago(filtros?: TipoSolicitudPagoFiltros, limit = 20, offset = 0): Promise<TipoSolicitudPagoConnection> {
    try {
      const query: any = {};

      // Aplicar filtros
      if (filtros) {
        if (filtros.nombre) {
          query.nombre = { $regex: filtros.nombre, $options: 'i' };
        }
        if (filtros.categoria) {
          query.categoria = filtros.categoria;
        }
        if (filtros.estado) {
          query.estado = filtros.estado;
        }
      }

      // Contar total de documentos
      const totalCount = await TipoSolicitudPagoModel.countDocuments(query);

      // Obtener documentos con paginación
      const docs = await TipoSolicitudPagoModel.find(query)
        .sort({ fechaCreacion: -1 })
        .skip(offset)
        .limit(limit);

      const tiposSolicitudPago = docs.map(doc => this.toDomain(doc.toObject()));

      return {
        tiposSolicitudPago,
        totalCount
      };
    } catch (error) {
      console.error('Error al listar tipos de solicitud de pago:', error);
      throw error;
    }
  }

  async obtenerTiposSolicitudPagoActivos(): Promise<TipoSolicitudPago[]> {
    try {
      const docs = await TipoSolicitudPagoModel.find({ estado: 'activo' })
        .sort({ nombre: 1 });

      return docs.map(doc => this.toDomain(doc.toObject()));
    } catch (error) {
      console.error('Error al obtener tipos de solicitud de pago activos:', error);
      throw error;
    }
  }

  async obtenerTiposSolicitudPagoInactivos(): Promise<TipoSolicitudPago[]> {
    try {
      const docs = await TipoSolicitudPagoModel.find({ estado: 'inactivo' })
        .sort({ nombre: 1 });

      return docs.map(doc => this.toDomain(doc.toObject()));
    } catch (error) {
      console.error('Error al obtener tipos de solicitud de pago inactivos:', error);
      throw error;
    }
  }

  async existeNombre(nombre: string, excludeId?: string): Promise<boolean> {
    try {
      const query: any = { nombre: nombre.trim() };
      if (excludeId) {
        query._id = { $ne: excludeId };
      }

      const count = await TipoSolicitudPagoModel.countDocuments(query);
      return count > 0;
    } catch (error) {
      console.error('Error al verificar existencia de nombre:', error);
      throw error;
    }
  }

  async generarSiguienteCodigo(): Promise<string> {
    try {
      const ultimoDocumento = await TipoSolicitudPagoModel
        .findOne({ codigo: { $regex: '^TSP' } })
        .sort({ codigo: -1 })
        .select('codigo')
        .exec();

      if (!ultimoDocumento) {
        return 'TSP0001';
      }

      const ultimoCodigo = ultimoDocumento.codigo;
      const match = ultimoCodigo.match(/^TSP(\d+)$/);
      
      if (!match) {
        return 'TSP0001';
      }

      const ultimoNumero = parseInt(match[1] || '0', 10);
      const siguienteNumero = ultimoNumero + 1;
      const siguienteCodigo = `TSP${String(siguienteNumero).padStart(4, '0')}`;

      return siguienteCodigo;
    } catch (error) {
      console.error('Error al generar siguiente código:', error);
      return 'TSP0001';
    }
  }
}
