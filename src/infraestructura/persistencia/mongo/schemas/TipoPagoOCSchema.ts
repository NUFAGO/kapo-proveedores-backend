import { Schema, model, Document } from 'mongoose';

// Interfaz para el documento de MongoDB
export interface ITipoPagoOC extends Document {
  expedienteId: string;
  categoriaChecklistId: string;
  checklistId: string;
  fechaAsignacion: Date;
  modoRestriccion: 'libre' | 'orden' | 'porcentaje' | 'orden_y_porcentaje';
  orden?: number;
  requiereAnteriorPagado: boolean;
  porcentajeMaximo?: number;
  porcentajeMinimo?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Schema para TipoPagoOC
const TipoPagoOCSchema = new Schema<ITipoPagoOC>({
  expedienteId: {
    type: String,
    required: true,
    ref: 'ExpedientePago'
  },
  categoriaChecklistId: {
    type: String,
    required: true,
    ref: 'CategoriaChecklist'
  },
  checklistId: {
    type: String,
    required: true,
    ref: 'PlantillaChecklist'
  },
  fechaAsignacion: {
    type: Date,
    required: true,
    default: Date.now
  },
  modoRestriccion: {
    type: String,
    required: true,
    enum: ['libre', 'orden', 'porcentaje', 'orden_y_porcentaje'],
    default: 'libre'
  },
  orden: {
    type: Number,
    min: 1
  },
  requiereAnteriorPagado: {
    type: Boolean,
    required: true,
    default: false
  },
  porcentajeMaximo: {
    type: Number,
    min: 0,
    max: 100
  },
  porcentajeMinimo: {
    type: Number,
    min: 0,
    max: 100
  }
}, {
  timestamps: true,
  collection: 'tipos_pago_oc'
});

// Índices para optimizar consultas
TipoPagoOCSchema.index({ expedienteId: 1 });
TipoPagoOCSchema.index({ categoriaChecklistId: 1 });
TipoPagoOCSchema.index({ checklistId: 1 });
TipoPagoOCSchema.index({ expedienteId: 1, modoRestriccion: 1 });

// Validaciones personalizadas
TipoPagoOCSchema.pre('save', function(next) {
  // Si el modo incluye orden, debe tener un campo orden
  if ((this.modoRestriccion === 'orden' || this.modoRestriccion === 'orden_y_porcentaje') && !this.orden) {
    return next(new Error('El campo orden es requerido cuando el modo de restricción incluye orden'));
  }
  
  // Si el modo incluye porcentaje, debe tener porcentaje máximo
  if ((this.modoRestriccion === 'porcentaje' || this.modoRestriccion === 'orden_y_porcentaje') && !this.porcentajeMaximo) {
    return next(new Error('El campo porcentajeMaximo es requerido cuando el modo de restricción incluye porcentaje'));
  }
  
  // Validar que porcentajeMinimo no sea mayor que porcentajeMaximo
  if (this.porcentajeMinimo && this.porcentajeMaximo && this.porcentajeMinimo > this.porcentajeMaximo) {
    return next(new Error('El porcentaje mínimo no puede ser mayor que el porcentaje máximo'));
  }
  
  // Validar que requiereAnteriorPagado solo aplique cuando hay orden
  if (this.requiereAnteriorPagado && this.modoRestriccion !== 'orden' && this.modoRestriccion !== 'orden_y_porcentaje') {
    return next(new Error('requiereAnteriorPagado solo aplica cuando el modo de restricción incluye orden'));
  }
  
  next();
});

// Validación de unicidad: no puede haber dos tipos de pago con el mismo orden en el mismo expediente
TipoPagoOCSchema.index({ expedienteId: 1, orden: 1 }, { 
  unique: true, 
  partialFilterExpression: { orden: { $exists: true } } 
});

export const TipoPagoOCModel = model<ITipoPagoOC>('TipoPagoOC', TipoPagoOCSchema);
