import { Schema, model, Document } from 'mongoose'

export interface IPlantillaChecklistDocument extends Document {
  codigo: string
  nombre: string
  descripcion?: string
  categoriaChecklistId: string
  version: number
  plantillaBaseId: string
  vigente: boolean
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
  version: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  plantillaBaseId: {
    type: String,
    required: true,
    ref: 'PlantillaChecklist'
  },
  vigente: {
    type: Boolean,
    default: true
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
PlantillaChecklistSchema.index({ version: 1 })
PlantillaChecklistSchema.index({ categoriaChecklistId: 1, vigente: 1 }) // Para selectores
PlantillaChecklistSchema.index({ plantillaBaseId: 1 })
PlantillaChecklistSchema.index({ nombre: 'text', descripcion: 'text' })
PlantillaChecklistSchema.index({ activo: 1 })
PlantillaChecklistSchema.index({ vigente: 1 })
PlantillaChecklistSchema.index({ categoriaChecklistId: 1, version: -1 })

// Middleware para generar código automático antes de guardar
PlantillaChecklistSchema.pre('save', async function(next) {
  const doc = this as any; // Cast para acceder a las propiedades del documento
  
  // Si es un nuevo documento y no tiene código personalizado
  if (doc.isNew && !doc.isModified('codigo')) {
    try {
      // Obtener el contador para la categoría
      const CategoriaModel = doc.model('CategoriaChecklist')
      const categoria = await CategoriaModel.findById(doc.categoriaChecklistId)
      
      if (categoria) {
        // Generar código basado en categoría y contador: PREFIJO-NÚMERO
        const prefijo = categoria.nombre.toUpperCase().substring(0, 3).replace(/[^A-Z]/g, '')
        const contador = await doc.model('PlantillaChecklist').countDocuments({
          categoriaChecklistId: doc.categoriaChecklistId
        })
        const numero = String(contador + 1).padStart(3, '0')
        
        doc.codigo = `${prefijo}-${numero}`
      } else {
        // Fallback a código aleatorio
        const timestamp = Date.now().toString(36).toUpperCase()
        const random = Math.random().toString(36).substring(2, 5).toUpperCase()
        doc.codigo = `CHE-${timestamp}-${random}`
      }
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
