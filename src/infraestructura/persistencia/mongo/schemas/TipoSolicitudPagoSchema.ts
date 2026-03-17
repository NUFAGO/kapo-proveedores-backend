import { Schema, model } from 'mongoose';

// Interface para el documento de MongoDB
export interface TipoSolicitudPagoDocument {
  _id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  categoria: 'anticipado' | 'avance' | 'cierre' | 'entrega' | 'gasto' | 'ajuste';
  permiteMultiple: boolean;
  permiteVincularReportes: boolean;
  estado: 'activo' | 'inactivo';
  fechaCreacion: Date;
  fechaActualizacion?: Date;
}

const TipoSolicitudPagoSchema = new Schema<TipoSolicitudPagoDocument>({
  codigo: { 
    type: String, 
    required: true, 
    unique: true,
    uppercase: true,
    trim: true
  },
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
  categoria: { 
    type: String, 
    required: true, 
    enum: ['anticipado', 'avance', 'cierre', 'entrega', 'gasto', 'ajuste'],
    default: 'avance'
  },
  permiteMultiple: { 
    type: Boolean, 
    required: true, 
    default: false 
  },
  permiteVincularReportes: { 
    type: Boolean, 
    required: true, 
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
TipoSolicitudPagoSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.fechaActualizacion = new Date();
  }
  next();
});

// Middleware para actualizar fechaActualizacion antes de updateOne
TipoSolicitudPagoSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate'], function(next) {
  this.set({ fechaActualizacion: new Date() });
  next();
});

// Índices
TipoSolicitudPagoSchema.index({ estado: 1 });
TipoSolicitudPagoSchema.index({ categoria: 1 });
TipoSolicitudPagoSchema.index({ estado: 1, categoria: 1 });

export const TipoSolicitudPagoModel = model<TipoSolicitudPagoDocument>('TipoSolicitudPago', TipoSolicitudPagoSchema);
