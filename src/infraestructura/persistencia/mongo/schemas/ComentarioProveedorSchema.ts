import { Schema, model } from 'mongoose';

export interface ComentarioProveedorDocument {
  _id: string;
  referencia_id: string;
  tabla: string;
  comentario: string;
  usuario_id?: string;
  usuario_nombre?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const ComentarioProveedorSchema = new Schema<ComentarioProveedorDocument>(
  {
    referencia_id: { type: String, required: true, index: true },
    tabla: { type: String, required: true, index: true },
    comentario: { type: String, required: true },
    usuario_id: { type: String },
    usuario_nombre: { type: String },
  },
  { timestamps: true, versionKey: false, collection: 'comentario_proveedor' }
);

ComentarioProveedorSchema.index({ referencia_id: 1, tabla: 1, createdAt: -1 });

export const ComentarioProveedorModel = model<ComentarioProveedorDocument>(
  'ComentarioProveedor',
  ComentarioProveedorSchema
);
