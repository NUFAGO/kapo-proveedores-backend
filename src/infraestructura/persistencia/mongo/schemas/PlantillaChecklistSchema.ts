import { Schema, model, Document } from 'mongoose'

export interface IPlantillaChecklistDocument extends Document {
  codigo: string
  nombre: string
  descripcion?: string
  categoriaChecklistId: string
  /** Checklist original para versionado; la primera versión suele apuntar a sí misma. */
  plantillaBaseId?: string
  activo: boolean
  fechaCreacion: Date
  fechaActualizacion?: Date
  requisitos?: string[]
}

const PlantillaChecklistSchema = new Schema<IPlantillaChecklistDocument>({
  codigo: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 50,
    default: function() {
      // Generar código automático tipo: CHE-001
      const timestamp = Date.now().toString(36).toUpperCase()
      const random = Math.random().toString(36).substring(2, 5).toUpperCase()
      return `CHE-${timestamp}-${random}`
    }
  },
  nombre: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  descripcion: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  categoriaChecklistId: {
    type: String,
    required: true,
    ref: 'CategoriaChecklist'
  },
  plantillaBaseId: {
    type: String,
    trim: true,
    ref: 'PlantillaChecklist'
  },
  activo: {
    type: Boolean,
    default: true
  },
  fechaCreacion: {
    type: Date,
    default: Date.now
  },
  fechaActualizacion: {
    type: Date
  },
  requisitos: [{
    type: String,
    ref: 'RequisitoDocumento'
  }]
}, {
  timestamps: true,
  collection: 'plantillas_checklist'
})

// Índices para rendimiento
PlantillaChecklistSchema.index({ categoriaChecklistId: 1 })
PlantillaChecklistSchema.index({ nombre: 'text', descripcion: 'text' })
PlantillaChecklistSchema.index({ activo: 1 })
PlantillaChecklistSchema.index({ categoriaChecklistId: 1, activo: 1 })
PlantillaChecklistSchema.index({ plantillaBaseId: 1 })

// Middleware para generar código automático antes de guardar
PlantillaChecklistSchema.pre('save', async function(next) {
  const doc = this as any; // Cast para acceder a las propiedades del documento
  
  // Si es un nuevo documento y no tiene código personalizado
  if (doc.isNew && !doc.isModified('codigo')) {
    try {
      // Buscar el último código CHECK-XXX existente
      const ultimaPlantilla = await doc.model('PlantillaChecklist')
        .findOne({ codigo: { $regex: '^CHECK-' } })
        .sort({ codigo: -1 })
      
      let contador = 1
      if (ultimaPlantilla && ultimaPlantilla.codigo) {
        // Extraer número del último código (ej: CHECK-005 -> 5)
        const match = ultimaPlantilla.codigo.match(/^CHECK-(\d+)$/)
        if (match) {
          contador = parseInt(match[1]) + 1
        }
      }
      
      // Generar nuevo código con 3 dígitos
      const numero = String(contador).padStart(3, '0')
      doc.codigo = `CHECK-${numero}`
      
    } catch (error) {
      // Fallback a código aleatorio si hay error
      const timestamp = Date.now().toString(36).toUpperCase()
      const random = Math.random().toString(36).substring(2, 5).toUpperCase()
      doc.codigo = `CHE-${timestamp}-${random}`
    }
  }
  
  // Actualizar fechaActualización si se modifica algo
  if (doc.isModified() && !doc.isNew) {
    doc.fechaActualizacion = new Date()
  }
  
  next()
})

export const PlantillaChecklistModel = model<IPlantillaChecklistDocument>('PlantillaChecklist', PlantillaChecklistSchema)
export default PlantillaChecklistModel
