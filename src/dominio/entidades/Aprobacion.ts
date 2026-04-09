// ============================================================================
// ENTIDAD APROBACIÓN — Kanban / flujo centralizado por solicitud o documento OC
// ============================================================================

export type EntidadTipoAprobacion = 'solicitud_pago' | 'documento_oc';

/** EN_REVISION = recién enviado a revisión; luego OBSERVADO / APROBADO / RECHAZADO. */
export type EstadoAprobacion = 'EN_REVISION' | 'OBSERVADO' | 'APROBADO' | 'RECHAZADO';

/** Por requisito, qué decidió el revisor en ese comentario */
export type ResultadoRevisionRequisito = 'OBSERVADO' | 'APROBADO';

export interface RevisionRequisitoComentario {
  requisitoDocumentoId: string;
  resultado: ResultadoRevisionRequisito;
}

export interface ItemComentarioAprobacion {
  mensaje: string;
  usuarioId: string;
  usuarioNombre?: string;
  fecha: Date;
  /** Por comentario: qué requisitos se observaron o aprobaron en esa acción */
  revisionesRequisito?: RevisionRequisitoComentario[];
}

export interface Aprobacion {
  id: string;
  entidadTipo: EntidadTipoAprobacion;
  entidadId: string;
  expedienteId: string;
  /** Monto solicitado en la solicitud de pago (solo aplica si entidadTipo es solicitud_pago). */
  montoSolicitado?: number;
  /** Tipo de pago OC asociado a la solicitud (denormalizado para kanban / listados). */
  tipoPagoOCId?: string;
  estado: EstadoAprobacion;
  solicitanteId?: string;
  solicitanteNombre?: string;
  revisorId?: string;
  revisorNombre?: string;
  fechaEnvio: Date;
  fechaUltimaRevision?: Date;
  numeroCiclo: number;
  observaciones: ItemComentarioAprobacion[];
  comentariosAprobacion: ItemComentarioAprobacion[];
  comentariosRechazo: ItemComentarioAprobacion[];
}

export interface CrearAprobacionInput {
  entidadTipo: EntidadTipoAprobacion;
  entidadId: string;
  expedienteId: string;
  /** Obligatorio si entidadTipo es solicitud_pago. */
  montoSolicitado?: number;
  /** Opcional pero recomendado para solicitud_pago (TipoPagoOC de la solicitud). */
  tipoPagoOCId?: string;
  solicitanteId?: string;
  solicitanteNombre?: string;
}

export interface AprobacionFiltros {
  estado?: EstadoAprobacion;
  expedienteId?: string;
  entidadTipo?: EntidadTipoAprobacion;
  page?: number;
  limit?: number;
  /** Si está definido, se usa como skip en lugar de (page - 1) * limit (scroll por columna). */
  offset?: number;
}

export interface AprobacionConnection {
  items: Aprobacion[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface RevisionRequisitoInput {
  requisitoDocumentoId: string;
  resultado: ResultadoRevisionRequisito;
}

export interface AgregarComentarioInput {
  mensaje: string;
  usuarioId: string;
  usuarioNombre?: string;
  revisionesRequisito?: RevisionRequisitoInput[];
}
