import { Schema, model, Document } from 'mongoose';

// Interfaz para el documento de MongoDB
export interface IDocumentoOC extends Document {
  expedienteId: string;
  checklistId: string;
  obligatorio: boolean;
  estado: 'BORRADOR' | 'EN_REVISION' | 'OBSERVADA' | 'RECHAZADA' | 'APROBADO';
  fechaCarga?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Schema para DocumentoOC
const DocumentoOCSchema = new Schema<IDocumentoOC>({
  expedienteId: {
    type: String,
    required: true,
    ref: 'ExpedientePago'
  },
  checklistId: {
    type: String,
    required: true,
    ref: 'PlantillaChecklist'
  },
  obligatorio: {
    type: Boolean,
    required: true,
    default: false
  },
  estado: {
    type: String,
    required: true,
    enum: ['BORRADOR', 'EN_REVISION', 'OBSERVADA', 'RECHAZADA', 'APROBADO'],
    default: 'BORRADOR',
  },
  fechaCarga: {
    type: Date
  }
}, {
  timestamps: true,
  collection: 'documentos_oc'
});

// Índices para optimizar consultas
DocumentoOCSchema.index({ expedienteId: 1 });
DocumentoOCSchema.index({ checklistId: 1 });
DocumentoOCSchema.index({ estado: 1 });
DocumentoOCSchema.index({ expedienteId: 1, estado: 1 });
DocumentoOCSchema.index({ expedienteId: 1, checklistId: 1 }, { unique: true });

export const DocumentoOCModel = model<IDocumentoOC>('DocumentoOC', DocumentoOCSchema);
