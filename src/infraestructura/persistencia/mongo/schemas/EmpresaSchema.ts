import { Schema, model } from 'mongoose';

// Documento Mongo. Colección 'empresas' igual que inacons.
export interface EmpresaDocument {
  _id: string;
  nombre_comercial: string;
  razon_social: string;
  descripcion?: string;
  estado: string;
  regimen_fiscal: string;
  ruc: string;
  imagenes?: string;
  color?: string;
}

const EmpresaSchema = new Schema<EmpresaDocument>(
  {
    nombre_comercial: { type: String, required: true },
    razon_social: { type: String, required: true },
    descripcion: { type: String, required: false },
    estado: { type: String, required: true },
    regimen_fiscal: { type: String, required: true },
    ruc: { type: String, required: true },
    imagenes: { type: String, required: false },
    color: { type: String, required: false },
  },
  {
    versionKey: false,
    collection: 'empresas',
  }
);

export const EmpresaModel = model<EmpresaDocument>('Empresa', EmpresaSchema);
