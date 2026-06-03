import { Schema, model } from 'mongoose';

// Caché de consultas de RUC (igual que inacons: colección "ruc", expira a los 2 meses).
export interface RucCacheDocument {
  _id: string;
  numeroDocumento: string;
  razonSocial?: string;
  nombreComercial?: string;
  estado?: string;
  condicion?: string;
  direccion?: string;
  distrito?: string;
  provincia?: string;
  departamento?: string;
  tipo?: string;
  actividadEconomica?: string;
  EsAgenteRetencion?: boolean;
  expira: Date;
}

const RucCacheSchema = new Schema<RucCacheDocument>(
  {
    numeroDocumento: { type: String, required: true, unique: true, index: true },
    razonSocial: { type: String },
    nombreComercial: { type: String },
    estado: { type: String },
    condicion: { type: String },
    direccion: { type: String },
    distrito: { type: String },
    provincia: { type: String },
    departamento: { type: String },
    tipo: { type: String },
    actividadEconomica: { type: String },
    EsAgenteRetencion: { type: Boolean, default: false },
    expira: { type: Date, required: true },
  },
  { timestamps: true, versionKey: false, collection: 'ruc' }
);

export const RucCacheModel = model<RucCacheDocument>('RucCache', RucCacheSchema);
