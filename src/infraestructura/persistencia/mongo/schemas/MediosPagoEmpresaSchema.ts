import { Schema, model, Types } from 'mongoose';

// Documento Mongo. Colección 'medios_pago_empresa' igual que inacons.
export interface MediosPagoEmpresaDocument {
  _id: string;
  empresa_id: Types.ObjectId;
  entidad: string;
  nro_cuenta: string;
  detalles?: string;
  titular: string;
}

const MediosPagoEmpresaSchema = new Schema<MediosPagoEmpresaDocument>(
  {
    empresa_id: { type: Schema.Types.ObjectId, ref: 'Empresa', required: true },
    entidad: { type: String, required: true },
    nro_cuenta: { type: String, required: true },
    detalles: { type: String },
    titular: { type: String, required: true },
  },
  {
    versionKey: false,
    collection: 'medios_pago_empresa',
  }
);

export const MediosPagoEmpresaModel = model<MediosPagoEmpresaDocument>(
  'MediosPagoEmpresa',
  MediosPagoEmpresaSchema
);
