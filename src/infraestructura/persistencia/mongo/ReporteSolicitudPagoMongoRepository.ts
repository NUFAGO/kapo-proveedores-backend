import mongoose from 'mongoose';
import { IReporteSolicitudPagoRepository } from '../../../dominio/repositorios/IReporteSolicitudPagoRepository';
import {
  ReporteSolicitudPago,
  ReporteSolicitudPagoCrearInput,
  ReporteSolicitudPagoActualizarInput,
  ReporteSolicitudPagoListFilter,
  ReporteSolicitudPagoConnection,
} from '../../../dominio/entidades/ReporteSolicitudPago';
import {
  ReporteSolicitudPagoModel,
  IReporteSolicitudPago as IReporteSolicitudPagoMongo,
} from './schemas/ReporteSolicitudPagoSchema';

export class ReporteSolicitudPagoMongoRepository implements IReporteSolicitudPagoRepository {
  /**
   * Siguiente RSP0001, RSP0002… usando solo agregación ($max), sin traer todos los códigos a memoria.
   */
  async generarSiguienteCodigo(session?: unknown): Promise<string> {
    try {
      const pipeline = [
        {
          $match: {
            codigo: { $regex: '^RSP[0-9]+$', $options: 'i' },
          },
        },
        {
          $project: {
            n: {
              $convert: {
                input: {
                  $substrCP: [
                    '$codigo',
                    3,
                    { $subtract: [{ $strLenCP: '$codigo' }, 3] },
                  ],
                },
                to: 'int',
                onError: 0,
                onNull: 0,
              },
            },
          },
        },
        { $group: { _id: null, maxN: { $max: '$n' } } },
      ];
      let agg = ReporteSolicitudPagoModel.aggregate(pipeline);
      if (session) agg = agg.session(session as never);
      const rows = await agg.exec();
      const max = typeof rows[0]?.maxN === 'number' ? rows[0].maxN : 0;
      return `RSP${String(max + 1).padStart(4, '0')}`;
    } catch (error) {
      console.error('Error al generar código de reporte solicitud pago:', error);
      return 'RSP0001';
    }
  }

  async create(data: ReporteSolicitudPagoCrearInput, session?: unknown): Promise<ReporteSolicitudPago> {
    const codigo = await this.generarSiguienteCodigo(session);
    const doc = new ReporteSolicitudPagoModel({ ...data, codigo });
    const saved = session ? await doc.save({ session: session as never }) : await doc.save();
    return this.mapToEntity(saved);
  }

  async findById(id: string, session?: unknown): Promise<ReporteSolicitudPago | null> {
    let q = ReporteSolicitudPagoModel.findById(id);
    if (session) q = q.session(session as never);
    const doc = await q.exec();
    return doc ? this.mapToEntity(doc) : null;
  }

  async update(
    id: string,
    data: ReporteSolicitudPagoActualizarInput,
    session?: unknown
  ): Promise<ReporteSolicitudPago | null> {
    const opts: Record<string, unknown> = { new: true, runValidators: true };
    if (session) opts['session'] = session;
    const updated = await ReporteSolicitudPagoModel.findByIdAndUpdate(id, data, opts as never).exec();
    return updated ? this.mapToEntity(updated as unknown as IReporteSolicitudPagoMongo) : null;
  }

  async delete(id: string, session?: unknown): Promise<boolean> {
    let q = ReporteSolicitudPagoModel.findByIdAndDelete(id);
    if (session) q = q.session(session as never);
    const result = await q.exec();
    return !!result;
  }

  async findBySolicitudPagoId(solicitudPagoId: string, session?: unknown): Promise<ReporteSolicitudPago[]> {
    let q = ReporteSolicitudPagoModel.find({ solicitudPagoId }).sort({ fecha: -1 });
    if (session) q = q.session(session as never);
    const docs = await q.exec();
    return docs.map(d => this.mapToEntity(d));
  }

  async findPaginatedByProveedorId(
    proveedorId: string,
    filter: ReporteSolicitudPagoListFilter,
    session?: unknown
  ): Promise<ReporteSolicitudPagoConnection> {
    const page = Math.max(1, filter.page ?? 1);
    const limit = Math.min(100, Math.max(1, filter.limit ?? 10));
    const ses = session as never;

    const andParts: Record<string, unknown>[] = [{ proveedorId }];
    const search = filter.searchTerm?.trim();
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const term = new RegExp(escaped, 'i');
      andParts.push({
        $or: [
          { maestroResponsable: term },
          { observacionesGenerales: term },
          { codigo: term },
          { identificadorSolicitudPago: term },
          { solicitudPagoGid: term },
          { gidSolicitud: term },
          { gidsolicitud: term },
        ],
      });
    }
    if (filter.vinculado === true) {
      andParts.push({
        solicitudPagoId: { $exists: true, $nin: [null, ''] },
      });
    } else if (filter.vinculado === false) {
      andParts.push({
        $or: [
          { solicitudPagoId: { $exists: false } },
          { solicitudPagoId: null },
          { solicitudPagoId: '' },
        ],
      });
    }

    const baseQuery: Record<string, unknown> =
      andParts.length === 1 ? andParts[0]! : { $and: andParts };

    const skip = (page - 1) * limit;

    let countQ = ReporteSolicitudPagoModel.countDocuments(baseQuery);
    if (session) countQ = countQ.session(ses);
    let findQ = ReporteSolicitudPagoModel.find(baseQuery).sort({ fecha: -1 }).skip(skip).limit(limit);
    if (session) findQ = findQ.session(ses);

    const [total, docs] = await Promise.all([countQ.exec(), findQ.exec()]);
    const totalPages = total > 0 ? Math.ceil(total / limit) : 0;

    return {
      data: docs.map(d => this.mapToEntity(d)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async vincularSolicitudPagoPorIds(
    reporteIds: string[],
    solicitudPagoId: string,
    proveedorId: string,
    session?: unknown
  ): Promise<void> {
    const unique = [...new Set(reporteIds.map((id) => String(id).trim()).filter((s) => s.length > 0))];
    if (unique.length === 0) return;

    const oids: mongoose.Types.ObjectId[] = [];
    for (const id of unique) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error(`REPORTES_VINCULACION: id de reporte inválido (${id})`);
      }
      oids.push(new mongoose.Types.ObjectId(id));
    }

    const ses = session as never;
    const filter = {
      _id: { $in: oids },
      proveedorId: proveedorId.trim(),
      $or: [
        { solicitudPagoId: { $exists: false } },
        { solicitudPagoId: null },
        { solicitudPagoId: '' },
      ],
    };

    let q = ReporteSolicitudPagoModel.updateMany(filter, {
      $set: { solicitudPagoId: solicitudPagoId.trim() },
    });
    if (session) q = q.session(ses);
    const res = await q.exec();

    if (res.matchedCount !== unique.length) {
      throw new Error(
        'REPORTES_VINCULACION: No se pudieron vincular todos los reportes (deben existir, pertenecer a tu proveedor y estar sin vincular)'
      );
    }
  }

  private mapToEntity(doc: IReporteSolicitudPagoMongo): ReporteSolicitudPago {
    const o = doc.toObject ? doc.toObject() : doc;
    const ident =
      [o.identificadorSolicitudPago, o.solicitudPagoGid, o.gidSolicitud, o.gidsolicitud]
        .map((v) => (typeof v === 'string' ? v.trim() : ''))
        .find((s) => s.length > 0) ?? '';
    return {
      id: String(o._id),
      ...(o.codigo ? { codigo: String(o.codigo).trim().toUpperCase() } : {}),
      proveedorId: o.proveedorId ?? '',
      identificadorSolicitudPago: ident,
      solicitudPagoId: o.solicitudPagoId,
      fecha: o.fecha,
      maestroResponsable: o.maestroResponsable,
      cuadrillas: o.cuadrillas ?? [],
      observacionesGenerales: o.observacionesGenerales,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
    };
  }
}
