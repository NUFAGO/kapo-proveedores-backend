import { Schema, model, Model, Document } from 'mongoose';

// ============================================================================
// SCHEMA MONGODB PARA CÓDIGOS DE ACCESO
// ============================================================================

// Interfaz para el documento
interface ICodigoAccesoDocument extends Document {
  codigo: string;
  proveedorId: string;
  proveedorRuc: string;
  proveedorNombre?: string;
  tipo: 'registro' | 'cambio' | 'recuperacion';
  fechaGeneracion: Date;
  fechaExpiracion: Date;
  usado: boolean;
  fechaUso?: Date;
  creadoPor?: string;
  motivoInvalidacion?: string;
  activo: boolean;
}

// Interfaz para el modelo con métodos estáticos
interface ICodigoAccesoModel extends Model<ICodigoAccesoDocument> {
  buscarValido(codigo: string): Promise<ICodigoAccesoDocument | null>;
  invalidarAnteriores(proveedorId: string, motivo: string): Promise<{ modifiedCount: number }>;
}

const CodigoAccesoSchema = new Schema<ICodigoAccesoDocument>({
  codigo: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  proveedorId: { 
    type: String, 
    required: true,
    index: true 
  },
  proveedorRuc: { 
    type: String, 
    required: true,
    index: true 
  },
  proveedorNombre: { 
    type: String 
  },
  tipo: { 
    type: String, 
    enum: ['registro', 'cambio', 'recuperacion'], 
    required: true,
    index: true 
  },
  fechaGeneracion: { 
    type: Date, 
    default: Date.now,
    index: true 
  },
  fechaExpiracion: { 
    type: Date, 
    required: true,
    index: true 
  },
  usado: { 
    type: Boolean, 
    default: false,
    index: true 
  },
  fechaUso: { 
    type: Date 
  },
  creadoPor: { 
    type: String,
    index: true 
  },
  motivoInvalidacion: { 
    type: String 
  },
  activo: { 
    type: Boolean, 
    default: true,
    index: true 
  }
}, {
  timestamps: true,
  collection: 'codigos_acceso'
});

// Índices compuestos para búsquedas eficientes
CodigoAccesoSchema.index({ proveedorId: 1, activo: 1 });
CodigoAccesoSchema.index({ codigo: 1, activo: 1, usado: 1 });
CodigoAccesoSchema.index({ fechaExpiracion: 1, activo: 1, usado: 1 });

// Método estático para buscar códigos válidos
(CodigoAccesoSchema.statics as any).buscarValido = function(codigo: string) {
  return this.findOne({
    codigo,
    activo: true,
    usado: false,
    fechaExpiracion: { $gt: new Date() }
  });
};

// Método estático para invalidar códigos anteriores
(CodigoAccesoSchema.statics as any).invalidarAnteriores = function(proveedorId: string, motivo: string) {
  return this.updateMany(
    { 
      proveedorId, 
      activo: true, 
      usado: false 
    },
    { 
      activo: false, 
      motivoInvalidacion: motivo
    }
  );
};

export const CodigoAccesoModel = model<ICodigoAccesoDocument>('CodigoAcceso', CodigoAccesoSchema) as ICodigoAccesoModel;
