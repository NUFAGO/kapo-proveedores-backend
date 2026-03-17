import mongoose, { Schema, Document } from 'mongoose';

export interface UsuarioProveedorDocument extends Document {
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  dni: string;
  username: string;
  password: string;
  proveedor_id: string;
  proveedor_nombre: string;
  estado: 'ACTIVO' | 'PENDIENTE' | 'BLOQUEADO' | 'INACTIVO';
  fecha_creacion: Date;
  fecha_actualizacion: Date;
}

const UsuarioProveedorSchema = new Schema<UsuarioProveedorDocument>({
  nombres: { type: String, required: true },
  apellido_paterno: { type: String, required: true },
  apellido_materno: { type: String, required: true },
  dni: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  proveedor_id: { type: String, required: true },
  proveedor_nombre: { type: String, required: true },
  estado: { 
    type: String, 
    required: true, 
    enum: ['ACTIVO', 'PENDIENTE', 'BLOQUEADO', 'INACTIVO'],
    default: 'PENDIENTE'
  },
  fecha_creacion: { type: Date, default: Date.now },
  fecha_actualizacion: { type: Date, default: Date.now }
});

// Índices para optimizar consultas
UsuarioProveedorSchema.index({ proveedor_id: 1 });
UsuarioProveedorSchema.index({ estado: 1 });
UsuarioProveedorSchema.index({ proveedor_id: 1, estado: 1 });

// Middleware para actualizar fecha_actualizacion antes de guardar
UsuarioProveedorSchema.pre('save', function(next) {
  this.fecha_actualizacion = new Date();
  next();
});

export const UsuarioProveedorModel = mongoose.model<UsuarioProveedorDocument>('UsuarioProveedor', UsuarioProveedorSchema);
