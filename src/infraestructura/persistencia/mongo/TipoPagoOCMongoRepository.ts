import { ITipoPagoOCRepository } from '../../../dominio/repositorios/ITipoPagoOCRepository';
import { TipoPagoOC, TipoPagoOCFilter } from '../../../dominio/entidades/TipoPagoOC';
import { TipoPagoOCModel, ITipoPagoOC as ITipoPagoOCMongo } from './schemas/TipoPagoOCSchema';

export class TipoPagoOCMongoRepository implements ITipoPagoOCRepository {
  
  async create(data: Partial<TipoPagoOC>, session?: any): Promise<TipoPagoOC> {
    const tipoPago = new TipoPagoOCModel(data);
    const saved = session 
      ? await tipoPago.save({ session })
      : await tipoPago.save();
    return this.mapToEntity(saved);
  }

  async findById(id: string): Promise<TipoPagoOC | null> {
    const tipoPago = await TipoPagoOCModel.findById(id).exec();
    return tipoPago ? this.mapToEntity(tipoPago) : null;
  }

  async update(id: string, data: Partial<TipoPagoOC>): Promise<TipoPagoOC | null> {
    const updated = await TipoPagoOCModel.findByIdAndUpdate(
      id, 
      data, 
      { new: true, runValidators: true }
    ).exec();
    return updated ? this.mapToEntity(updated) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await TipoPagoOCModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async findByExpedienteId(expedienteId: string): Promise<TipoPagoOC[]> {
    const tiposPago = await TipoPagoOCModel
      .find({ expedienteId })
      .sort({ orden: 1, createdAt: 1 })
      .exec();
    return tiposPago.map(tp => this.mapToEntity(tp));
  }

  async findByCategoriaChecklistId(categoriaChecklistId: string): Promise<TipoPagoOC[]> {
    const tiposPago = await TipoPagoOCModel
      .find({ categoriaChecklistId })
      .sort({ createdAt: -1 })
      .exec();
    return tiposPago.map(tp => this.mapToEntity(tp));
  }

  async findByChecklistId(checklistId: string): Promise<TipoPagoOC[]> {
    const tiposPago = await TipoPagoOCModel
      .find({ checklistId })
      .sort({ createdAt: -1 })
      .exec();
    return tiposPago.map(tp => this.mapToEntity(tp));
  }

  async findByExpedienteAndOrden(expedienteId: string, orden: number): Promise<TipoPagoOC | null> {
    const tipoPago = await TipoPagoOCModel.findOne({ 
      expedienteId, 
      orden 
    }).exec();
    return tipoPago ? this.mapToEntity(tipoPago) : null;
  }

  async findMaxOrdenByExpediente(expedienteId: string): Promise<number> {
    const result = await TipoPagoOCModel
      .findOne({ expedienteId, orden: { $exists: true } })
      .sort({ orden: -1 })
      .exec();
    return result ? result.orden || 0 : 0;
  }

  async existsCategoriaInExpediente(expedienteId: string, categoriaChecklistId: string): Promise<boolean> {
    const count = await TipoPagoOCModel.countDocuments({ 
      expedienteId, 
      categoriaChecklistId 
    }).exec();
    return count > 0;
  }

  async countByExpedienteAndCategoria(expedienteId: string, categoriaChecklistId: string): Promise<number> {
    return await TipoPagoOCModel.countDocuments({ 
      expedienteId, 
      categoriaChecklistId 
    }).exec();
  }

  async listWithFilters(filters: TipoPagoOCFilter): Promise<TipoPagoOC[]> {
    const query: any = {};
    
    if (filters.expedienteId) query.expedienteId = filters.expedienteId;
    if (filters.categoriaChecklistId) query.categoriaChecklistId = filters.categoriaChecklistId;
    if (filters.checklistId) query.checklistId = filters.checklistId;
    if (filters.modoRestriccion) query.modoRestriccion = filters.modoRestriccion;

    const tiposPago = await TipoPagoOCModel
      .find(query)
      .sort({ createdAt: -1 })
      .exec();
    
    return tiposPago.map(tp => this.mapToEntity(tp));
  }

  async findTiposPagoAnteriores(expedienteId: string, ordenActual: number): Promise<TipoPagoOC[]> {
    const tiposPago = await TipoPagoOCModel
      .find({ 
        expedienteId, 
        orden: { $lt: ordenActual },
        modoRestriccion: { $in: ['orden', 'orden_y_porcentaje'] }
      })
      .sort({ orden: 1 })
      .exec();
    
    return tiposPago.map(tp => this.mapToEntity(tp));
  }

  async findTiposPagoConPorcentaje(expedienteId: string): Promise<TipoPagoOC[]> {
    const tiposPago = await TipoPagoOCModel
      .find({ 
        expedienteId, 
        modoRestriccion: { $in: ['porcentaje', 'orden_y_porcentaje'] },
        porcentajeMaximo: { $exists: true, $gt: 0 }
      })
      .sort({ orden: 1, createdAt: 1 })
      .exec();
    
    return tiposPago.map(tp => this.mapToEntity(tp));
  }

  private mapToEntity(doc: ITipoPagoOCMongo): TipoPagoOC {
    return {
      id: doc._id.toString(),
      expedienteId: doc.expedienteId,
      categoriaChecklistId: doc.categoriaChecklistId,
      checklistId: doc.checklistId,
      fechaAsignacion: doc.fechaAsignacion,
      modoRestriccion: doc.modoRestriccion,
      ...(doc.orden && { orden: doc.orden }),
      requiereAnteriorPagado: doc.requiereAnteriorPagado,
      ...(doc.porcentajeMaximo && { porcentajeMaximo: doc.porcentajeMaximo }),
      ...(doc.porcentajeMinimo && { porcentajeMinimo: doc.porcentajeMinimo })
    };
  }
}
