// Importar tipos necesarios
import { DocumentoSubido } from './DocumentoSubido';

/** Mayúsculas, alineado con GraphQL `SolicitudPago_Estado` */
export type EstadoSolicitudPago =
  | 'BORRADOR'
  | 'EN_REVISION'
  | 'OBSERVADA'
  | 'RECHAZADA'
  | 'APROBADO';

export interface SolicitudPago {
  id: string;
  expedienteId: string;
  tipoPagoOCId: string;
  montoSolicitado: number;
  estado: EstadoSolicitudPago;
  fechaCreacion: Date;
  documentosSubidos: DocumentoSubido[];
}

export interface SolicitudPagoInput {
  expedienteId: string;
  tipoPagoOCId: string;
  montoSolicitado: number;
}

export interface SolicitudPagoFilter {
  expedienteId?: string;
  tipoPagoOCId?: string;
  estado?: string;
  fechaCreacionDesde?: Date;
  fechaCreacionHasta?: Date;
}
