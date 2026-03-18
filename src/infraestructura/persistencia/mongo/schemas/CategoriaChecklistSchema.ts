import { Schema, model } from 'mongoose';

// Interface para el documento de MongoDB
export interface CategoriaChecklistDocument {
  _id: string;
  nombre: string;
  descripcion?: string;
  tipoUso: 'pago' | 'documentos_oc';
  permiteMultiple?: boolean; // Solo aplica si tipoUso es 'pago'
  permiteVincularReportes?: boolean; // Solo aplica si tipoUso es 'pago'
  estado: 'activo' | 'inactivo';
  fechaCreacion: Date;
  fechaActualizacion?: Date;
}

const CategoriaChecklistSchema = new Schema<CategoriaChecklistDocument>({
  nombre: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true,
    maxlength: 100
  },
  descripcion: { 
    type: String, 
    trim: true,
    maxlength: 500
  },
  tipoUso: { 
    type: String, 
    required: true, 
    enum: ['pago', 'documentos_oc'],
    default: 'pago'
  },
  permiteMultiple: { 
    type: Boolean, 
    required: false, // Opcional, solo aplica si tipoUso es 'pago'
    default: false 
  },
  permiteVincularReportes: { 
    type: Boolean, 
    required: false, // Opcional, solo aplica si tipoUso es 'pago'
    default: false 
  },
  estado: { 
    type: String, 
    required: true, 
    enum: ['activo', 'inactivo'],
    default: 'activo'
  },
  fechaCreacion: { 
    type: Date, 
    default: Date.now 
  },
  fechaActualizacion: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true,
  versionKey: false
});

// Middleware para actualizar fechaActualizacion antes de guardar
CategoriaChecklistSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.fechaActualizacion = new Date();
  }
  next();
});

// Middleware para actualizar fechaActualizacion antes de updateOne
CategoriaChecklistSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate'], function(next) {
  this.set({ fechaActualizacion: new Date() });
  next();
});

// Índices
CategoriaChecklistSchema.index({ estado: 1 });
CategoriaChecklistSchema.index({ tipoUso: 1 });
CategoriaChecklistSchema.index({ estado: 1, tipoUso: 1 });

export const CategoriaChecklistModel = model<CategoriaChecklistDocument>('CategoriaChecklist', CategoriaChecklistSchema);
