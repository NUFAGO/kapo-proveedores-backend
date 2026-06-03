// ============================================================================
// ENTIDAD DE DOMINIO: ComentarioProveedor
// Bitácora/trazabilidad de proveedores y sus medios de pago (similar a los
// "comentarios" de inacons, pero propia del MS para diferenciar del comentario
// genérico). Polimórfica por (referencia_id + tabla).
// ============================================================================

export interface ComentarioProveedor {
  id: string;
  referencia_id: string;
  tabla: string; // 'proveedor' | 'medios_pago_proveedor'
  comentario: string;
  usuario_id?: string | null;
  usuario_nombre?: string | null; // snapshot del nombre (evita hidratación)
  createdAt?: string;
}

export interface ComentarioProveedorInput {
  referencia_id: string;
  tabla: string;
  comentario: string;
  usuario_id?: string | null;
  usuario_nombre?: string | null;
}
