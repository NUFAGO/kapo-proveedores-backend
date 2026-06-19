import { BaseMongoRepository } from './BaseMongoRepository';
import {
  PlantillaChecklist,
  PlantillaChecklistInput,
  PlantillaChecklistFiltros,
  PlantillaChecklistConnection,
  RequisitoDocumento,
} from '../../../dominio/entidades/PlantillaChecklist';
import { IPlantillaChecklistRepository } from '../../../dominio/repositorios/IPlantillaChecklistRepository';
import { PlantillaChecklistModel } from './schemas/PlantillaChecklistSchema';
import { Types } from 'mongoose';

function idsMatch(a: unknown, b: unknown): boolean {
  if (a == null || b == null) return false;
  return String(a).trim() === String(b).trim();
}

function findPlantillaDocumento(
  plantillas: Array<{ _id: unknown }> | undefined,
  plantillaDocumentoId: unknown,
) {
  if (!plantillas?.length || plantillaDocumentoId == null) return null;
  return plantillas.find((pd) => idsMatch(pd._id, plantillaDocumentoId)) ?? null;
}

function findFormulario(
  formularios: Array<{ _id: unknown; nombre?: string }> | undefined,
  formularioId: unknown,
) {
  if (!formularios?.length || formularioId == null) return null;
  return formularios.find((f) => idsMatch(f._id, formularioId)) ?? null;
}

function parseTipoRequisito(value: unknown): 'documento' | 'formulario' {
  const v = String(value ?? 'documento').trim().toLowerCase();
  return v === 'formulario' ? 'formulario' : 'documento';
}

function asOptionalId(value: unknown): string | undefined {
  if (value == null || value === '') return undefined;
  return String(value).trim();
}

/** Stages compartidos: requisitos + plantillas + formularios + categoría unwind previo. */
function requisitosLookupStages(): Record<string, unknown>[] {
  return [
    {
      $lookup: {
        from: 'requisitos_documento',
        localField: 'checklistIdString',
        foreignField: 'checklistId',
        as: 'requisitos',
      },
    },
    {
      $lookup: {
        from: 'plantilladocumentos',
        let: { requisitosIds: '$requisitos' },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: [
                  '$_id',
                  {
                    $map: {
                      input: {
                        $filter: {
                          input: '$$requisitosIds',
                          as: 'req',
                          cond: {
                            $and: [
                              { $ne: ['$$req.plantillaDocumentoId', null] },
                              { $ne: ['$$req.plantillaDocumentoId', ''] },
                            ],
                          },
                        },
                      },
                      as: 'req',
                      in: { $toObjectId: '$$req.plantillaDocumentoId' },
                    },
                  },
                ],
              },
            },
          },
        ],
        as: 'plantillasDocumento',
      },
    },
    {
      $lookup: {
        from: 'plantillaformularios',
        let: { requisitosIds: '$requisitos' },
        pipeline: [
          {
            $match: {
              $expr: {
                $in: [
                  '$_id',
                  {
                    $map: {
                      input: {
                        $filter: {
                          input: '$$requisitosIds',
                          as: 'req',
                          cond: {
                            $and: [
                              { $ne: ['$$req.formularioId', null] },
                              { $ne: ['$$req.formularioId', ''] },
                            ],
                          },
                        },
                      },
                      as: 'req',
                      in: { $toObjectId: '$$req.formularioId' },
                    },
                  },
                ],
              },
            },
          },
        ],
        as: 'formularios',
      },
    },
  ];
}

function mapRequisitosFromAggregationDoc(
  doc: {
    _id: unknown;
    requisitos?: unknown[];
    plantillasDocumento?: Array<Record<string, unknown>>;
    formularios?: Array<Record<string, unknown>>;
  },
  options?: { onlyActive?: boolean },
): RequisitoDocumento[] {
  return (doc.requisitos || [])
    .filter((req: unknown) => req && typeof req === 'object' && (req as { _id?: unknown })._id)
    .filter((req: unknown) => {
      if (!options?.onlyActive) return true;
      return (req as { activo?: boolean }).activo !== false;
    })
    .map((req: unknown): RequisitoDocumento => {
      const row = req as Record<string, unknown>;
      const plantillaDocumento = findPlantillaDocumento(
        doc.plantillasDocumento as Array<{ _id: unknown }> | undefined,
        row['plantillaDocumentoId'],
      );
      const formularioRow = findFormulario(
        doc.formularios as Array<{ _id: unknown; nombre?: string }> | undefined,
        row['formularioId'],
      );
      if (row['plantillaDocumentoId'] && !plantillaDocumento) {
        console.warn('[PlantillaChecklistMongoRepository] plantillaDocumento join miss', {
          requisitoId: String(row['_id']),
          plantillaDocumentoId: row['plantillaDocumentoId'],
        });
      }
      const plantillaDocumentoId = asOptionalId(row['plantillaDocumentoId']);
      const formularioId = asOptionalId(row['formularioId']);
      const mapped: RequisitoDocumento = {
        id: String(row['_id']),
        checklistId: String(row['checklistId'] ?? doc._id),
        tipoRequisito: parseTipoRequisito(row['tipoRequisito']),
        obligatorio: Boolean(row['obligatorio']),
        orden: Number(row['orden']) || 0,
        activo: row['activo'] !== false,
        ...(plantillaDocumentoId !== undefined && { plantillaDocumentoId }),
        ...(formularioId !== undefined && { formularioId }),
        ...(plantillaDocumento && {
          plantillaDocumento: {
            id: String(plantillaDocumento._id),
            codigo: String((plantillaDocumento as { codigo?: string }).codigo ?? ''),
            nombrePlantilla: String(
              (plantillaDocumento as { nombrePlantilla?: string }).nombrePlantilla ?? '',
            ),
            plantillaUrl: String((plantillaDocumento as { plantillaUrl?: string }).plantillaUrl ?? ''),
            activo: (plantillaDocumento as { activo?: boolean }).activo !== false,
          },
        }),
        ...(formularioRow && {
          formulario: {
            id: String(formularioRow._id),
            nombre: formularioRow.nombre ?? '',
            version: Number((formularioRow as { version?: number }).version) || 1,
            activo: (formularioRow as { activo?: boolean }).activo !== false,
          },
        }),
      };
      return mapped;
    });
}

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
        // Match solo por ID. No filtrar por activo: el modal de edición y los lugares
        // que consumen una plantilla por id deben funcionar también para inactivas.
        { $match: { _id: objectId } },
        
        // Agregar campo _id como string para el lookup
        {
          $addFields: {
            checklistIdString: { $toString: "$_id" },
            categoriaChecklistIdString: { $toString: "$categoriaChecklistId" }
          }
        },
        ...requisitosLookupStages(),
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
      const requisitosDomain = mapRequisitosFromAggregationDoc(doc);

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
      // Construir filtros de MongoDB. No filtrar por activo por defecto:
      // los listados admin necesitan ver activas + inactivas. El filtro
      // por activo solo se aplica cuando el caller lo pide explícitamente
      // (ej. el modal de asignación de checklist en expediente envía activo: true).
      const mongoFiltros: any = {};

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
        ...requisitosLookupStages(),
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
        const requisitosDomain = mapRequisitosFromAggregationDoc(doc);

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
        ...requisitosLookupStages(),
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

        // Requisitos activos solamente (usado por obtenerExpedienteCompleto vía batch)
        const requisitosDomain = mapRequisitosFromAggregationDoc(doc, { onlyActive: true });

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
