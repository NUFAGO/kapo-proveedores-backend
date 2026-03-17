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
      tipoDocumentoId: doc.tipoDocumentoId,
      nombrePlantilla: doc.nombrePlantilla,
      plantillaUrl: doc.plantillaUrl,
      activo: doc.activo,
      fechaCreacion: doc.fechaCreacion.toISOString(),
      fechaActualizacion: doc.fechaActualizacion?.toISOString()
    };
  }

  async crearPlantillaDocumento(input: PlantillaDocumentoInput): Promise<PlantillaDocumento> {
    const codigo = await this.generarSiguienteCodigo();
    
    const newPlantillaDocumento = new PlantillaDocumentoModel({
      codigo,
      tipoDocumentoId: input.tipoDocumentoId.trim(),
      nombrePlantilla: input.nombrePlantilla.trim(),
      plantillaUrl: input.plantillaUrl.trim(),
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
      
      if (input.tipoDocumentoId !== undefined) updateData.tipoDocumentoId = input.tipoDocumentoId.trim();
      if (input.nombrePlantilla !== undefined) updateData.nombrePlantilla = input.nombrePlantilla.trim();
      if (input.plantillaUrl !== undefined) updateData.plantillaUrl = input.plantillaUrl.trim();
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
      const matchStage: any = {};

      // Aplicar filtros
      if (filtros) {
        // Filtro por tipo documento (ID o nombre)
        if (filtros.tipoDocumentoId) {
          matchStage.tipoDocumentoId = filtros.tipoDocumentoId;
        }
        
        // Filtro por nombre de plantilla
        if (filtros.nombrePlantilla) {
          matchStage.nombrePlantilla = { $regex: filtros.nombrePlantilla, $options: 'i' };
        }
        
        // Filtro por código de plantilla
        if (filtros.codigo) {
          matchStage.codigo = { $regex: filtros.codigo, $options: 'i' };
        }
        
        // Filtro por estado activo
        if (filtros.activo !== undefined) {
          matchStage.activo = filtros.activo;
        }

        // Filtro por búsqueda general (busca en código, nombre de plantilla y tipo documento)
        if (filtros.busqueda) {
          matchStage.$or = [
            { codigo: { $regex: filtros.busqueda, $options: 'i' } },
            { nombrePlantilla: { $regex: filtros.busqueda, $options: 'i' } }
          ];
        }
      }

      // Pipeline de agregación con lookup a TipoDocumento
      const pipeline: any[] = [
        { $match: matchStage },
        {
          $lookup: {
            from: 'tipodocumentos', // Mongoose: 'TipoDocumento' -> 'tipodocumentos'
            let: { tipoDocumentoId: '$tipoDocumentoId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ['$_id', { $toObjectId: '$$tipoDocumentoId' }]
                  }
                }
              }
            ],
            as: 'tipoDocumento'
          }
        },
        {
          $unwind: {
            path: '$tipoDocumento',
            preserveNullAndEmptyArrays: true // Mantener documentos sin tipo documento
          }
        },
        // Búsqueda adicional en tipo documento si hay búsqueda general
        ...(filtros?.busqueda ? [{
          $match: {
            $or: [
              { codigo: { $regex: filtros.busqueda, $options: 'i' } },
              { nombrePlantilla: { $regex: filtros.busqueda, $options: 'i' } },
              { 'tipoDocumento.codigo': { $regex: filtros.busqueda, $options: 'i' } },
              { 'tipoDocumento.nombre': { $regex: filtros.busqueda, $options: 'i' } },
              { 'tipoDocumento.descripcion': { $regex: filtros.busqueda, $options: 'i' } }
            ]
          }
        }] : []),
        // Búsqueda específica por tipo documento (código o nombre)
        ...(filtros?.tipoDocumento ? [{
          $match: {
            $or: [
              { 'tipoDocumento.codigo': { $regex: filtros.tipoDocumento, $options: 'i' } },
              { 'tipoDocumento.nombre': { $regex: filtros.tipoDocumento, $options: 'i' } }
            ]
          }
        }] : []),
        {
          $sort: { fechaCreacion: -1 }
        },
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

      // Mapear resultados al dominio
      const plantillasMapeadas = plantillasDocumento.map((doc: any) => {
        const plantilla = this.toDomain(doc);
        // Agregar información del tipo documento si existe
        if (doc.tipoDocumento) {
          return {
            ...plantilla,
            tipoDocumento: doc.tipoDocumento
          };
        }
        return plantilla;
      });

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

  async obtenerPlantillasPorTipoDocumento(tipoDocumentoId: string): Promise<PlantillaDocumento[]> {
    try {
      const docs = await PlantillaDocumentoModel.find({ tipoDocumentoId })
        .sort({ nombrePlantilla: 1 });

      return docs.map(doc => this.toDomain(doc.toObject()));
    } catch (error) {
      console.error('Error al obtener plantillas por tipo de documento:', error);
      throw error;
    }
  }

  async obtenerPlantillaActivaPorTipoDocumento(tipoDocumentoId: string): Promise<PlantillaDocumento | null> {
    try {
      const doc = await PlantillaDocumentoModel.findOne({ 
        tipoDocumentoId, 
        activo: true 
      });
      
      return doc ? this.toDomain(doc.toObject()) : null;
    } catch (error) {
      console.error('Error al obtener plantilla activa por tipo de documento:', error);
      throw error;
    }
  }

  async existeNombrePlantilla(tipoDocumentoId: string, nombrePlantilla: string, excludeId?: string): Promise<boolean> {
    try {
      const query: any = { 
        tipoDocumentoId: tipoDocumentoId.trim(),
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

  async existePlantillaActiva(tipoDocumentoId: string, excludeId?: string): Promise<boolean> {
    try {
      const query: any = { 
        tipoDocumentoId: tipoDocumentoId.trim(),
        activo: true 
      };
      if (excludeId) {
        query._id = { $ne: excludeId };
      }

      const count = await PlantillaDocumentoModel.countDocuments(query);
      return count > 0;
    } catch (error) {
      console.error('Error al verificar existencia de plantilla activa:', error);
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
