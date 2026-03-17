import mongoose, { Schema, Document } from 'mongoose';

export interface TipoDocumentoDocument extends Document {
  codigo: string;
  nombre: string;
  descripcion?: string;
  estado: 'activo' | 'inactivo';
  fechaCreacion: Date;
  fechaActualizacion?: Date;
}

const TipoDocumentoSchema = new Schema<TipoDocumentoDocument>({
  codigo: { type: String, required: true, unique: true },
  nombre: { type: String, required: true, unique: true },
  descripcion: { type: String, required: false },
  estado: { 
    type: String, 
    required: true, 
    enum: ['activo', 'inactivo'],
    default: 'activo'
  },
  fechaCreacion: { type: Date, default: Date.now },
  fechaActualizacion: { type: Date, default: Date.now }
});

// Índices para optimizar consultas
TipoDocumentoSchema.index({ estado: 1 });
TipoDocumentoSchema.index({ estado: 1, nombre: 1 });

// Middleware para actualizar fechaActualizacion antes de guardar
TipoDocumentoSchema.pre('save', function(next) {
  this.fechaActualizacion = new Date();
  next();
});

export const TipoDocumentoModel = mongoose.model<TipoDocumentoDocument>('TipoDocumento', TipoDocumentoSchema);
