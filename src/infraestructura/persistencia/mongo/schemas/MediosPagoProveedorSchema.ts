import { Schema, model, Types } from 'mongoose';

// Documento Mongo. Colección 'medios_pago_proveedor' igual que inacons.
export interface MediosPagoProveedorDocument {
  _id: string;
  proveedor_id: Types.ObjectId;
  entidad?: Types.ObjectId;
  nro_cuenta?: string;
  detalles?: string;
  titular?: string;
  validado?: boolean;
  mostrar?: boolean;
}

const MediosPagoProveedorSchema = new Schema<MediosPagoProveedorDocument>(
  {
    proveedor_id: { type: Schema.Types.ObjectId, ref: 'Proveedor', required: true },
    entidad: { type: Schema.Types.ObjectId, ref: 'Banco' },
    nro_cuenta: { type: String },
    detalles: { type: String },
    titular: { type: String },
    validado: { type: Boolean, default: false },
    mostrar: { type: Boolean, default: true },
  },
  {
    versionKey: false,
    collection: 'medios_pago_proveedor',
  }
);

MediosPagoProveedorSchema.index({ proveedor_id: 1 });

export const MediosPagoProveedorModel = model<MediosPagoProveedorDocument>(
  'MediosPagoProveedor',
  MediosPagoProveedorSchema
);
