import { SolicitudPago, SolicitudPagoFilter } from '../entidades/SolicitudPago';

export interface ISolicitudPagoRepository {
  // CRUD básico
  create(
    data: Omit<SolicitudPago, 'id' | 'createdAt' | 'updatedAt'>,
    session?: any
  ): Promise<SolicitudPago>;
  findById(id: string, session?: any): Promise<SolicitudPago | null>;
  update(id: string, data: Partial<SolicitudPago>, session?: any): Promise<SolicitudPago | null>;
  delete(id: string): Promise<boolean>;

  // Consultas específicas
  findByExpedienteId(expedienteId: string): Promise<SolicitudPago[]>;
  findByTipoPagoOC(tipoPagoOCId: string, session?: any): Promise<SolicitudPago[]>;
  
  // Listados con filtros
  listWithFilters(filters: SolicitudPagoFilter): Promise<SolicitudPago[]>;
  
  // Métodos de conteo
  countByExpedienteAndEstado(expedienteId: string, estado: SolicitudPago['estado']): Promise<number>;
  countByTipoPagoOCAndEstado(tipoPagoOCId: string, estado: SolicitudPago['estado']): Promise<number>;
  
  // Métodos de estado
  updateEstado(id: string, estado: SolicitudPago['estado'], comentarios?: string): Promise<SolicitudPago | null>;
  
  // Métodos de montos
  sumMontoSolicitadoByExpediente(expedienteId: string): Promise<number>;
  sumMontoSolicitadoByExpedienteAndEstado(
    expedienteId: string,
    estado: SolicitudPago['estado'],
    session?: any
  ): Promise<number>;
  
  // Métodos para obtener solicitudes en orden
  findSolicitudesEnOrden(expedienteId: string): Promise<SolicitudPago[]>;
}
