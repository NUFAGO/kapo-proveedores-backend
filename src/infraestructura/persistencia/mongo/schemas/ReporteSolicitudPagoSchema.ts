import { Schema, model, Document } from 'mongoose';

export interface EvidenciaReporteSolicitudPago {
  url: string;
}

export interface PersonalReporteSolicitudPago {
  nombreCompleto: string;
  cargo: string;
  observaciones?: string;
}

export interface ActividadReporteSolicitudPago {
  actividad: string;
  und: string;
  tiempoHoras: number;
  meta: number;
  real: number;
  evidencias: EvidenciaReporteSolicitudPago[];
}

export interface CuadrillaReporteSolicitudPago {
  personal: PersonalReporteSolicitudPago[];
  actividades: ActividadReporteSolicitudPago[];
  observaciones?: string;
}

export interface IReporteSolicitudPago extends Document {
  proveedorId: string;
  /** Código legible autogenerado (RSP + secuencial), único */
  codigo?: string;
  identificadorSolicitudPago: string;
  /** @deprecated Solo lectura; datos antiguos antes de identificadorSolicitudPago */
  solicitudPagoGid?: string;
  /** @deprecated Alias legado (p. ej. gid solicitud externo) */
  gidSolicitud?: string;
  /** @deprecated Variante de clave legada en BSON */
  gidsolicitud?: string;
  solicitudPagoId?: string;
  fecha: Date;
  maestroResponsable: string;
  cuadrillas: CuadrillaReporteSolicitudPago[];
  observacionesGenerales?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EvidenciaReporteSolicitudPagoSchema = new Schema<EvidenciaReporteSolicitudPago>(
  {
    url: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const PersonalReporteSolicitudPagoSchema = new Schema<PersonalReporteSolicitudPago>(
  {
    nombreCompleto: { type: String, required: true, trim: true },
    cargo: { type: String, required: true, trim: true },
    observaciones: { type: String, trim: true },
  },
  { _id: false }
);

const ActividadReporteSolicitudPagoSchema = new Schema<ActividadReporteSolicitudPago>(
  {
    actividad: { type: String, required: true, trim: true },
    und: { type: String, required: true, trim: true },
    tiempoHoras: { type: Number, required: true, min: 0 },
    meta: { type: Number, required: true, min: 0 },
    real: { type: Number, required: true, min: 0 },
    evidencias: { type: [EvidenciaReporteSolicitudPagoSchema], default: [] },
  },
  { _id: false }
);

const CuadrillaReporteSolicitudPagoSchema = new Schema<CuadrillaReporteSolicitudPago>(
  {
    personal: { type: [PersonalReporteSolicitudPagoSchema], default: [] },
    actividades: { type: [ActividadReporteSolicitudPagoSchema], default: [] },
    observaciones: { type: String, trim: true },
  },
  { _id: false }
);

const ReporteSolicitudPagoSchema = new Schema<IReporteSolicitudPago>(
  {
    proveedorId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    codigo: {
      type: String,
      required: false,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
    },
    identificadorSolicitudPago: {
      type: String,
      required: false,
      trim: true,
      index: true,
    },
    solicitudPagoGid: {
      type: String,
      required: false,
      trim: true,
    },
    gidSolicitud: {
      type: String,
      required: false,
      trim: true,
    },
    gidsolicitud: {
      type: String,
      required: false,
      trim: true,
    },
    solicitudPagoId: {
      type: String,
      required: false,
      trim: true,
      ref: 'SolicitudPago',
      index: true,
    },
    fecha: { type: Date, required: true, index: true },
    maestroResponsable: { type: String, required: true, trim: true },
    cuadrillas: { type: [CuadrillaReporteSolicitudPagoSchema], default: [] },
    observacionesGenerales: { type: String, trim: true },
  },
  {
    timestamps: true,
    collection: 'reportes_solicitud_pago',
  }
);

ReporteSolicitudPagoSchema.index({ fecha: -1 });
ReporteSolicitudPagoSchema.index({ solicitudPagoId: 1, fecha: -1 }, { sparse: true });
ReporteSolicitudPagoSchema.index({ proveedorId: 1, fecha: -1 });

export const ReporteSolicitudPagoModel = model<IReporteSolicitudPago>(
  'ReporteSolicitudPago',
  ReporteSolicitudPagoSchema
);
