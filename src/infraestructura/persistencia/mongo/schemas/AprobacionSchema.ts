import { Schema, model, Document } from 'mongoose';

const RevisionRequisitoSchema = new Schema(
  {
    requisitoDocumentoId: { type: String, required: true },
    resultado: { type: String, required: true, enum: ['OBSERVADO', 'APROBADO'] },
  },
  { _id: false }
);

const ItemComentarioSchema = new Schema(
  {
    mensaje: { type: String, required: true },
    usuarioId: { type: String, required: true },
    usuarioNombre: { type: String },
    fecha: { type: Date, required: true, default: Date.now },
    revisionesRequisito: { type: [RevisionRequisitoSchema], default: undefined },
  },
  { _id: false }
);

export interface IAprobacionDocument extends Document {
  entidadTipo: 'solicitud_pago' | 'documento_oc';
  entidadId: string;
  expedienteId: string;
  montoSolicitado?: number;
  tipoPagoOCId?: string;
  estado: 'EN_REVISION' | 'OBSERVADO' | 'APROBADO' | 'RECHAZADO';
  solicitanteId?: string;
  solicitanteNombre?: string;
  revisorId?: string;
  revisorNombre?: string;
  fechaEnvio: Date;
  fechaUltimaRevision?: Date;
  numeroCiclo: number;
  observaciones: Array<{
    mensaje: string;
    usuarioId: string;
    usuarioNombre?: string;
    fecha: Date;
    revisionesRequisito?: Array<{ requisitoDocumentoId: string; resultado: string }>;
  }>;
  comentariosAprobacion: Array<{
    mensaje: string;
    usuarioId: string;
    usuarioNombre?: string;
    fecha: Date;
    revisionesRequisito?: Array<{ requisitoDocumentoId: string; resultado: string }>;
  }>;
  comentariosRechazo: Array<{
    mensaje: string;
    usuarioId: string;
    usuarioNombre?: string;
    fecha: Date;
    revisionesRequisito?: Array<{ requisitoDocumentoId: string; resultado: string }>;
  }>;
}

const AprobacionMongoSchema = new Schema<IAprobacionDocument>(
  {
    entidadTipo: {
      type: String,
      required: true,
      enum: ['solicitud_pago', 'documento_oc'],
      index: true,
    },
    entidadId: { type: String, required: true, index: true },
    expedienteId: { type: String, required: true, index: true },
    montoSolicitado: { type: Number, min: 0 },
    tipoPagoOCId: { type: String, index: true },
    estado: {
      type: String,
      required: true,
      enum: ['EN_REVISION', 'OBSERVADO', 'APROBADO', 'RECHAZADO'],
      default: 'EN_REVISION',
      index: true,
    },
    solicitanteId: { type: String, index: true },
    solicitanteNombre: { type: String },
    revisorId: { type: String },
    revisorNombre: { type: String },
    fechaEnvio: { type: Date, required: true, default: Date.now, index: true },
    fechaUltimaRevision: { type: Date },
    numeroCiclo: { type: Number, required: true, default: 1 },
    /** Historial: observaciones al cerrar revisión con entregas observadas (`mensaje` incluye comentario general + detalle si aplica). */
    observaciones: { type: [ItemComentarioSchema], default: [] },
    /** Historial: cierre con todas las entregas conformes (`mensaje` puede ser comentario general del revisor o texto por defecto). */
    comentariosAprobacion: { type: [ItemComentarioSchema], default: [] },
    /** Historial: rechazo de solicitud de pago (`mensaje` = motivo). */
    comentariosRechazo: { type: [ItemComentarioSchema], default: [] },
  },
  {
    timestamps: true,
    collection: 'aprobaciones',
  }
);

AprobacionMongoSchema.index({ entidadTipo: 1, entidadId: 1 }, { unique: true });
AprobacionMongoSchema.index({ expedienteId: 1, estado: 1 });

export const AprobacionModel = model<IAprobacionDocument>('Aprobacion', AprobacionMongoSchema);
