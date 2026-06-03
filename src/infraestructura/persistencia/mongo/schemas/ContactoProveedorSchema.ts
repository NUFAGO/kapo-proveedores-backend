import { Schema, model, Types } from 'mongoose';

// Documento Mongo. Colección 'contacto_proveedor' igual que inacons.
export interface ContactoProveedorDocument {
  _id: string;
  proveedor_id: Types.ObjectId;
  nombres: string;
  apellidos: string;
  cargo?: string;
  telefono: string;
}

const ContactoProveedorSchema = new Schema<ContactoProveedorDocument>(
  {
    proveedor_id: { type: Schema.Types.ObjectId, ref: 'Proveedor', required: true },
    nombres: { type: String, required: true },
    apellidos: { type: String, required: true },
    cargo: { type: String },
    telefono: { type: String, required: true },
  },
  {
    versionKey: false,
    collection: 'contacto_proveedor',
  }
);

ContactoProveedorSchema.index({ proveedor_id: 1 });

export const ContactoProveedorModel = model<ContactoProveedorDocument>(
  'ContactoProveedor',
  ContactoProveedorSchema
);
