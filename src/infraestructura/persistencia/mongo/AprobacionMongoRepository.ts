import mongoose from 'mongoose';
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

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isStrictObjectIdString(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
}

/** Arma el filtro Mongo para listados / kanban (AND de igualdades + búsqueda OR en campos de texto). */
export function buildAprobacionListarQuery(filtros: AprobacionFiltros): Record<string, unknown> {
  const parts: Record<string, unknown>[] = [];

  if (filtros.estado) parts.push({ estado: filtros.estado });
  if (filtros.entidadTipo) parts.push({ entidadTipo: filtros.entidadTipo });
  if (filtros.expedienteId) parts.push({ expedienteId: filtros.expedienteId });
  if (filtros.entidadId) parts.push({ entidadId: filtros.entidadId });
  if (filtros.proveedorId) parts.push({ proveedorId: filtros.proveedorId });
  if (filtros.tipoPagoOCId) parts.push({ tipoPagoOCId: filtros.tipoPagoOCId });
  if (filtros.solicitanteId) parts.push({ solicitanteId: filtros.solicitanteId });

  const busqueda = filtros.busqueda?.trim();
  if (busqueda && busqueda.length > 0) {
    const pattern = escapeRegex(busqueda);
    const re = { $regex: pattern, $options: 'i' };
    const porTexto: Record<string, unknown> = {
      $or: [
        { expedienteCodigo: re },
        { proveedorNombre: re },
        { expedienteDescripcion: re },
        { solicitanteNombre: re },
        { revisorNombre: re },
        { entidadId: re },
        { expedienteId: re },
        { proveedorId: re },
        { tipoPagoOCId: re },
      ],
    };
    const idConds: Record<string, unknown>[] = [
      { expedienteId: busqueda },
      { proveedorId: busqueda },
      { entidadId: busqueda },
    ];
    if (isStrictObjectIdString(busqueda)) {
      idConds.push({ _id: new mongoose.Types.ObjectId(busqueda) });
    }
    const porId: Record<string, unknown> = { $or: idConds };
    parts.push({ $or: [porTexto, porId] });
  }

  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0] as Record<string, unknown>;
  return { $and: parts };
}

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
    if (
      doc.expedienteCodigo !== undefined &&
      doc.expedienteCodigo !== null &&
      String(doc.expedienteCodigo) !== ''
    ) {
      base.expedienteCodigo = String(doc.expedienteCodigo);
    }
    if (doc.proveedorId !== undefined && doc.proveedorId !== null && String(doc.proveedorId) !== '') {
      base.proveedorId = String(doc.proveedorId);
    }
    if (
      doc.proveedorNombre !== undefined &&
      doc.proveedorNombre !== null &&
      String(doc.proveedorNombre) !== ''
    ) {
      base.proveedorNombre = String(doc.proveedorNombre);
    }
    if (
      doc.expedienteDescripcion !== undefined &&
      doc.expedienteDescripcion !== null &&
      String(doc.expedienteDescripcion) !== ''
    ) {
      base.expedienteDescripcion = String(doc.expedienteDescripcion);
    }
    return base;
  }

  async crear(input: CrearAprobacionInput, session?: any): Promise<Aprobacion> {
    const payload = {
      entidadTipo: input.entidadTipo,
      entidadId: input.entidadId,
      expedienteId: input.expedienteId,
      expedienteCodigo: input.expedienteCodigo ?? '',
      proveedorId: input.proveedorId ?? '',
      proveedorNombre: input.proveedorNombre ?? '',
      expedienteDescripcion: input.expedienteDescripcion ?? '',
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
    const { page = 1, limit = 20, offset: offsetInput } = filtros;
    const query = buildAprobacionListarQuery(filtros);

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
