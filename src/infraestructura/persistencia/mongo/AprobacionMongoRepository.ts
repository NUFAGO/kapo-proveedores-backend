import { IAprobacionRepository, SetRevisorFields } from '../../../dominio/repositorios/IAprobacionRepository';
import {
  Aprobacion,
  CrearAprobacionInput,
  AprobacionFiltros,
  AprobacionConnection,
  ItemComentarioAprobacion,
  EstadoAprobacion,
  RevisionRequisitoComentario,
} from '../../../dominio/entidades/Aprobacion';
import { AprobacionModel } from './schemas/AprobacionSchema';

function mapRevision(raw: any): RevisionRequisitoComentario {
  return {
    requisitoDocumentoId: raw.requisitoDocumentoId,
    resultado: raw.resultado,
  };
}

function mapComentario(
  raw: any,
  legacyResultado?: 'OBSERVADO' | 'APROBADO'
): ItemComentarioAprobacion {
  const base: ItemComentarioAprobacion = {
    mensaje: raw.mensaje,
    usuarioId: raw.usuarioId,
    fecha: raw.fecha instanceof Date ? raw.fecha : new Date(raw.fecha),
  };
  if (raw.usuarioNombre != null && raw.usuarioNombre !== '') {
    base.usuarioNombre = raw.usuarioNombre;
  }
  const revs = raw.revisionesRequisito;
  if (Array.isArray(revs) && revs.length > 0) {
    base.revisionesRequisito = revs.map(mapRevision);
  } else if (
    legacyResultado &&
    raw.requisitoDocumentoId != null &&
    String(raw.requisitoDocumentoId) !== ''
  ) {
    base.revisionesRequisito = [
      { requisitoDocumentoId: String(raw.requisitoDocumentoId), resultado: legacyResultado },
    ];
  }
  return base;
}

function toMongoComentario(item: ItemComentarioAprobacion): Record<string, unknown> {
  const o: Record<string, unknown> = {
    mensaje: item.mensaje,
    usuarioId: item.usuarioId,
    fecha: item.fecha ?? new Date(),
  };
  if (item.usuarioNombre !== undefined && item.usuarioNombre !== '') {
    o['usuarioNombre'] = item.usuarioNombre;
  }
  if (item.revisionesRequisito !== undefined && item.revisionesRequisito.length > 0) {
    o['revisionesRequisito'] = item.revisionesRequisito.map((r) => ({
      requisitoDocumentoId: r.requisitoDocumentoId,
      resultado: r.resultado,
    }));
  }
  return o;
}

export class AprobacionMongoRepository implements IAprobacionRepository {
  protected toDomain(doc: any): Aprobacion {
    const base: Aprobacion = {
      id: doc._id.toString(),
      entidadTipo: doc.entidadTipo,
      entidadId: doc.entidadId,
      expedienteId: doc.expedienteId,
      estado: doc.estado,
      fechaEnvio: doc.fechaEnvio instanceof Date ? doc.fechaEnvio : new Date(doc.fechaEnvio),
      numeroCiclo: doc.numeroCiclo ?? 1,
      observaciones: (doc.observaciones || []).map((r: any) => mapComentario(r, 'OBSERVADO')),
      comentariosAprobacion: (doc.comentariosAprobacion || []).map((r: any) =>
        mapComentario(r, 'APROBADO')
      ),
      comentariosRechazo: (doc.comentariosRechazo || []).map((r: any) => mapComentario(r)),
    };
    if (doc.solicitanteId !== undefined && doc.solicitanteId !== null && doc.solicitanteId !== '') {
      base.solicitanteId = doc.solicitanteId;
    }
    if (doc.solicitanteNombre !== undefined && doc.solicitanteNombre !== null && doc.solicitanteNombre !== '') {
      base.solicitanteNombre = doc.solicitanteNombre;
    }
    if (doc.revisorId !== undefined && doc.revisorId !== null && doc.revisorId !== '') {
      base.revisorId = doc.revisorId;
    }
    if (doc.revisorNombre !== undefined && doc.revisorNombre !== null && doc.revisorNombre !== '') {
      base.revisorNombre = doc.revisorNombre;
    }
    if (doc.fechaUltimaRevision) {
      base.fechaUltimaRevision =
        doc.fechaUltimaRevision instanceof Date
          ? doc.fechaUltimaRevision
          : new Date(doc.fechaUltimaRevision);
    }
    if (doc.montoSolicitado !== undefined && doc.montoSolicitado !== null) {
      base.montoSolicitado = Number(doc.montoSolicitado);
    }
    if (doc.tipoPagoOCId !== undefined && doc.tipoPagoOCId !== null && doc.tipoPagoOCId !== '') {
      base.tipoPagoOCId = doc.tipoPagoOCId;
    }
    return base;
  }

  async crear(input: CrearAprobacionInput, session?: any): Promise<Aprobacion> {
    const payload = {
      entidadTipo: input.entidadTipo,
      entidadId: input.entidadId,
      expedienteId: input.expedienteId,
      ...(input.montoSolicitado !== undefined && input.montoSolicitado !== null
        ? { montoSolicitado: input.montoSolicitado }
        : {}),
      ...(input.tipoPagoOCId !== undefined && input.tipoPagoOCId !== null && input.tipoPagoOCId !== ''
        ? { tipoPagoOCId: input.tipoPagoOCId }
        : {}),
      solicitanteId: input.solicitanteId,
      solicitanteNombre: input.solicitanteNombre,
      estado: 'EN_REVISION',
      fechaEnvio: new Date(),
      numeroCiclo: 1,
      observaciones: [],
      comentariosAprobacion: [],
      comentariosRechazo: [],
    };
    if (session) {
      const [doc] = await AprobacionModel.create([payload], { session });
      return this.toDomain(doc);
    }
    const doc = await AprobacionModel.create(payload);
    return this.toDomain(doc);
  }

  async obtenerPorId(id: string): Promise<Aprobacion | null> {
    const doc = await AprobacionModel.findById(id).lean();
    return doc ? this.toDomain(doc) : null;
  }

  async obtenerPorEntidad(entidadTipo: string, entidadId: string, session?: any): Promise<Aprobacion | null> {
    let q = AprobacionModel.findOne({ entidadTipo, entidadId });
    if (session) q = q.session(session);
    const doc = await q.lean();
    return doc ? this.toDomain(doc) : null;
  }

  async listarPorEntidadTipoYEntidadIds(
    entidadTipo: string,
    entidadIds: string[],
    session?: any
  ): Promise<Aprobacion[]> {
    if (!entidadIds.length) return [];
    let q = AprobacionModel.find({ entidadTipo, entidadId: { $in: entidadIds } });
    if (session) q = q.session(session);
    const docs = await q.lean().exec();
    return docs.map((d) => this.toDomain(d));
  }

  async listar(filtros: AprobacionFiltros): Promise<AprobacionConnection> {
    const { estado, expedienteId, entidadTipo, page = 1, limit = 20, offset: offsetInput } = filtros;
    const query: Record<string, unknown> = {};
    if (estado) query['estado'] = estado;
    if (expedienteId) query['expedienteId'] = expedienteId;
    if (entidadTipo) query['entidadTipo'] = entidadTipo;

    const skip =
      offsetInput !== undefined && offsetInput !== null ? offsetInput : (page - 1) * limit;
    const effectivePage =
      offsetInput !== undefined && offsetInput !== null
        ? Math.floor(offsetInput / limit) + 1
        : page;
    const [docs, total] = await Promise.all([
      AprobacionModel.find(query).sort({ fechaEnvio: -1 }).skip(skip).limit(limit).lean(),
      AprobacionModel.countDocuments(query),
    ]);

    return {
      items: docs.map((d) => this.toDomain(d)),
      totalCount: total,
      page: effectivePage,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async actualizar(
    id: string,
    patch: Partial<{
      estado: EstadoAprobacion;
      revisorId: string;
      revisorNombre: string;
      solicitanteNombre: string;
      fechaUltimaRevision: Date;
      numeroCiclo: number;
      montoSolicitado: number;
      observaciones: ItemComentarioAprobacion[];
      comentariosAprobacion: ItemComentarioAprobacion[];
      comentariosRechazo: ItemComentarioAprobacion[];
    }>,
    session?: any
  ): Promise<Aprobacion | null> {
    const opts: Record<string, unknown> = { new: true, runValidators: true };
    if (session) opts['session'] = session;
    const updated = await AprobacionModel.findByIdAndUpdate(
      id,
      { $set: patch },
      opts as any
    ).lean();
    return updated ? this.toDomain(updated) : null;
  }

  async agregarObservacion(
    id: string,
    item: ItemComentarioAprobacion,
    setFields: SetRevisorFields
  ): Promise<Aprobacion | null> {
    const updated = await AprobacionModel.findByIdAndUpdate(
      id,
      {
        $push: { observaciones: toMongoComentario(item) },
        $set: {
          ...setFields,
          fechaUltimaRevision: new Date(),
        },
      },
      { new: true, runValidators: true }
    ).lean();
    return updated ? this.toDomain(updated) : null;
  }

  async agregarComentarioAprobacion(
    id: string,
    item: ItemComentarioAprobacion,
    setFields: SetRevisorFields
  ): Promise<Aprobacion | null> {
    const updated = await AprobacionModel.findByIdAndUpdate(
      id,
      {
        $push: { comentariosAprobacion: toMongoComentario(item) },
        $set: {
          ...setFields,
          fechaUltimaRevision: new Date(),
        },
      },
      { new: true, runValidators: true }
    ).lean();
    return updated ? this.toDomain(updated) : null;
  }

  async agregarComentarioRechazo(
    id: string,
    item: ItemComentarioAprobacion,
    setFields: SetRevisorFields
  ): Promise<Aprobacion | null> {
    const updated = await AprobacionModel.findByIdAndUpdate(
      id,
      {
        $push: { comentariosRechazo: toMongoComentario(item) },
        $set: {
          ...setFields,
          fechaUltimaRevision: new Date(),
        },
      },
      { new: true, runValidators: true }
    ).lean();
    return updated ? this.toDomain(updated) : null;
  }
}
