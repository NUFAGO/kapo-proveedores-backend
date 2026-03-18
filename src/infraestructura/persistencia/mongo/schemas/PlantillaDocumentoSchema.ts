import { Schema, model } from 'mongoose';

// Interface para el documento de MongoDB
export interface PlantillaDocumentoDocument {
  _id: string;
  codigo: string;
  tipoDocumentoId: string;
  nombrePlantilla: string;
  plantillaUrl: string;
  formatosPermitidos?: string;
  activo: boolean;
  fechaCreacion: Date;
  fechaActualizacion?: Date;
}

const PlantillaDocumentoSchema = new Schema<PlantillaDocumentoDocument>({
  codigo: { 
    type: String, 
    required: true, 
    unique: true,
    uppercase: true,
    trim: true
  },
  tipoDocumentoId: { 
    type: String, 
    required: true, 
    trim: true,
    ref: 'TipoDocumento'
  },
  nombrePlantilla: { 
    type: String, 
    required: true, 
    trim: true,
    maxlength: 200
  },
  plantillaUrl: { 
    type: String, 
    required: true, 
    trim: true,
    maxlength: 1000
  },
  formatosPermitidos: {
    type: String,
    trim: true,
    maxlength: 100,
    default: null,
    validate: {
      validator: function(v: string) {
        if (!v) return true; // Es opcional
        // Validar formato: "pdf,doc,docx" separados por comas
        const formatos = v.split(',').map(f => f.trim().toLowerCase());
        const formatosValidos = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'jpg', 'jpeg', 'png'];
        return formatos.every(f => formatosValidos.includes(f));
      },
      message: 'Formatos no válidos. Use: pdf,doc,docx,xls,xlsx,ppt,pptx,txt,jpg,jpeg,png separados por comas'
    }
  },
  activo: { 
    type: Boolean, 
    required: true, 
    default: true 
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
PlantillaDocumentoSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.fechaActualizacion = new Date();
  }
  next();
});

// Middleware para actualizar fechaActualizacion antes de updateOne
PlantillaDocumentoSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate'], function(next) {
  this.set({ fechaActualizacion: new Date() });
  next();
});

// Índices
PlantillaDocumentoSchema.index({ tipoDocumentoId: 1 });
PlantillaDocumentoSchema.index({ tipoDocumentoId: 1, nombrePlantilla: 1 }, { unique: true });
PlantillaDocumentoSchema.index({ activo: 1 });
PlantillaDocumentoSchema.index({ tipoDocumentoId: 1, activo: 1 });

export const PlantillaDocumentoModel = model<PlantillaDocumentoDocument>('PlantillaDocumento', PlantillaDocumentoSchema);
