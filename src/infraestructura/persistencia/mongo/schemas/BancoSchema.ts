import { Schema, model } from 'mongoose';

// Documento Mongo. La colección se mantiene en singular ('banco') igual que inacons.
export interface BancoDocument {
  _id: string;
  nombre: string;
  abreviatura: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const BancoSchema = new Schema<BancoDocument>(
  {
    nombre: { type: String, required: true },
    abreviatura: { type: String, required: true },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: 'banco',
  }
);

export const BancoModel = model<BancoDocument>('Banco', BancoSchema);
