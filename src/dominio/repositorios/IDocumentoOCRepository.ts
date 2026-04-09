import { DocumentoOC, DocumentoOCFilter } from '../entidades/DocumentoOC';

export interface IDocumentoOCRepository {
  // Métodos básicos CRUD
  findById(id: string, session?: any): Promise<DocumentoOC | null>;
  create(data: Partial<DocumentoOC>, session?: any): Promise<DocumentoOC>;
  update(id: string, data: Partial<DocumentoOC>, session?: any): Promise<DocumentoOC | null>;
  delete(id: string): Promise<boolean>;
  
  // Métodos específicos para documentos OC
  findByExpedienteId(expedienteId: string, session?: any): Promise<DocumentoOC[]>;
  findByChecklistId(checklistId: string): Promise<DocumentoOC[]>;
  
  // Métodos de estado
  findByEstado(estado: DocumentoOC['estado']): Promise<DocumentoOC[]>;
  findByExpedienteAndEstado(expedienteId: string, estado: DocumentoOC['estado']): Promise<DocumentoOC[]>;
  
  // Validaciones
  existsChecklistInExpediente(expedienteId: string, checklistId: string): Promise<boolean>;
  countByExpedienteAndEstado(expedienteId: string, estado: DocumentoOC['estado']): Promise<number>;
  
  // Métodos para documentos obligatorios
  findObligatoriosByExpediente(expedienteId: string): Promise<DocumentoOC[]>;
  findObligatoriosPendientesByExpediente(expedienteId: string): Promise<DocumentoOC[]>;
  
  // Listados con filtros
  listWithFilters(filters: DocumentoOCFilter): Promise<DocumentoOC[]>;
  
  // Métodos de actualización
  updateEstado(id: string, estado: DocumentoOC['estado']): Promise<DocumentoOC | null>;
}
