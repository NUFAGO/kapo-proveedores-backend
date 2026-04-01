import { Schema, model, Document } from 'mongoose';

// Interfaz para el documento de MongoDB
export interface ISolicitudPago extends Document {
  expedienteId: string;
  tipoPagoOCId: string;
  montoSolicitado: number;
  estado: 'borrador' | 'en_revision' | 'observada' | 'rechazada' | 'aprobado';
  fechaCreacion: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Schema para SolicitudPago
const SolicitudPagoSchema = new Schema<ISolicitudPago>({
  expedienteId: {
    type: String,
    required: true,
    ref: 'ExpedientePago'
  },
  tipoPagoOCId: {
    type: String,
    required: true,
    ref: 'TipoPagoOC'
  },
  montoSolicitado: {
    type: Number,
    required: true,
    min: 0
  },
  estado: {
    type: String,
    required: true,
    enum: ['borrador', 'en_revision', 'observada', 'rechazada', 'aprobado'],
    default: 'borrador'
  },
  fechaCreacion: {
    type: Date,
    required: true,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'solicitudes_pago'
});

// Índices para optimizar consultas
SolicitudPagoSchema.index({ expedienteId: 1 });
SolicitudPagoSchema.index({ tipoPagoOCId: 1 });
SolicitudPagoSchema.index({ estado: 1 });
SolicitudPagoSchema.index({ fechaCreacion: -1 });
SolicitudPagoSchema.index({ expedienteId: 1, estado: 1 });

// Middleware para validaciones
SolicitudPagoSchema.pre('save', function(next) {
  // Validar transición de estados
  if (this.isModified('estado')) {
    const estadosValidos: Record<string, string[]> = {
      'borrador': ['en_revision', 'rechazada'],
      'en_revision': ['observada', 'rechazada', 'aprobado'],
      'observada': ['en_revision'],
      'rechazada': ['borrador'],
      'aprobado': [] // Estado final
    };

    const estadoAnterior = this.getChanges().$set?.estado || this.estado;
    const transicionesPermitidas = estadosValidos[estadoAnterior] || [];
    
    if (this.estado !== estadoAnterior && !transicionesPermitidas.includes(this.estado)) {
      return next(new Error(`Transición de estado inválida: ${estadoAnterior} -> ${this.estado}`));
    }
  }
  next();
});

export const SolicitudPagoModel = model<ISolicitudPago>('SolicitudPago', SolicitudPagoSchema);
