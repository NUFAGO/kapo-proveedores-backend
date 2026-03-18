import { Schema, model, Document } from 'mongoose'

export interface IRequisitoDocumentoDocument extends Document {
  checklistId: string
  tipoRequisito: 'documento' | 'formulario'
  plantillaDocumentoId?: string
  formularioId?: string
  obligatorio: boolean
  orden: number
}

const RequisitoDocumentoSchema = new Schema<IRequisitoDocumentoDocument>({
  checklistId: {
    type: String,
    required: true,
    ref: 'PlantillaChecklist'
  },
  tipoRequisito: {
    type: String,
    required: true,
    enum: ['documento', 'formulario']
  },
  plantillaDocumentoId: {
    type: String,
    ref: 'PlantillaDocumento',
    validate: {
      validator: function(this: IRequisitoDocumentoDocument, v: string) {
        // Si tipoRequisito es 'documento', plantillaDocumentoId es requerido
        if (this.tipoRequisito === 'documento') {
          return v && v.trim().length > 0
        }
        // Si tipoRequisito es 'formulario', plantillaDocumentoId debe ser null
        return !v
      },
      message: 'plantillaDocumentoId es requerido cuando tipoRequisito es "documento"'
    }
  },
  formularioId: {
    type: String,
    ref: 'PlantillaFormulario',
    validate: {
      validator: function(this: IRequisitoDocumentoDocument, v: string) {
        // Si tipoRequisito es 'formulario', formularioId es requerido
        if (this.tipoRequisito === 'formulario') {
          return v && v.trim().length > 0
        }
        // Si tipoRequisito es 'documento', formularioId debe ser null
        return !v
      },
      message: 'formularioId es requerido cuando tipoRequisito es "formulario"'
    }
  },
  obligatorio: {
    type: Boolean,
    required: true,
    default: false
  },
  orden: {
    type: Number,
    required: true,
    min: 1
  }
}, {
  timestamps: true,
  collection: 'requisitos_documento'
})

// Índices para optimizar consultas
RequisitoDocumentoSchema.index({ checklistId: 1, orden: 1 })
RequisitoDocumentoSchema.index({ checklistId: 1, tipoRequisito: 1 })
RequisitoDocumentoSchema.index({ plantillaDocumentoId: 1 })
RequisitoDocumentoSchema.index({ formularioId: 1 })
RequisitoDocumentoSchema.index({ obligatorio: 1 })

export const RequisitoDocumentoModel = model<IRequisitoDocumentoDocument>('RequisitoDocumento', RequisitoDocumentoSchema)
export default RequisitoDocumentoModel
