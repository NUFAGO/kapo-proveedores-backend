import { Schema, model, Document } from 'mongoose';

// Interfaz para el documento de MongoDB
export interface IExpedientePago extends Document {
  ordenCompraId: string;
  codigo: string;
  proveedorId: string;
  proveedorNombre: string;
  montoContrato: number;
  montoDisponible: number;
  montoComprometido: number;
  montoPagado: number;
  estado: 'en_configuracion' | 'configurado' | 'en_ejecucion' | 'completado' | 'suspendido' | 'cancelado';
  fechaInicio: Date;
  fechaFin: Date;
  descripcion: string;
  minReportesPorSolicitud: number;
  modoValidacionReportes: 'advertencia' | 'error';
  adminCreadorId: string;
  fechaCreacion: Date;
  fechaConfigurado?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Schema para ExpedientePago
const ExpedientePagoSchema = new Schema<IExpedientePago>({
  ordenCompraId: {
    type: String,
    required: true,
    unique: true,
    ref: 'OrdenCompra'
  },
  codigo: {
    type: String,
    required: true,
    unique: true
  },
  proveedorId: {
    type: String,
    required: true,
    ref: 'UsuarioProveedor'
  },
  proveedorNombre: {
    type: String,
    required: true,
  },
  montoContrato: {
    type: Number,
    required: true,
    min: 0
  },
  montoDisponible: {
    type: Number,
    required: true,
    min: 0
  },
  montoComprometido: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  montoPagado: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  estado: {
    type: String,
    required: true,
    enum: ['en_configuracion', 'configurado', 'en_ejecucion', 'completado', 'suspendido', 'cancelado'],
    default: 'en_configuracion'
  },
  fechaInicio: {
    type: Date,
    required: true
  },
  fechaFin: {
    type: Date,
    required: true
  },
  descripcion: {
    type: String,
    required: true,
    maxlength: 1000
  },
  minReportesPorSolicitud: {
    type: Number,
    required: true,
    default: 1,
    min: 1
  },
  modoValidacionReportes: {
    type: String,
    required: true,
    enum: ['advertencia', 'error'],
    default: 'advertencia'
  },
  adminCreadorId: {
    type: String,
    required: true,
    ref: 'Usuario'
  },
  fechaCreacion: {
    type: Date,
    required: true,
    default: Date.now
  },
  fechaConfigurado: {
    type: Date
  }
}, {
  timestamps: true,
  collection: 'expedientes_pago'
});

// Índices para optimizar consultas
ExpedientePagoSchema.index({ proveedorId: 1 });
ExpedientePagoSchema.index({ estado: 1 });
ExpedientePagoSchema.index({ adminCreadorId: 1 });
ExpedientePagoSchema.index({ fechaCreacion: -1 });

// Middleware para validaciones de saldos
ExpedientePagoSchema.pre('save', function(next) {
  // Validar que los saldos sean consistentes
  if (this.montoDisponible < 0) {
    return next(new Error('El monto disponible no puede ser negativo'));
  }
  
  if (this.montoComprometido < 0) {
    return next(new Error('El monto comprometido no puede ser negativo'));
  }
  
  if (this.montoPagado < 0) {
    return next(new Error('El monto pagado no puede ser negativo'));
  }
  
  // Validar que la suma de comprometido y pagado no exceda el contrato
  if (this.montoComprometido + this.montoPagado > this.montoContrato) {
    return next(new Error('La suma de montos comprometido y pagado no puede exceder el monto del contrato'));
  }
  
  // Validar que disponible sea igual a contrato - comprometido
  const disponibleCalculado = this.montoContrato - this.montoComprometido;
  if (Math.abs(this.montoDisponible - disponibleCalculado) > 0.01) {
    return next(new Error('El monto disponible debe ser igual al monto del contrato menos el monto comprometido'));
  }
  
  next();
});

// Middleware para actualización automática de estado
ExpedientePagoSchema.pre('save', function(next) {
  // Si el monto pagado igual al monto del contrato, marcar como completado
  if (this.montoPagado >= this.montoContrato && this.estado !== 'completado') {
    this.estado = 'completado';
  }
  next();
});

export const ExpedientePagoModel = model<IExpedientePago>('ExpedientePago', ExpedientePagoSchema);
