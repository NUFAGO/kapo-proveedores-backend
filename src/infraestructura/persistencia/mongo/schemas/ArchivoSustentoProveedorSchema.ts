import { Schema, model, Types } from 'mongoose';

// Colección propia 'archivo_sustento_proveedor' (no confundir con archivos_sustento de inacons).
// El campo del archivo es `file` (URL en GCS), igual que el origen.
export interface ArchivoSustentoProveedorDocument {
  _id: string;
  file: string;
  referencia_id: Types.ObjectId;
  tipo: string;
}

const ArchivoSustentoProveedorSchema = new Schema<ArchivoSustentoProveedorDocument>(
  {
    file: { type: String, required: true },
    referencia_id: { type: Schema.Types.ObjectId, required: true },
    tipo: { type: String, required: true },
  },
  { versionKey: false, collection: 'archivo_sustento_proveedor' }
);

ArchivoSustentoProveedorSchema.index({ referencia_id: 1, tipo: 1 });
ArchivoSustentoProveedorSchema.index({ tipo: 1 });

export const ArchivoSustentoProveedorModel = model<ArchivoSustentoProveedorDocument>(
  'ArchivoSustentoProveedor',
  ArchivoSustentoProveedorSchema
);
