/** Misma convención que SolicitudPago (sin CARGADO; ex‑PENDIENTE → EN_REVISION). */
export type EstadoDocumentoOC =
  | 'BORRADOR'
  | 'EN_REVISION'
  | 'OBSERVADA'
  | 'RECHAZADA'
  | 'APROBADO';

export interface DocumentoOC {
  id: string;
  expedienteId: string;
  checklistId: string;
  obligatorio: boolean;
  /** Si es true, el flujo podrá impedir solicitudes de pago hasta aprobar este documento (regla en capa de negocio). */
  bloqueaSolicitudPago: boolean;
  estado: EstadoDocumentoOC;
  fechaCarga?: Date;
}

export interface DocumentoOCInput {
  expedienteId: string;
  checklistId: string;
  obligatorio: boolean;
  bloqueaSolicitudPago?: boolean;
}

export interface DocumentoOCFilter {
  expedienteId?: string;
  checklistId?: string;
  estado?: string;
  obligatorio?: boolean;
  bloqueaSolicitudPago?: boolean;
}
