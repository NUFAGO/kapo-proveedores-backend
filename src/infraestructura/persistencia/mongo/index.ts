// ============================================================================
// REGISTRO DE MODELOS MONGODB
// ============================================================================
// Este archivo importa todos los schemas para asegurar que se registren en Mongoose
// cuando la aplicación inicia. Sin esta importación, los modelos no se crearían.

import './schemas/UsuarioProveedorSchema';
import './schemas/PlantillaDocumentoSchema';
import './schemas/PlantillaChecklistSchema';
import './schemas/RequisitoDocumentoSchema';

// Nuevos schemas para el sistema de pagos
import './schemas/ExpedientePagoSchema';
import './schemas/DocumentoOCSchema';
import './schemas/DocumentoSubidoSchema';
import './schemas/TipoPagoOCSchema';
import './schemas/SolicitudPagoSchema';
import './schemas/ReporteSolicitudPagoSchema';

// Schema para códigos de acceso
import './schemas/CodigoAccesoSchema';

import './schemas/AprobacionSchema';

// Catálogos migrados desde inacons (Proveedor, Empresa, Banco y dependencias)
import './schemas/BancoSchema';
import './schemas/EmpresaSchema';
import './schemas/ProveedorSchema';
import './schemas/ContactoProveedorSchema';
import './schemas/MediosPagoProveedorSchema';
import './schemas/RucCacheSchema';
import './schemas/ComentarioProveedorSchema';
import './schemas/ArchivoSustentoProveedorSchema';

// Los modelos ya se registran automáticamente con mongoose.model() en cada schema
// No necesitamos exportar nada aquí, solo asegurar que los archivos se importen

export * from './schemas/UsuarioProveedorSchema';
export * from './schemas/PlantillaDocumentoSchema';
export * from './schemas/PlantillaChecklistSchema';
export * from './schemas/RequisitoDocumentoSchema';

// Exportar nuevos modelos
export * from './schemas/ExpedientePagoSchema';
export * from './schemas/DocumentoOCSchema';
export * from './schemas/DocumentoSubidoSchema';
export * from './schemas/TipoPagoOCSchema';
export * from './schemas/SolicitudPagoSchema';
export * from './schemas/ReporteSolicitudPagoSchema';
export * from './schemas/CodigoAccesoSchema';
export * from './schemas/AprobacionSchema';

// Catálogos migrados desde inacons
export * from './schemas/BancoSchema';
export * from './schemas/EmpresaSchema';
export * from './schemas/ProveedorSchema';
export * from './schemas/ContactoProveedorSchema';
export * from './schemas/MediosPagoProveedorSchema';
