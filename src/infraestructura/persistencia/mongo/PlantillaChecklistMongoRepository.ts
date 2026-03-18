import { BaseMongoRepository } from './BaseMongoRepository';
import {
  PlantillaChecklist,
  PlantillaChecklistInput,
  PlantillaChecklistFiltros,
  PlantillaChecklistConnection
} from '../../../dominio/entidades/PlantillaChecklist';
import { IPlantillaChecklistRepository } from '../../../dominio/repositorios/IPlantillaChecklistRepository';
import { PlantillaChecklistModel } from './schemas/PlantillaChecklistSchema';

export class PlantillaChecklistMongoRepository extends BaseMongoRepository<PlantillaChecklist> implements IPlantillaChecklistRepository {
  constructor() {
    super(PlantillaChecklistModel as any);
  }

  protected toDomain(doc: any): PlantillaChecklist {
    // Determinar si categoriaChecklistId está populada
    const isCategoriaPopulated = doc.categoriaChecklistId && typeof doc.categoriaChecklistId === 'object' && doc.categoriaChecklistId._id;
    
    // Obtener el ID de categoria (siempre string)
    const categoriaChecklistId = isCategoriaPopulated 
      ? doc.categoriaChecklistId._id.toString() 
      : doc.categoriaChecklistId?.toString() || '';

    // Construir categoria si está populada
    const categoria = isCategoriaPopulated ? {
      id: doc.categoriaChecklistId._id.toString(),
      nombre: doc.categoriaChecklistId.nombre,
      tipoUso: doc.categoriaChecklistId.tipoUso || '',
      descripcion: doc.categoriaChecklistId.descripcion,
      fechaCreacion: doc.categoriaChecklistId.fechaCreacion?.toISOString?.() || new Date().toISOString(),
      fechaActualizacion: doc.categoriaChecklistId.fechaActualizacion?.toISOString?.()
    } : undefined;

    const fechaActualizacion = doc.fechaActualizacion?.toISOString();

    const result: PlantillaChecklist = {
      id: doc._id.toString(),
      codigo: doc.codigo,
      nombre: doc.nombre,
      categoriaChecklistId,
      version: doc.version,
      plantillaBaseId: doc.plantillaBaseId,
      vigente: doc.vigente,
      activo: doc.activo,
      fechaCreacion: doc.fechaCreacion.toISOString(),
      requisitos: doc.requisitos?.map((req: any) => ({
        id: req._id.toString(),
        checklistId: req.checklistId || doc._id.toString(),
        tipoRequisito: req.tipoRequisito,
        plantillaDocumentoId: req.plantillaDocumentoId,
        formularioId: req.formularioId,
        obligatorio: req.obligatorio,
        formatosPermitidos: req.formatosPermitidos,
        orden: req.orden,
        plantillaDocumento: req.plantillaDocumento ? {
          id: req.plantillaDocumento._id?.toString() || req.plantillaDocumento.toString(),
          nombrePlantilla: req.plantillaDocumento.nombrePlantilla,
          plantillaUrl: req.plantillaDocumento.plantillaUrl,
          activo: req.plantillaDocumento.activo,
          tipoDocumento: req.plantillaDocumento.tipoDocumento ? {
            id: req.plantillaDocumento.tipoDocumento._id?.toString() || req.plantillaDocumento.tipoDocumento.toString(),
            codigo: req.plantillaDocumento.tipoDocumento.codigo,
            nombre: req.plantillaDocumento.tipoDocumento.nombre,
            descripcion: req.plantillaDocumento.tipoDocumento.descripcion
          } : undefined
        } : undefined,
        formulario: req.formulario ? {
          id: req.formulario._id?.toString() || req.formulario.toString(),
          nombre: req.formulario.nombre,
          descripcion: req.formulario.descripcion
        } : undefined
      })) || [],
      ...(doc.descripcion && { descripcion: doc.descripcion }),
      ...(categoria && { categoria }),
      ...(fechaActualizacion && { fechaActualizacion })
    };

    return result;
  }

  async crear(input: PlantillaChecklistInput): Promise<PlantillaChecklist> {
    const newPlantilla = new PlantillaChecklistModel({
      codigo: input.codigo, // Si no se proporciona, se autogenerará
      nombre: input.nombre.trim(),
      descripcion: input.descripcion?.trim(),
      categoriaChecklistId: input.categoriaChecklistId,
      version: input.version || 1, // Por defecto versión 1
      plantillaBaseId: input.plantillaBaseId,
      vigente: input.vigente !== undefined ? input.vigente : true, // Por defecto vigente
      activo: input.activo !== undefined ? input.activo : true // Por defecto activo
    });

    const saved = await newPlantilla.save();
    return this.toDomain(saved);
  }

  async obtenerPorId(id: string): Promise<PlantillaChecklist | null> {
    try {
      const doc = await PlantillaChecklistModel.findById(id)
        .populate({
          path: 'categoriaChecklistId',
          select: 'nombre tipoUso descripcion fechaCreacion fechaActualizacion',
          match: { nombre: { $exists: true, $ne: null } }
        });
      return doc ? this.toDomain(doc) : null;
    } catch (error) {
      console.error('Error al obtener plantilla de checklist:', error);
      throw error;
    }
  }

  async obtenerConRequisitos(id: string): Promise<PlantillaChecklist | null> {
    try {
      const doc = await PlantillaChecklistModel.findById(id)
        .populate({
          path: 'categoriaChecklistId',
          select: 'nombre tipoUso descripcion fechaCreacion fechaActualizacion',
          match: { nombre: { $exists: true, $ne: null } } // Solo populate si nombre existe y no es null
        })
        .populate({
          path: 'requisitos',
          populate: {
            path: 'plantillaDocumento',
            populate: {
              path: 'tipoDocumento',
              select: 'codigo nombre descripcion'
            }
          }
        }); // Populate de requisitos y sus tipos de documento
        
      if (!doc) return null;

      return this.toDomain(doc);
    } catch (error) {
      console.error('Error al obtener plantilla de checklist con requisitos:', error);
      throw error;
    }
  }

  async actualizar(id: string, input: Partial<PlantillaChecklistInput>): Promise<PlantillaChecklist | null> {
    try {
      const updateData: any = {};

      if (input.codigo !== undefined) updateData.codigo = input.codigo;
      if (input.nombre !== undefined) updateData.nombre = input.nombre.trim();
      if (input.descripcion !== undefined) updateData.descripcion = input.descripcion?.trim();
      if (input.categoriaChecklistId !== undefined) updateData.categoriaChecklistId = input.categoriaChecklistId;
      if (input.version !== undefined) updateData.version = input.version;
      if (input.plantillaBaseId !== undefined) updateData.plantillaBaseId = input.plantillaBaseId;
      if (input.vigente !== undefined) updateData.vigente = input.vigente;
      if (input.activo !== undefined) updateData.activo = input.activo;

      const doc = await PlantillaChecklistModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!doc) {
        throw new Error('Plantilla de checklist no encontrada');
      }

      return this.toDomain(doc);
    } catch (error) {
      console.error('Error al actualizar plantilla de checklist:', error);
      throw error;
    }
  }

  async eliminar(id: string): Promise<boolean> {
    try {
      const result = await PlantillaChecklistModel.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      console.error('Error al eliminar plantilla de checklist:', error);
      throw error;
    }
  }

  async listarConFiltros(
    filtros?: PlantillaChecklistFiltros,
    limit?: number,
    offset = 0
  ): Promise<PlantillaChecklistConnection> {
    try {
      const query: any = {};

      // Aplicar filtros
      if (filtros) {
        if (filtros.nombre) {
          query.nombre = { $regex: filtros.nombre, $options: 'i' };
        }
        if (filtros.activo !== undefined) {
          query.activo = filtros.activo;
        }
        if (filtros.categoriaTipoUso) {
          // Este filtro requiere join con CategoriaChecklist, por ahora lo ignoramos
          // Se puede implementar más tarde si es necesario
        }
      }

      // Contar total de documentos
      const totalCount = await PlantillaChecklistModel.countDocuments(query);

      // Obtener documentos con paginación
      const docs = await PlantillaChecklistModel.find(query)
        .sort({ fechaCreacion: -1 })
        .skip(offset)
        .limit(limit || 20); // Valor por defecto si limit es undefined

      const plantillasChecklist = docs.map(doc => this.toDomain(doc));

      return {
        plantillasChecklist: plantillasChecklist || [], // Asegurar que nunca sea null
        totalCount
      };
    } catch (error) {
      console.error('Error al listar plantillas de checklist:', error);
      throw error;
    }
  }

  async listarConRequisitos(
    filtros?: PlantillaChecklistFiltros,
    limit = 20,
    offset = 0
  ): Promise<PlantillaChecklistConnection> {
    try {
      // Construir filtros de MongoDB
      const mongoFiltros: any = { activo: true };
      
      if (filtros) {
        if (filtros.codigo) {
          mongoFiltros.codigo = { $regex: filtros.codigo, $options: 'i' };
        }
        if (filtros.nombre) {
          mongoFiltros.nombre = { $regex: filtros.nombre, $options: 'i' };
        }
        if (filtros.categoriaChecklistId) {
          mongoFiltros.categoriaChecklistId = filtros.categoriaChecklistId;
        }
        if (filtros.activo !== undefined) {
          mongoFiltros.activo = filtros.activo;
        }
        if (filtros.vigente !== undefined) {
          mongoFiltros.vigente = filtros.vigente;
        }
      }

      // Obtener documentos con populate seguro
      const docs = await PlantillaChecklistModel.find(mongoFiltros)
        .populate({
          path: 'categoriaChecklistId',
          select: 'nombre tipoUso descripcion fechaCreacion fechaActualizacion',
          match: { nombre: { $exists: true, $ne: null } } // Solo populate si nombre existe y no es null
        })
        .populate({
          path: 'requisitos',
          populate: {
            path: 'plantillaDocumento',
            populate: {
              path: 'tipoDocumento',
              select: 'codigo nombre descripcion'
            }
          }
        }) // Populate de requisitos y sus tipos de documento
        .sort({ fechaCreacion: -1 })
        .limit(limit)
        .skip(offset)
        .exec();

      const totalCount = await PlantillaChecklistModel.countDocuments(mongoFiltros);

      return {
        plantillasChecklist: docs.map(doc => this.toDomain(doc)),
        totalCount
      };
    } catch (error) {
      console.error('Error al listar plantillas de checklist con requisitos:', error);
      throw error;
    }
  }

  async listarActivas(): Promise<PlantillaChecklist[]> {
    try {
      const docs = await PlantillaChecklistModel.find({ activo: true })
        .sort({ nombre: 1 });

      return docs.map(doc => this.toDomain(doc));
    } catch (error) {
      console.error('Error al listar plantillas de checklist activas:', error);
      throw error;
    }
  }

  async listarInactivas(): Promise<PlantillaChecklist[]> {
    try {
      const docs = await PlantillaChecklistModel.find({ activo: false })
        .sort({ nombre: 1 });

      return docs.map(doc => this.toDomain(doc));
    } catch (error) {
      console.error('Error al listar plantillas de checklist inactivas:', error);
      throw error;
    }
  }

  async listarPorCategoria(categoriaChecklistId: string): Promise<PlantillaChecklist[]> {
    try {
      const docs = await PlantillaChecklistModel.find({ categoriaChecklistId })
        .sort({ version: -1 });

      return docs.map(doc => this.toDomain(doc));
    } catch (error) {
      console.error('Error al listar plantillas de checklist por categoría:', error);
      throw error;
    }
  }

  async contarPorFiltros(filtros?: PlantillaChecklistFiltros): Promise<number> {
    try {
      const query: any = {};

      if (filtros) {
        if (filtros.nombre) {
          query.nombre = { $regex: filtros.nombre, $options: 'i' };
        }
        if (filtros.categoriaChecklistId) {
          query.categoriaChecklistId = filtros.categoriaChecklistId;
        }
        if (filtros.activo !== undefined) {
          query.activo = filtros.activo;
        }
      }

      return await PlantillaChecklistModel.countDocuments(query);
    } catch (error) {
      console.error('Error al contar plantillas de checklist:', error);
      throw error;
    }
  }

  async existeNombre(nombre: string, excludeId?: string): Promise<boolean> {
    try {
      const query: any = { nombre: nombre.trim() };
      if (excludeId) {
        query._id = { $ne: excludeId };
      }

      const count = await PlantillaChecklistModel.countDocuments(query);
      return count > 0;
    } catch (error) {
      console.error('Error al verificar existencia de nombre:', error);
      throw error;
    }
  }

  async obtenerUltimaVersion(categoriaChecklistId: string): Promise<number> {
    try {
      const doc = await PlantillaChecklistModel.findOne({ categoriaChecklistId })
        .sort({ version: -1 })
        .limit(1);

      return doc ? doc.version : 0;
    } catch (error) {
      console.error('Error al obtener última versión:', error);
      throw error;
    }
  }

  async listarPorPlantillaBase(plantillaBaseId: string): Promise<PlantillaChecklist[]> {
    try {
      const docs = await PlantillaChecklistModel.find({ plantillaBaseId })
        .sort({ version: -1 });

      return docs.map(doc => this.toDomain(doc));
    } catch (error) {
      console.error('Error al listar plantillas por plantilla base:', error);
      throw error;
    }
  }

  // Nuevos métodos para versionamiento
  async obtenerVersionesPorCodigo(codigo: string): Promise<PlantillaChecklist[]> {
    try {
      const docs = await PlantillaChecklistModel.find({ codigo })
        .sort({ version: 1 });

      return docs.map(doc => this.toDomain(doc));
    } catch (error) {
      console.error('Error al obtener versiones por código:', error);
      throw error;
    }
  }

  async obtenerVersionVigentePorCodigo(codigo: string): Promise<PlantillaChecklist | null> {
    try {
      const doc = await PlantillaChecklistModel.findOne({ codigo, vigente: true });
      return doc ? this.toDomain(doc) : null;
    } catch (error) {
      console.error('Error al obtener versión vigente por código:', error);
      throw error;
    }
  }

  async crearNuevaVersion(checklistId: string): Promise<PlantillaChecklist> {
    try {
      // Obtener la versión actual
      const actual = await PlantillaChecklistModel.findById(checklistId);
      if (!actual) {
        throw new Error('Plantilla de checklist no encontrada');
      }

      // Desactivar versión vigente actual
      await PlantillaChecklistModel.updateOne(
        { codigo: actual.codigo, vigente: true },
        { vigente: false }
      );

      // Obtener la última versión para este código
      const ultimaVersion = await PlantillaChecklistModel.findOne({ codigo: actual.codigo })
        .sort({ version: -1 });

      const nuevaVersion = (ultimaVersion?.version || 0) + 1;

      // Crear nueva versión
      const nuevaPlantilla = new PlantillaChecklistModel({
        codigo: actual.codigo, // Mantener el mismo código
        nombre: `${actual.nombre} v${nuevaVersion}`,
        descripcion: actual.descripcion,
        categoriaChecklistId: actual.categoriaChecklistId,
        version: nuevaVersion,
        plantillaBaseId: actual.plantillaBaseId, // Mismo plantillaBaseId
        vigente: true, // Nueva versión es vigente
        activo: true
      });

      const saved = await nuevaPlantilla.save();
      return this.toDomain(saved.toObject());
    } catch (error) {
      console.error('Error al crear nueva versión:', error);
      throw error;
    }
  }

  async listarVigentes(): Promise<PlantillaChecklist[]> {
    try {
      const docs = await PlantillaChecklistModel.find({ vigente: true })
        .sort({ nombre: 1 });

      return docs.map(doc => this.toDomain(doc));
    } catch (error) {
      console.error('Error al listar plantillas vigentes:', error);
      throw error;
    }
  }
}
