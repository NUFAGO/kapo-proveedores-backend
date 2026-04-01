import { Schema, model, Document } from 'mongoose';

// Interfaz para el documento de MongoDB
export interface IDocumentoSubido extends Document {
  documentoOCId?: string;
  solicitudPagoId?: string;
  requisitoDocumentoId?: string;
  usuarioId: string;
  archivos: Array<{
    url: string;
    nombreOriginal: string;
    mimeType: string;
    tamanioBytes: number;
    fechaSubida: Date;
  }>;
  estado: 'pendiente' | 'aprobado' | 'observado' | 'rechazado';
  fechaSubida: Date;
  fechaRevision?: Date;
  comentariosRevision?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Schema para Archivo
const ArchivoSchema = new Schema({
  url: {
    type: String,
    required: true
  },
  nombreOriginal: {
    type: String,
    required: true,
    maxlength: 255
  },
  mimeType: {
    type: String,
    required: true
  },
  tamanioBytes: {
    type: Number,
    required: true
  },
  fechaSubida: {
    type: Date,
    required: true
  }
}, { _id: false });

// Schema para DocumentoSubido
const DocumentoSubidoSchema = new Schema<IDocumentoSubido>({
  documentoOCId: {
    type: String,
    ref: 'DocumentoOC'
  },
  solicitudPagoId: {
    type: String,
    ref: 'SolicitudPago'
  },
  requisitoDocumentoId: {
    type: String,
    ref: 'RequisitoDocumento'
  },
  usuarioId: {
    type: String,
    required: true,
    ref: 'UsuarioProveedor'
  },
  archivos: {
    type: [ArchivoSchema],
    required: true,
    validate: {
      validator: function(v: Array<any>) {
        return v && v.length > 0;
      },
      message: 'Se debe subir al menos un archivo'
    }
  },
  estado: {
    type: String,
    required: true,
    enum: ['pendiente', 'aprobado', 'observado', 'rechazado'],
    default: 'pendiente'
  },
  fechaSubida: {
    type: Date,
    required: true,
    default: Date.now
  },
  fechaRevision: {
    type: Date
  },
  comentariosRevision: {
    type: String,
    maxlength: 1000
  }
}, {
  timestamps: true,
  collection: 'documentos_subidos'
});

// Índices para optimizar consultas
DocumentoSubidoSchema.index({ documentoOCId: 1 });
DocumentoSubidoSchema.index({ solicitudPagoId: 1 });
DocumentoSubidoSchema.index({ usuarioId: 1 });
DocumentoSubidoSchema.index({ estado: 1 });
DocumentoSubidoSchema.index({ fechaSubida: -1 });

// Validación: debe pertenecer a un documento OC o una solicitud de pago, pero no a ambos
DocumentoSubidoSchema.pre('save', function(next) {
  if (!this.documentoOCId && !this.solicitudPagoId) {
    return next(new Error('El documento subido debe pertenecer a un documento OC o una solicitud de pago'));
  }
  if (this.documentoOCId && this.solicitudPagoId) {
    return next(new Error('El documento subido no puede pertenecer a ambos: documento OC y solicitud de pago'));
  }
  next();
});

export const DocumentoSubidoModel = model<IDocumentoSubido>('DocumentoSubido', DocumentoSubidoSchema);
