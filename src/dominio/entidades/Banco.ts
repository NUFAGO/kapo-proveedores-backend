// ============================================================================
// ENTIDAD DE DOMINIO: Banco
// Catálogo migrado desde inacons-backend (colección "banco")
// ============================================================================

export interface Banco {
  id: string;
  nombre: string;
  abreviatura: string;
}

export interface BancoInput {
  nombre: string;
  abreviatura: string;
}

export interface BancoUpdateInput {
  nombre?: string;
  abreviatura?: string;
}
