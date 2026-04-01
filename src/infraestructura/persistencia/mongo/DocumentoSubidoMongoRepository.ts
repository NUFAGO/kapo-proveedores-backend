import { IDocumentoSubidoRepository } from '../../../dominio/repositorios/IDocumentoSubidoRepository';
import { DocumentoSubido, DocumentoSubidoFilter } from '../../../dominio/entidades/DocumentoOC';
import { DocumentoSubidoModel, IDocumentoSubido as IDocumentoSubidoMongo } from './schemas/DocumentoSubidoSchema';

export class DocumentoSubidoMongoRepository implements IDocumentoSubidoRepository {
  
  async create(data: Omit<DocumentoSubido, 'id' | 'createdAt' | 'updatedAt'>): Promise<DocumentoSubido> {
    const documento = new DocumentoSubidoModel(data);
    const saved = await documento.save();
    return this.mapToEntity(saved);
  }

  async findById(id: string): Promise<DocumentoSubido | null> {
    const documento = await DocumentoSubidoModel.findById(id).exec();
    return documento ? this.mapToEntity(documento) : null;
  }

  async update(id: string, data: Partial<DocumentoSubido>): Promise<DocumentoSubido | null> {
    const updated = await DocumentoSubidoModel.findByIdAndUpdate(
      id, 
      data, 
      { new: true, runValidators: true }
    ).exec();
    return updated ? this.mapToEntity(updated) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await DocumentoSubidoModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async findByDocumentoOC(documentoOCId: string): Promise<DocumentoSubido[]> {
    const documentos = await DocumentoSubidoModel
      .find({ documentoOCId })
      .sort({ fechaSubida: -1 })
      .exec();
    return documentos.map(doc => this.mapToEntity(doc));
  }

  async findBySolicitudPago(solicitudPagoId: string): Promise<DocumentoSubido[]> {
    const documentos = await DocumentoSubidoModel
      .find({ solicitudPagoId })
      .sort({ fechaSubida: -1 })
      .exec();
    return documentos.map(doc => this.mapToEntity(doc));
  }

  async findByUsuario(usuarioId: string): Promise<DocumentoSubido[]> {
    const documentos = await DocumentoSubidoModel
      .find({ usuarioId })
      .sort({ fechaSubida: -1 })
      .exec();
    return documentos.map(doc => this.mapToEntity(doc));
  }

  async listWithFilters(filters: DocumentoSubidoFilter): Promise<DocumentoSubido[]> {
    const query: any = {};
    
    if (filters.documentoOCId) query.documentoOCId = filters.documentoOCId;
    if (filters.solicitudPagoId) query.solicitudPagoId = filters.solicitudPagoId;
    if (filters.usuarioId) query.usuarioId = filters.usuarioId;
    if (filters.estado) query.estado = filters.estado;

    const documentos = await DocumentoSubidoModel
      .find(query)
      .sort({ fechaSubida: -1 })
      .exec();
    
    return documentos.map(doc => this.mapToEntity(doc));
  }

  async countByDocumentoOC(documentoOCId: string): Promise<number> {
    return await DocumentoSubidoModel.countDocuments({ documentoOCId }).exec();
  }

  async countByDocumentoOCAndEstado(documentoOCId: string, estado: DocumentoSubido['estado']): Promise<number> {
    return await DocumentoSubidoModel.countDocuments({ documentoOCId, estado }).exec();
  }

  async countBySolicitudPago(solicitudPagoId: string): Promise<number> {
    return await DocumentoSubidoModel.countDocuments({ solicitudPagoId }).exec();
  }

  async countBySolicitudPagoAndEstado(solicitudPagoId: string, estado: DocumentoSubido['estado']): Promise<number> {
    return await DocumentoSubidoModel.countDocuments({ solicitudPagoId, estado }).exec();
  }

  async updateEstado(id: string, estado: DocumentoSubido['estado'], comentariosRevision?: string): Promise<DocumentoSubido | null> {
    const updateData: any = { 
      estado, 
      fechaRevision: new Date() 
    };
    
    if (comentariosRevision) {
      updateData.comentariosRevision = comentariosRevision;
    }

    const updated = await DocumentoSubidoModel.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    ).exec();
    
    return updated ? this.mapToEntity(updated) : null;
  }

  async findUltimoByDocumentoOC(documentoOCId: string): Promise<DocumentoSubido | null> {
    const documento = await DocumentoSubidoModel
      .findOne({ documentoOCId })
      .sort({ fechaSubida: -1 })
      .exec();
    return documento ? this.mapToEntity(documento) : null;
  }

  async findUltimoBySolicitudPago(solicitudPagoId: string): Promise<DocumentoSubido | null> {
    const documento = await DocumentoSubidoModel
      .findOne({ solicitudPagoId })
      .sort({ fechaSubida: -1 })
      .exec();
    return documento ? this.mapToEntity(documento) : null;
  }

  private mapToEntity(doc: IDocumentoSubidoMongo): DocumentoSubido {
    return {
      id: doc._id.toString(),
      ...(doc.documentoOCId && { documentoOCId: doc.documentoOCId }),
      ...(doc.solicitudPagoId && { solicitudPagoId: doc.solicitudPagoId }),
      ...(doc.requisitoDocumentoId && { requisitoDocumentoId: doc.requisitoDocumentoId }),
      usuarioId: doc.usuarioId,
      archivos: doc.archivos,
      version: 1, // No usamos versiones, cada documento es un registro nuevo
      estado: doc.estado,
      fechaSubida: doc.fechaSubida,
      ...(doc.fechaRevision && { fechaRevision: doc.fechaRevision }),
      ...(doc.comentariosRevision && { comentariosRevision: doc.comentariosRevision })
    };
  }
}
