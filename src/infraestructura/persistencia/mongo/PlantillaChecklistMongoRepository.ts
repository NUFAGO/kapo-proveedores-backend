import { BaseMongoRepository } from './BaseMongoRepository';
import {
  PlantillaChecklist,
  PlantillaChecklistInput,
  PlantillaChecklistFiltros,
  PlantillaChecklistConnection
} from '../../../dominio/entidades/PlantillaChecklist';
import { IPlantillaChecklistRepository } from '../../../dominio/repositorios/IPlantillaChecklistRepository';
import { PlantillaChecklistModel } from './schemas/PlantillaChecklistSchema';
import { Types } from 'mongoose';

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
      estado: doc.categoriaChecklistId.estado ?? 'activo', // ✅ Agregar campo estado
      fechaCreacion: doc.categoriaChecklistId.fechaCreacion?.toISOString?.() || new Date().toISOString(),
      fechaActualizacion: doc.categoriaChecklistId.fechaActualizacion?.toISOString?.()
    } : undefined;

    const result: PlantillaChecklist = {
      id: doc._id.toString(),
      codigo: doc.codigo,
      nombre: doc.nombre,
      descripcion: doc.descripcion,
      categoriaChecklistId,
      ...(doc.plantillaBaseId != null && doc.plantillaBaseId !== '' && {
        plantillaBaseId: String(doc.plantillaBaseId)
      }),
      ...(categoria && { categoria }),
      activo: doc.activo,
      fechaCreacion: doc.fechaCreacion.toISOString(),
      requisitos: doc.requisitos?.map((req: any) => ({
        id: req._id.toString(),
        checklistId: req.checklistId || doc._id.toString(),
        tipoRequisito: req.tipoRequisito,
        plantillaDocumentoId: req.plantillaDocumentoId,
        formularioId: req.formularioId,
        obligatorio: req.obligatorio,
        orden: req.orden,
        activo: req.activo
      })) || []
    };

    return result;
  }

  async crear(input: PlantillaChecklistInput): Promise<PlantillaChecklist> {
    const newPlantilla = new PlantillaChecklistModel({
      codigo: input.codigo, // Si no se proporciona, se autogenerará
      nombre: input.nombre.trim(),
      descripcion: input.descripcion?.trim(),
      categoriaChecklistId: input.categoriaChecklistId,
      activo: input.activo ?? true
    });

    const savedPlantilla = await newPlantilla.save();
    return this.toDomain(savedPlantilla);
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
      // Validar que el ID sea válido
      if (!Types.ObjectId.isValid(id)) {
        return null;
      }
      
      const objectId = new Types.ObjectId(id);
      
      // Usar aggregation pipeline como en listarConRequisitos
      const pipeline: any[] = [
        // Match por ID y activo (igual que listarConRequisitos)
        { $match: { _id: objectId, activo: true } },
        
        // Agregar campo _id como string para el lookup
        {
          $addFields: {
            checklistIdString: { $toString: "$_id" },
            categoriaChecklistIdString: { $toString: "$categoriaChecklistId" }
          }
        },
        
        // Lookup para traer requisitos
        {
          $lookup: {
            from: 'requisitos_documento',
            localField: 'checklistIdString',
            foreignField: 'checklistId',
            as: 'requisitos'
          }
        },
        
        // Lookup para traer plantillaDocumento de cada requisito
        {
          $lookup: {
            from: 'plantilladocumentos',    // Nombre correcto de la colección (plural y minúsculas)
            let: { requisitosIds: '$requisitos' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ['$_id', {
                      $map: {
                        input: '$$requisitosIds',
                        as: 'req',
                        in: { $toObjectId: '$$req.plantillaDocumentoId' }
                      }
                    }]
                  }
                }
              }
            ],
            as: 'plantillasDocumento'
          }
        },
        
        // Populate de categoría
        {
          $lookup: {
            from: 'categoriachecklists',
            localField: 'categoriaChecklistIdString',
            foreignField: '_id',
            as: 'categoria'
          }
        },
        
        // Unwind de categoría
        { $unwind: { path: '$categoria', preserveNullAndEmptyArrays: true } }
      ];

      const docs = await PlantillaChecklistModel.aggregate(pipeline).exec();
      
      if (docs.length === 0) return null;
      
      const doc = docs[0];

      // Formatear categoría si existe
      const categoria = doc.categoria ? {
        id: doc.categoria._id?.toString() || doc.categoria._id,
        nombre: doc.categoria.nombre,
        tipoUso: doc.categoria.tipoUso || '',
        descripcion: doc.categoria.descripcion,
        estado: doc.categoria.estado ?? 'activo',
        fechaCreacion: doc.categoria.fechaCreacion?.toISOString?.() || new Date().toISOString(),
        fechaActualizacion: doc.categoria.fechaActualizacion?.toISOString?.()
      } : undefined;

      // Formatear requisitos
      const requisitosDomain = (doc.requisitos || [])
        .filter((req: any) => req && req._id)
        .map((req: any) => {
          // Buscar la plantilla de documento asociada
          const plantillaDocumento = req.plantillaDocumentoId && doc.plantillasDocumento
            ? doc.plantillasDocumento.find((pd: any) => pd._id.toString() === req.plantillaDocumentoId)
            : null;

          return {
            id: req._id.toString(),
            checklistId: req.checklistId || doc._id.toString(),
            tipoRequisito: req.tipoRequisito || 'documento',
            plantillaDocumentoId: req.plantillaDocumentoId,
            formularioId: req.formularioId,
            obligatorio: Boolean(req.obligatorio),
            orden: Number(req.orden) || 0,
            activo: req.activo ?? true,
            plantillaDocumento: plantillaDocumento ? {
              id: plantillaDocumento._id.toString(),
              codigo: plantillaDocumento.codigo,
              tipoDocumentoId: plantillaDocumento.tipoDocumentoId,
              nombrePlantilla: plantillaDocumento.nombrePlantilla,
              plantillaUrl: plantillaDocumento.plantillaUrl,
              formatosPermitidos: plantillaDocumento.formatosPermitidos,
              fechaCreacion: plantillaDocumento.fechaCreacion?.toISOString?.() || new Date().toISOString(),
              activo: plantillaDocumento.activo
            } : null
          };
        });

      // Construir objeto de dominio
      return {
        id: doc._id.toString(),
        codigo: doc.codigo,
        nombre: doc.nombre,
        descripcion: doc.descripcion,
        categoriaChecklistId: doc.categoriaChecklistId,
        ...(categoria && { categoria }),
        activo: doc.activo,
        fechaCreacion: doc.fechaCreacion?.toISOString?.() || new Date().toISOString(),
        requisitos: requisitosDomain
      };
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
      }

      // Obtener plantillas con requisitos usando aggregation pipeline (más eficiente)
      const pipeline: any[] = [
        // Match con filtros
        { $match: mongoFiltros },
        
        // Agregar campo _id como string para el lookup
        {
          $addFields: {
            checklistIdString: { $toString: "$_id" },
            categoriaChecklistIdString: { $toString: "$categoriaChecklistId" }
          }
        },
        
        // Lookup para traer requisitos
        {
          $lookup: {
            from: 'requisitos_documento',  //  Nombre real de la colección
            localField: 'checklistIdString', // Usar el string convertido
            foreignField: 'checklistId',     // checklistId ya es string
            as: 'requisitos'
          }
        },
        
        // Lookup para traer plantillaDocumento de cada requisito
        {
          $lookup: {
            from: 'plantilladocumentos',    // Nombre correcto de la colección (plural y minúsculas)
            let: { requisitosIds: '$requisitos' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ['$_id', {
                      $map: {
                        input: '$$requisitosIds',
                        as: 'req',
                        in: { $toObjectId: '$$req.plantillaDocumentoId' }
                      }
                    }]
                  }
                }
              }
            ],
            as: 'plantillasDocumento'
          }
        },
        
        // Populate de categoría
        {
          $lookup: {
            from: 'categoriachecklists',   // Nombre correcto de la colección
            let: { categoriaId: "$categoriaChecklistIdString" }, // Pasar el string como variable
            pipeline: [
              {
                $addFields: {
                  categoriaIdString: { $toString: "$_id" } // Convertir ObjectId a string
                }
              },
              {
                $match: {
                  $expr: {
                    $eq: ["$categoriaIdString", "$$categoriaId"] // Comparar strings
                  }
                }
              }
            ],
            as: 'categoria'
          }
        },
        
        // Unwind de categoría (ya que es uno a uno)
        { $unwind: { path: '$categoria', preserveNullAndEmptyArrays: true } },
        
        // Ordenamiento
        { $sort: { fechaCreacion: -1 } },
        
        // Paginación
        { $skip: offset },
        { $limit: limit }
      ];

      const docs = await PlantillaChecklistModel.aggregate(pipeline).exec();

      // Procesar resultados del aggregation
      const plantillasConRequisitos = docs.map((doc: any) => {
        // Formatear categoría si existe
        const categoria = doc.categoria ? {
          id: doc.categoria._id?.toString() || doc.categoria._id,
          nombre: doc.categoria.nombre,
          tipoUso: doc.categoria.tipoUso || '',
          descripcion: doc.categoria.descripcion,
          estado: doc.categoria.estado ?? 'activo', // ✅ Agregar campo estado
          fechaCreacion: doc.categoria.fechaCreacion?.toISOString?.() || new Date().toISOString(),
          fechaActualizacion: doc.categoria.fechaActualizacion?.toISOString?.()
        } : undefined;

        // Formatear requisitos
        const requisitosDomain = (doc.requisitos || [])
          .filter((req: any) => req && req._id)
          .map((req: any) => {
            // Buscar la plantilla de documento asociada
            const plantillaDocumento = req.plantillaDocumentoId && doc.plantillasDocumento
              ? doc.plantillasDocumento.find((pd: any) => pd._id.toString() === req.plantillaDocumentoId)
              : null;

            return {
              id: req._id.toString(),
              checklistId: req.checklistId || doc._id.toString(),
              tipoRequisito: req.tipoRequisito || 'documento',
              plantillaDocumentoId: req.plantillaDocumentoId,
              formularioId: req.formularioId,
              obligatorio: Boolean(req.obligatorio),
              orden: Number(req.orden) || 0,
              activo: req.activo ?? true,
              plantillaDocumento: plantillaDocumento ? {
                id: plantillaDocumento._id.toString(),
                codigo: plantillaDocumento.codigo,
                tipoDocumentoId: plantillaDocumento.tipoDocumentoId,
                nombrePlantilla: plantillaDocumento.nombrePlantilla,
                plantillaUrl: plantillaDocumento.plantillaUrl,
                formatosPermitidos: plantillaDocumento.formatosPermitidos,
                fechaCreacion: plantillaDocumento.fechaCreacion?.toISOString?.() || new Date().toISOString(),
                activo: plantillaDocumento.activo
              } : null
            };
          });

        // Construir objeto de dominio
        return {
          id: doc._id.toString(),
          codigo: doc.codigo,
          nombre: doc.nombre,
          descripcion: doc.descripcion,
          categoriaChecklistId: doc.categoriaChecklistId,
          ...(categoria && { categoria }),
          activo: doc.activo,
          fechaCreacion: doc.fechaCreacion?.toISOString?.() || new Date().toISOString(),
          requisitos: requisitosDomain
        };
      });

      const totalCount = await PlantillaChecklistModel.countDocuments(mongoFiltros);

      return {
        plantillasChecklist: plantillasConRequisitos,
        totalCount
      };
    } catch (error) {
      console.error('Error al listar plantillas con requisitos:', error);
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
        .sort({ fechaCreacion: -1 });

      return docs.map(doc => this.toDomain(doc));
    } catch (error) {
      console.error('Error al listar plantillas de checklist por categoría:', error);
      throw error;
    }
  }

  async listarPorPlantillaBase(plantillaBaseId: string): Promise<PlantillaChecklist[]> {
    try {
      if (!Types.ObjectId.isValid(plantillaBaseId)) {
        return [];
      }
      const docs = await PlantillaChecklistModel.find({
        plantillaBaseId,
        _id: { $ne: new Types.ObjectId(plantillaBaseId) }
      }).sort({ fechaCreacion: -1 });

      return docs.map(doc => this.toDomain(doc));
    } catch (error) {
      console.error('Error al listar plantillas por plantilla base:', error);
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

  // MÉTODO BATCH OPTIMIZADO CON REQUISITOS
  async obtenerPorIds(ids: string[]): Promise<PlantillaChecklist[]> {
    try {
      if (!ids || ids.length === 0) {
        return [];
      }

      // Convertir IDs a ObjectId para el aggregation
      const objectIds = ids.map(id => new Types.ObjectId(id));

      // Usar aggregation pipeline para incluir requisitos como en listarConRequisitos
      const pipeline: any[] = [
        // Match por IDs
        { $match: { _id: { $in: objectIds } } },
        
        // Agregar campo _id como string para el lookup
        {
          $addFields: {
            checklistIdString: { $toString: "$_id" },
            categoriaChecklistIdString: { $toString: "$categoriaChecklistId" }
          }
        },
        
        // Lookup para traer requisitos
        {
          $lookup: {
            from: 'requisitos_documento',
            localField: 'checklistIdString',
            foreignField: 'checklistId',
            as: 'requisitos'
          }
        },
        
        // Lookup para traer plantillaDocumento de cada requisito
        {
          $lookup: {
            from: 'plantilladocumentos',
            let: { requisitosIds: '$requisitos' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $in: ['$_id', {
                      $map: {
                        input: '$$requisitosIds',
                        as: 'req',
                        in: { $toObjectId: '$$req.plantillaDocumentoId' }
                      }
                    }]
                  }
                }
              }
            ],
            as: 'plantillasDocumento'
          }
        },
        
        // Populate de categoría
        {
          $lookup: {
            from: 'categoriachecklists',
            let: { categoriaId: "$categoriaChecklistIdString" },
            pipeline: [
              {
                $addFields: {
                  categoriaIdString: { $toString: "$_id" }
                }
              },
              {
                $match: {
                  $expr: {
                    $eq: ["$categoriaIdString", "$$categoriaId"]
                  }
                }
              }
            ],
            as: 'categoria'
          }
        },
        
        // Unwind de categoría
        { $unwind: { path: '$categoria', preserveNullAndEmptyArrays: true } }
      ];

      const docs = await PlantillaChecklistModel.aggregate(pipeline).exec();

      // Procesar resultados igual que en listarConRequisitos
      return docs.map((doc: any) => {
        // Formatear categoría si existe
        const categoria = doc.categoria ? {
          id: doc.categoria._id?.toString() || doc.categoria._id,
          nombre: doc.categoria.nombre,
          tipoUso: doc.categoria.tipoUso || '',
          descripcion: doc.categoria.descripcion,
          estado: doc.categoria.estado ?? 'activo',
          fechaCreacion: doc.categoria.fechaCreacion?.toISOString?.() || new Date().toISOString(),
          fechaActualizacion: doc.categoria.fechaActualizacion?.toISOString?.()
        } : undefined;

        // Formatear requisitos
        const requisitosDomain = (doc.requisitos || [])
          .filter((req: any) => req && req._id)
          .map((req: any) => {
            // Buscar la plantilla de documento asociada
            const plantillaDocumento = req.plantillaDocumentoId && doc.plantillasDocumento
              ? doc.plantillasDocumento.find((pd: any) => pd._id.toString() === req.plantillaDocumentoId)
              : null;

            return {
              id: req._id.toString(),
              checklistId: req.checklistId || doc._id.toString(),
              tipoRequisito: req.tipoRequisito || 'documento',
              plantillaDocumentoId: req.plantillaDocumentoId,
              formularioId: req.formularioId,
              obligatorio: Boolean(req.obligatorio),
              orden: Number(req.orden) || 0,
              activo: req.activo ?? true,
              plantillaDocumento: plantillaDocumento ? {
                id: plantillaDocumento._id.toString(),
                codigo: plantillaDocumento.codigo,
                tipoDocumentoId: plantillaDocumento.tipoDocumentoId,
                nombrePlantilla: plantillaDocumento.nombrePlantilla,
                plantillaUrl: plantillaDocumento.plantillaUrl,
                formatosPermitidos: plantillaDocumento.formatosPermitidos,
                fechaCreacion: plantillaDocumento.fechaCreacion?.toISOString?.() || new Date().toISOString(),
                activo: plantillaDocumento.activo
              } : null
            };
          });

        // Construir objeto de dominio
        return {
          id: doc._id.toString(),
          codigo: doc.codigo,
          nombre: doc.nombre,
          descripcion: doc.descripcion,
          categoriaChecklistId: doc.categoriaChecklistId,
          ...(categoria && { categoria }),
          activo: doc.activo,
          fechaCreacion: doc.fechaCreacion?.toISOString?.() || new Date().toISOString(),
          fechaActualizacion: doc.fechaActualizacion?.toISOString?.(),
          requisitos: requisitosDomain
        };
      });
    } catch (error) {
      console.error('Error al obtener plantillas por IDs:', error);
      throw error;
    }
  }


  async listarVigentes(): Promise<PlantillaChecklist[]> {
    try {
      const docs = await PlantillaChecklistModel.find({ activo: true })
        .populate({
          path: 'categoriaChecklistId',
          select: 'nombre tipoUso descripcion fechaCreacion fechaActualizacion',
          match: { nombre: { $exists: true, $ne: null } }
        })
        .sort({ fechaCreacion: -1 });
      
      return docs.map(doc => this.toDomain(doc));
    } catch (error) {
      console.error('Error al listar plantillas vigentes:', error);
      throw error;
    }
  }

// ...
}
