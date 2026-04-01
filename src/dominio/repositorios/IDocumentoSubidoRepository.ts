import { DocumentoSubido, DocumentoSubidoFilter } from '../entidades/DocumentoOC';

export interface IDocumentoSubidoRepository {
  // CRUD básico
  create(data: Omit<DocumentoSubido, 'id' | 'createdAt' | 'updatedAt'>): Promise<DocumentoSubido>;
  findById(id: string): Promise<DocumentoSubido | null>;
  update(id: string, data: Partial<DocumentoSubido>): Promise<DocumentoSubido | null>;
  delete(id: string): Promise<boolean>;

  // Consultas específicas
  findByDocumentoOC(documentoOCId: string): Promise<DocumentoSubido[]>;
  findBySolicitudPago(solicitudPagoId: string): Promise<DocumentoSubido[]>;
  findByUsuario(usuarioId: string): Promise<DocumentoSubido[]>;
  
  // Listados con filtros
  listWithFilters(filters: DocumentoSubidoFilter): Promise<DocumentoSubido[]>;
  
  // Métodos de conteo
  countByDocumentoOC(documentoOCId: string): Promise<number>;
  countByDocumentoOCAndEstado(documentoOCId: string, estado: DocumentoSubido['estado']): Promise<number>;
  countBySolicitudPago(solicitudPagoId: string): Promise<number>;
  countBySolicitudPagoAndEstado(solicitudPagoId: string, estado: DocumentoSubido['estado']): Promise<number>;
  
  // Métodos de estado
  updateEstado(id: string, estado: DocumentoSubido['estado'], comentariosRevision?: string): Promise<DocumentoSubido | null>;
  
  // Métodos para obtener el último documento subido
  findUltimoByDocumentoOC(documentoOCId: string): Promise<DocumentoSubido | null>;
  findUltimoBySolicitudPago(solicitudPagoId: string): Promise<DocumentoSubido | null>;
}
