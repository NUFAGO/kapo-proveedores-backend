// ============================================================================
// ENTIDAD DE DOMINIO: Empresa
// Catálogo migrado desde inacons-backend (colección "empresas")
// ============================================================================

export interface Empresa {
  id: string;
  nombre_comercial: string;
  razon_social: string;
  descripcion?: string;
  estado: string;
  regimen_fiscal: string;
  ruc: string;
  imagenes?: string;
  color?: string;
}

export interface EmpresaInput {
  nombre_comercial: string;
  razon_social: string;
  descripcion?: string;
  estado: string;
  regimen_fiscal: string;
  ruc: string;
  imagenes?: string;
  color?: string;
}

export interface EmpresaUpdateInput {
  nombre_comercial?: string;
  razon_social?: string;
  descripcion?: string;
  estado?: string;
  regimen_fiscal?: string;
  ruc?: string;
  imagenes?: string;
  color?: string;
}
