// Forward declaration para evitar dependencia circular
export interface DocumentoSubido {
  id: string;
  documentoOCId?: string;
  solicitudPagoId?: string;
  requisitoDocumentoId?: string;
  usuarioId: string;
  archivos: Array<{
    url: string;
    nombreOriginal: string;
    mimeType: string;
    tamanioBytes: number;
    fechaSubida: Date;
  }>;
  version: number;
  estado: 'pendiente' | 'aprobado' | 'observado' | 'rechazado';
  fechaSubida: Date;
  fechaRevision?: Date;
  comentariosRevision?: string;
}

export interface DocumentoOC {
  id: string;
  expedienteId: string;
  checklistId: string;
  obligatorio: boolean;
  estado: 'pendiente' | 'cargado' | 'observado' | 'aprobado' | 'rechazado';
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

export interface DocumentoSubidoInput {
  documentoOCId?: string;
  solicitudPagoId?: string;
  requisitoDocumentoId?: string;
  usuarioId: string;
  archivos: Array<{
    url: string;
    nombreOriginal: string;
    mimeType: string;
    tamanioBytes: number;
    fechaSubida: Date;
  }>;
}

export interface DocumentoSubidoFilter {
  documentoOCId?: string;
  solicitudPagoId?: string;
  requisitoDocumentoId?: string;
  usuarioId?: string;
  estado?: string;
}
