import { IDocumentoOCRepository } from '../../../dominio/repositorios/IDocumentoOCRepository';
import { DocumentoOC, DocumentoOCFilter } from '../../../dominio/entidades/DocumentoOC';
import { DocumentoOCModel, IDocumentoOC } from './schemas/DocumentoOCSchema';

export class DocumentoOCMongoRepository implements IDocumentoOCRepository {
  
  async create(data: Partial<DocumentoOC>, session?: any): Promise<DocumentoOC> {
    const documento = new DocumentoOCModel(data);
    const saved = session 
      ? await documento.save({ session })
      : await documento.save();
    return this.mapToEntity(saved);
  }

  async findById(id: string, session?: any): Promise<DocumentoOC | null> {
    let q = DocumentoOCModel.findById(id);
    if (session) q = q.session(session);
    const documento = await q.exec();
    return documento ? this.mapToEntity(documento) : null;
  }

  async update(id: string, data: Partial<DocumentoOC>, session?: any): Promise<DocumentoOC | null> {
    const opts: Record<string, unknown> = { new: true, runValidators: true };
    if (session) opts['session'] = session;
    const updated = await DocumentoOCModel.findByIdAndUpdate(id, data, opts as any).exec();
    return updated ? this.mapToEntity(updated as unknown as IDocumentoOC) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await DocumentoOCModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async findByExpedienteId(expedienteId: string, session?: any): Promise<DocumentoOC[]> {
    let q = DocumentoOCModel.find({ expedienteId }).sort({ createdAt: -1 });
    if (session) q = q.session(session);
    const documentos = await q.exec();
    return documentos.map(doc => this.mapToEntity(doc));
  }

  async findByChecklistId(checklistId: string): Promise<DocumentoOC[]> {
    const documentos = await DocumentoOCModel
      .find({ checklistId })
      .sort({ createdAt: -1 })
      .exec();
    return documentos.map(doc => this.mapToEntity(doc));
  }

  async findByEstado(estado: DocumentoOC['estado']): Promise<DocumentoOC[]> {
    const documentos = await DocumentoOCModel
      .find({ estado })
      .sort({ createdAt: -1 })
      .exec();
    return documentos.map(doc => this.mapToEntity(doc));
  }

  async findByExpedienteAndEstado(expedienteId: string, estado: DocumentoOC['estado']): Promise<DocumentoOC[]> {
    const documentos = await DocumentoOCModel
      .find({ expedienteId, estado })
      .sort({ createdAt: -1 })
      .exec();
    return documentos.map(doc => this.mapToEntity(doc));
  }

  async existsChecklistInExpediente(expedienteId: string, checklistId: string): Promise<boolean> {
    const count = await DocumentoOCModel.countDocuments({ 
      expedienteId, 
      checklistId 
    }).exec();
    return count > 0;
  }

  async countByExpedienteAndEstado(expedienteId: string, estado: DocumentoOC['estado']): Promise<number> {
    return await DocumentoOCModel.countDocuments({ 
      expedienteId, 
      estado 
    }).exec();
  }

  async findObligatoriosByExpediente(expedienteId: string): Promise<DocumentoOC[]> {
    const documentos = await DocumentoOCModel
      .find({ expedienteId, obligatorio: true })
      .sort({ createdAt: -1 })
      .exec();
    return documentos.map(doc => this.mapToEntity(doc));
  }

  async findObligatoriosPendientesByExpediente(expedienteId: string): Promise<DocumentoOC[]> {
    const documentos = await DocumentoOCModel
      .find({
        expedienteId,
        obligatorio: true,
        estado: { $ne: 'APROBADO' },
      })
      .sort({ createdAt: -1 })
      .exec();
    return documentos.map(doc => this.mapToEntity(doc));
  }

  async listWithFilters(filters: DocumentoOCFilter): Promise<DocumentoOC[]> {
    const query: any = {};
    
    if (filters.expedienteId) query.expedienteId = filters.expedienteId;
    if (filters.checklistId) query.checklistId = filters.checklistId;
    if (filters.estado) query.estado = filters.estado;
    if (filters.obligatorio !== undefined) query.obligatorio = filters.obligatorio;

    const documentos = await DocumentoOCModel
      .find(query)
      .sort({ createdAt: -1 })
      .exec();
    
    return documentos.map(doc => this.mapToEntity(doc));
  }

  async updateEstado(id: string, estado: DocumentoOC['estado']): Promise<DocumentoOC | null> {
    const updateData: Record<string, unknown> = { estado };

    const updated = await DocumentoOCModel.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    ).exec();
    
    return updated ? this.mapToEntity(updated as unknown as IDocumentoOC) : null;
  }

  private mapToEntity(doc: IDocumentoOC): DocumentoOC {
    return {
      id: doc._id.toString(),
      expedienteId: doc.expedienteId,
      checklistId: doc.checklistId,
      obligatorio: doc.obligatorio,
      estado: doc.estado,
      ...(doc.fechaCarga && { fechaCarga: doc.fechaCarga })
    };
  }
}
