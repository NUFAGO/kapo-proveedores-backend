// Importar tipos necesarios
import { DocumentoSubido } from './DocumentoOC';

export interface SolicitudPago {
  id: string;
  expedienteId: string;
  tipoPagoOCId: string;
  montoSolicitado: number;
  estado: 'borrador' | 'en_revision' | 'observada' | 'rechazada' | 'aprobado';
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
