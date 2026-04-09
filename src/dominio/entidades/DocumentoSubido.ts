// ============================================================================
// ENTIDAD DocumentoSubido — archivos entregados contra requisitos de checklist
// (solicitud de pago o documento base OC)
// ============================================================================

/**
 * Alineado con GraphQL `DocumentoSubido_Estado`.
 * Por defecto al crear: PENDIENTE (pendiente de revisión del revisor).
 * La solicitud de pago / fila de aprobación usan EN_REVISION en su propio modelo.
 */
export type EstadoDocumentoSubido = 'PENDIENTE' | 'APROBADO' | 'OBSERVADO' | 'RECHAZADO';

export interface ArchivoSubido {
  url: string;
  nombreOriginal: string;
  mimeType: string;
  tamanioBytes: number;
  fechaSubida: Date;
}

export interface DocumentoSubido {
  id: string;
  documentoOCId?: string;
  solicitudPagoId?: string;
  requisitoDocumentoId?: string;
  usuarioId: string;
  archivos: ArchivoSubido[];
  version: number;
  estado: EstadoDocumentoSubido;
  fechaSubida: Date;
  fechaRevision?: Date;
  comentariosRevision?: string;
}

export interface DocumentoSubidoInput {
  documentoOCId?: string;
  solicitudPagoId?: string;
  requisitoDocumentoId?: string;
  usuarioId: string;
  archivos: ArchivoSubido[];
  /** Si se omite en el envío inicial, equivale a 1. En subsanación se asigna max+1 por requisito. */
  version?: number;
}

export interface DocumentoSubidoFilter {
  documentoOCId?: string;
  solicitudPagoId?: string;
  requisitoDocumentoId?: string;
  usuarioId?: string;
  estado?: string;
}
