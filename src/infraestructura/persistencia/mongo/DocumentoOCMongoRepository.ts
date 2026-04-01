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

  async findById(id: string): Promise<DocumentoOC | null> {
    const documento = await DocumentoOCModel.findById(id).exec();
    return documento ? this.mapToEntity(documento) : null;
  }

  async update(id: string, data: Partial<DocumentoOC>): Promise<DocumentoOC | null> {
    const updated = await DocumentoOCModel.findByIdAndUpdate(
      id, 
      data, 
      { new: true, runValidators: true }
    ).exec();
    return updated ? this.mapToEntity(updated) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await DocumentoOCModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async findByExpedienteId(expedienteId: string): Promise<DocumentoOC[]> {
    const documentos = await DocumentoOCModel
      .find({ expedienteId })
      .sort({ createdAt: -1 })
      .exec();
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
        estado: 'pendiente' 
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
    const updateData: any = { estado };
    
    if (estado === 'cargado') {
      updateData.fechaCarga = new Date();
    }

    const updated = await DocumentoOCModel.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    ).exec();
    
    return updated ? this.mapToEntity(updated) : null;
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
