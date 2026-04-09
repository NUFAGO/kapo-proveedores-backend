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
  estado: EstadoDocumentoOC;
  fechaCarga?: Date;
}

export interface DocumentoOCInput {
  expedienteId: string;
  checklistId: string;
  obligatorio: boolean;
}

export interface DocumentoOCFilter {
  expedienteId?: string;
  checklistId?: string;
  estado?: string;
  obligatorio?: boolean;
}
