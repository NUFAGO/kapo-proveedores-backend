import { Schema, model, Document } from 'mongoose';

// Interfaz para el documento de MongoDB
export interface IDocumentoOC extends Document {
  expedienteId: string;
  checklistId: string;
  obligatorio: boolean;
  estado: 'pendiente' | 'cargado' | 'observado' | 'aprobado' | 'rechazado';
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
    enum: ['pendiente', 'cargado', 'observado', 'aprobado', 'rechazado'],
    default: 'pendiente'
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

// Middleware para validaciones
DocumentoOCSchema.pre('save', function(next) {
  // Validar que no se pueda aprobar sin estar cargado primero
  if (this.isModified('estado') && this.estado === 'aprobado') {
    const estadoAnterior = this.getChanges().$set?.estado || this.estado;
    if (estadoAnterior !== 'cargado' && estadoAnterior !== 'observado') {
      return next(new Error('Un documento debe estar cargado u observado antes de poder ser aprobado'));
    }
  }
  next();
});

export const DocumentoOCModel = model<IDocumentoOC>('DocumentoOC', DocumentoOCSchema);
