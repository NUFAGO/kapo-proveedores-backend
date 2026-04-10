import { ISolicitudPagoRepository } from '../../../dominio/repositorios/ISolicitudPagoRepository';
import { SolicitudPago, SolicitudPagoFilter } from '../../../dominio/entidades/SolicitudPago';
import { SolicitudPagoModel, ISolicitudPago as ISolicitudPagoMongo } from './schemas/SolicitudPagoSchema';

export class SolicitudPagoMongoRepository implements ISolicitudPagoRepository {
  
  async create(
    data: Omit<SolicitudPago, 'id' | 'createdAt' | 'updatedAt'>,
    session?: any
  ): Promise<SolicitudPago> {
    const solicitud = new SolicitudPagoModel(data);
    const saved = session ? await solicitud.save({ session }) : await solicitud.save();
    return this.mapToEntity(saved);
  }

  async findById(id: string, session?: any): Promise<SolicitudPago | null> {
    let q = SolicitudPagoModel.findById(id);
    if (session) q = q.session(session);
    const solicitud = await q.exec();
    return solicitud ? this.mapToEntity(solicitud) : null;
  }

  async update(id: string, data: Partial<SolicitudPago>, session?: any): Promise<SolicitudPago | null> {
    const opts: Record<string, unknown> = { new: true, runValidators: true };
    if (session) opts['session'] = session;
    const updated = await SolicitudPagoModel.findByIdAndUpdate(id, data, opts as any).exec();
    return updated ? this.mapToEntity(updated as unknown as ISolicitudPagoMongo) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await SolicitudPagoModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async findByExpedienteId(expedienteId: string): Promise<SolicitudPago[]> {
    const solicitudes = await SolicitudPagoModel
      .find({ expedienteId })
      .sort({ fechaCreacion: -1 })
      .exec();
    return solicitudes.map(sol => this.mapToEntity(sol));
  }

  async findByTipoPagoOC(tipoPagoOCId: string, session?: any): Promise<SolicitudPago[]> {
    let q = SolicitudPagoModel.find({ tipoPagoOCId }).sort({ fechaCreacion: -1 });
    if (session) q = q.session(session);
    const solicitudes = await q.exec();
    return solicitudes.map(sol => this.mapToEntity(sol));
  }

  async listTipoPagoOCIdsThatHaveSolicitudes(tipoPagoOCIds: string[]): Promise<string[]> {
    if (tipoPagoOCIds.length === 0) return [];
    const distinct = await SolicitudPagoModel.distinct('tipoPagoOCId', {
      tipoPagoOCId: { $in: tipoPagoOCIds },
    }).exec();
    return distinct.map((id) => String(id));
  }

  async listWithFilters(filters: SolicitudPagoFilter): Promise<SolicitudPago[]> {
    const query: any = {};
    
    if (filters.expedienteId) query.expedienteId = filters.expedienteId;
    if (filters.tipoPagoOCId) query.tipoPagoOCId = filters.tipoPagoOCId;
    if (filters.estado) query.estado = filters.estado;
    
    if (filters.fechaCreacionDesde || filters.fechaCreacionHasta) {
      query.fechaCreacion = {};
      if (filters.fechaCreacionDesde) query.fechaCreacion.$gte = filters.fechaCreacionDesde;
      if (filters.fechaCreacionHasta) query.fechaCreacion.$lte = filters.fechaCreacionHasta;
    }

    const solicitudes = await SolicitudPagoModel
      .find(query)
      .sort({ fechaCreacion: -1 })
      .exec();
    
    return solicitudes.map(sol => this.mapToEntity(sol));
  }

  async countByExpedienteAndEstado(expedienteId: string, estado: SolicitudPago['estado']): Promise<number> {
    return await SolicitudPagoModel.countDocuments({ expedienteId, estado }).exec();
  }

  async countByTipoPagoOCAndEstado(tipoPagoOCId: string, estado: SolicitudPago['estado']): Promise<number> {
    return await SolicitudPagoModel.countDocuments({ tipoPagoOCId, estado }).exec();
  }

  async updateEstado(id: string, estado: SolicitudPago['estado'], comentarios?: string): Promise<SolicitudPago | null> {
    const updateData: any = { estado };
    
    if (comentarios) updateData.comentarios = comentarios;

    const updated = await SolicitudPagoModel.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    ).exec();
    
    return updated ? this.mapToEntity(updated) : null;
  }

  async sumMontoSolicitadoByExpediente(expedienteId: string): Promise<number> {
    const result = await SolicitudPagoModel.aggregate([
      { $match: { expedienteId } },
      { $group: { _id: null, total: { $sum: '$montoSolicitado' } } }
    ]).exec();
    
    return result.length > 0 ? result[0].total : 0;
  }

  async sumMontoSolicitadoByExpedienteAndEstado(
    expedienteId: string,
    estado: SolicitudPago['estado'],
    session?: any
  ): Promise<number> {
    let agg = SolicitudPagoModel.aggregate([
      { $match: { expedienteId, estado } },
      { $group: { _id: null, total: { $sum: '$montoSolicitado' } } },
    ]);
    if (session) agg = agg.session(session);
    const result = await agg.exec();

    return result.length > 0 ? result[0].total : 0;
  }

  async findSolicitudesEnOrden(expedienteId: string): Promise<SolicitudPago[]> {
    // Esta método requeriría join con TipoPagoOC para obtener el orden
    // Por ahora retornamos ordenadas por fecha de creación
    const solicitudes = await SolicitudPagoModel
      .find({ expedienteId })
      .sort({ fechaCreacion: 1 })
      .exec();
    return solicitudes.map(sol => this.mapToEntity(sol));
  }

  private mapToEntity(doc: ISolicitudPagoMongo): SolicitudPago {
    return {
      id: doc._id.toString(),
      expedienteId: doc.expedienteId,
      tipoPagoOCId: doc.tipoPagoOCId,
      montoSolicitado: doc.montoSolicitado,
      estado: doc.estado,
      fechaCreacion: doc.fechaCreacion,
      documentosSubidos: [] // Se poblará en el servicio si es necesario
    };
  }
}
