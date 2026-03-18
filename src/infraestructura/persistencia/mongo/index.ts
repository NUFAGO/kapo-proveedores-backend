// ============================================================================
// REGISTRO DE MODELOS MONGODB
// ============================================================================
// Este archivo importa todos los schemas para asegurar que se registren en Mongoose
// cuando la aplicación inicia. Sin esta importación, los modelos no se crearían.

import './schemas/UsuarioProveedorSchema';
import './schemas/TipoDocumentoSchema';
import './schemas/PlantillaDocumentoSchema';
import './schemas/PlantillaChecklistSchema';
import './schemas/RequisitoDocumentoSchema';

// Los modelos ya se registran automáticamente con mongoose.model() en cada schema
// No necesitamos exportar nada aquí, solo asegurar que los archivos se importen

export * from './schemas/UsuarioProveedorSchema';
export * from './schemas/TipoDocumentoSchema';
export * from './schemas/PlantillaDocumentoSchema';
