import { BaseMongoRepository } from './BaseMongoRepository';
import { PlantillaDocumento, PlantillaDocumentoInput, PlantillaDocumentoFiltros, PlantillaDocumentoConnection } from '../../../dominio/entidades/PlantillaDocumento';
import { IPlantillaDocumentoRepository } from '../../../dominio/repositorios/IPlantillaDocumentoRepository';
import { PlantillaDocumentoModel } from './schemas/PlantillaDocumentoSchema';

export class PlantillaDocumentoMongoRepository extends BaseMongoRepository<PlantillaDocumento> implements IPlantillaDocumentoRepository {
  constructor() {
    super(PlantillaDocumentoModel as any);
  }

  protected toDomain(doc: any): PlantillaDocumento {
    return {
      id: doc._id.toString(),
      codigo: doc.codigo,
      nombrePlantilla: doc.nombrePlantilla,
      plantillaUrl: doc.plantillaUrl,
      formatosPermitidos: doc.formatosPermitidos || null,
      activo: doc.activo,
      fechaCreacion: doc.fechaCreacion.toISOString(),
      fechaActualizacion: doc.fechaActualizacion?.toISOString()
    };
  }

  async crearPlantillaDocumento(input: PlantillaDocumentoInput): Promise<PlantillaDocumento> {
    const codigo = await this.generarSiguienteCodigo();
    
    const newPlantillaDocumento = new PlantillaDocumentoModel({
      codigo,
      nombrePlantilla: input.nombrePlantilla.trim(),
      plantillaUrl: input.plantillaUrl.trim(),
      formatosPermitidos: input.formatosPermitidos?.trim() || null,
      activo: input.activo
    });

    const saved = await newPlantillaDocumento.save();
    return this.toDomain(saved.toObject());
  }

  async obtenerPlantillaDocumento(id: string): Promise<PlantillaDocumento | null> {
    try {
      const doc = await PlantillaDocumentoModel.findById(id);
      return doc ? this.toDomain(doc.toObject()) : null;
    } catch (error) {
      console.error('Error al obtener plantilla de documento:', error);
      throw error;
    }
  }

  async actualizarPlantillaDocumento(id: string, input: Partial<PlantillaDocumentoInput>): Promise<PlantillaDocumento> {
    try {
      const updateData: any = {};
      
      if (input.nombrePlantilla !== undefined) updateData.nombrePlantilla = input.nombrePlantilla.trim();
      if (input.plantillaUrl !== undefined) updateData.plantillaUrl = input.plantillaUrl.trim();
      if (input.formatosPermitidos !== undefined) updateData.formatosPermitidos = input.formatosPermitidos?.trim() || null;
      if (input.activo !== undefined) updateData.activo = input.activo;

      const doc = await PlantillaDocumentoModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!doc) {
        throw new Error('Plantilla de documento no encontrada');
      }

      return this.toDomain(doc.toObject());
    } catch (error) {
      console.error('Error al actualizar plantilla de documento:', error);
      throw error;
    }
  }

  async eliminarPlantillaDocumento(id: string): Promise<boolean> {
    try {
      const result = await PlantillaDocumentoModel.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      console.error('Error al eliminar plantilla de documento:', error);
      throw error;
    }
  }

  async listarPlantillasDocumento(filtros?: PlantillaDocumentoFiltros, limit = 20, offset = 0): Promise<PlantillaDocumentoConnection> {
    try {
      const conditions: any[] = [];
      if (filtros?.activo !== undefined) {
        conditions.push({ activo: filtros.activo });
      }
      if (filtros?.codigo) {
        conditions.push({ codigo: { $regex: filtros.codigo, $options: 'i' } });
      }
      if (filtros?.nombrePlantilla) {
        conditions.push({ nombrePlantilla: { $regex: filtros.nombrePlantilla, $options: 'i' } });
      }
      if (filtros?.busqueda) {
        conditions.push({
          $or: [
            { codigo: { $regex: filtros.busqueda, $options: 'i' } },
            { nombrePlantilla: { $regex: filtros.busqueda, $options: 'i' } }
          ]
        });
      }
      const matchStage =
        conditions.length === 0
          ? {}
          : conditions.length === 1
            ? conditions[0]
            : { $and: conditions };

      const pipeline: any[] = [
        { $match: matchStage },
        { $sort: { fechaCreacion: -1 } },
        {
          $facet: {
            data: [
              { $skip: offset },
              { $limit: limit }
            ],
            totalCount: [
              { $count: "count" }
            ]
          }
        }
      ];

      const result = await PlantillaDocumentoModel.aggregate(pipeline);
      
      const plantillasDocumento = result[0]?.data || [];
      const totalCount = result[0]?.totalCount?.[0]?.count || 0;

      const plantillasMapeadas = plantillasDocumento.map((doc: any) => this.toDomain(doc));

      return {
        plantillasDocumento: plantillasMapeadas,
        totalCount
      };
    } catch (error) {
      console.error('Error al listar plantillas de documento:', error);
      throw error;
    }
  }

  async obtenerPlantillasDocumentoActivas(): Promise<PlantillaDocumento[]> {
    try {
      const docs = await PlantillaDocumentoModel.find({ activo: true })
        .sort({ nombrePlantilla: 1 });

      return docs.map(doc => this.toDomain(doc.toObject()));
    } catch (error) {
      console.error('Error al obtener plantillas de documento activas:', error);
      throw error;
    }
  }

  async obtenerPlantillasDocumentoInactivas(): Promise<PlantillaDocumento[]> {
    try {
      const docs = await PlantillaDocumentoModel.find({ activo: false })
        .sort({ nombrePlantilla: 1 });

      return docs.map(doc => this.toDomain(doc.toObject()));
    } catch (error) {
      console.error('Error al obtener plantillas de documento inactivas:', error);
      throw error;
    }
  }

  async existeNombrePlantilla(nombrePlantilla: string, excludeId?: string): Promise<boolean> {
    try {
      const query: any = { 
        nombrePlantilla: nombrePlantilla.trim() 
      };
      if (excludeId) {
        query._id = { $ne: excludeId };
      }

      const count = await PlantillaDocumentoModel.countDocuments(query);
      return count > 0;
    } catch (error) {
      console.error('Error al verificar existencia de nombre de plantilla:', error);
      throw error;
    }
  }

  async generarSiguienteCodigo(): Promise<string> {
    try {
      const ultimoDocumento = await PlantillaDocumentoModel
        .findOne({ codigo: { $regex: '^PD' } })
        .sort({ codigo: -1 })
        .select('codigo')
        .exec();

      if (!ultimoDocumento) {
        return 'PD0001';
      }

      const ultimoCodigo = ultimoDocumento.codigo;
      const match = ultimoCodigo.match(/^PD(\d+)$/);
      
      if (!match) {
        return 'PD0001';
      }

      const ultimoNumero = parseInt(match[1] || '0', 10);
      const siguienteNumero = ultimoNumero + 1;
      const siguienteCodigo = `PD${String(siguienteNumero).padStart(4, '0')}`;

      return siguienteCodigo;
    } catch (error) {
      console.error('Error al generar siguiente código:', error);
      return 'PD0001';
    }
  }
}
