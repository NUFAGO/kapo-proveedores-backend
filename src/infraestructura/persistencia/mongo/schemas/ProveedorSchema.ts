import { Schema, model } from 'mongoose';

// Documento Mongo. Colección 'proveedor' (singular) igual que inacons.
// ruc se almacena como Number (igual inacons) y se expone como String en GraphQL.
export interface ProveedorDocument {
  _id: string;
  razon_social: string;
  direccion?: string;
  nombre_comercial?: string;
  ruc: number;
  rubro?: string;
  estado?: string;
  tipo?: string;
  actividad?: string;
  correo?: string;
  telefono?: string;
  estado_sunat?: string;
  condicion?: string;
  agente_retencion?: boolean;
  sub_contrata?: boolean;
  distrito?: string;
  provincia?: string;
  departamento?: string;
}

const ProveedorSchema = new Schema<ProveedorDocument>(
  {
    // El RUC es el único identificador real del proveedor -> índice ÚNICO.
    // razon_social/nombre_comercial NO son únicos (la data tiene repetidos
    // legítimos). La importación debe deduplicar por ruc dejando el activo.
    razon_social: { type: String, required: true, index: true },
    direccion: { type: String },
    nombre_comercial: { type: String, index: true },
    ruc: { type: Number, required: true, unique: true },
    rubro: { type: String, index: true },
    estado: { type: String, index: true },
    tipo: { type: String, index: true },
    actividad: { type: String },
    correo: { type: String },
    telefono: { type: String },
    estado_sunat: { type: String, default: '-' },
    condicion: { type: String, default: '-' },
    agente_retencion: { type: Boolean, default: false },
    sub_contrata: { type: Boolean, default: false },
    distrito: { type: String, default: '-', index: true },
    provincia: { type: String, default: '-', index: true },
    departamento: { type: String, default: '-', index: true },
  },
  {
    versionKey: false,
    collection: 'proveedor',
  }
);

ProveedorSchema.index({ estado: 1, tipo: 1 });
ProveedorSchema.index({ rubro: 1, estado: 1 });
ProveedorSchema.index({ sub_contrata: 1 });

export const ProveedorModel = model<ProveedorDocument>('Proveedor', ProveedorSchema);
