// ============================================================================
// INTERFAZ PARA USUARIOS CONSUMIDOS DE OTRO MICROSERVICIO
// ============================================================================

export interface UsuarioExterno {
  id: string;
  nombres: string;
  apellidos: string;
  usuario: string;
  dni: string;
  cargo_id?: {
    id: string;
    nombre: string;
    descripcion?: string;
    gerarquia?: number;
  };
  rol_id?: string;
  empresa_id?: Array<{
    id: string;
    nombre_comercial: string;
    razon_social: string;
    ruc: string;
  }>;
  obra_id?: Array<{
    id: string;
    titulo: string;
    nombre: string;
    descripcion?: string;
    ubicacion?: string;
  }>;
  telefono?: string;
  firma?: string;
  foto_perfil?: string;
  email?: string;
}

export interface UsuarioExternoResponse {
  id: string;
  nombres: string;
  apellidos: string;
  usuario: string;
  dni: string;
  cargo_id?: {
    id: string;
    nombre: string;
    descripcion?: string;
    gerarquia?: number;
  };
  rol_id?: string;
  empresa_id?: Array<{
    id: string;
    nombre_comercial: string;
    razon_social: string;
    ruc: string;
  }>;
  obra_id?: Array<{
    id: string;
    titulo: string;
    nombre: string;
    descripcion?: string;
    ubicacion?: string;
  }>;
  telefono?: string;
  firma?: string;
  foto_perfil?: string;
  email?: string;
}
