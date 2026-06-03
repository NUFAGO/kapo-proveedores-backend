// ============================================================================
// ENTIDAD DE DOMINIO: ArchivoSustentoProveedor
// Sustentos de proveedores (subconjunto tipo='medio_pago' del archivos_sustento
// de inacons). Colección propia 'archivo_sustento_proveedor' para NO confundir
// con el archivos_sustento genérico/polimórfico de inacons.
// El binario vive en GCS; aquí se guarda la URL en el campo `file` (BD) y se
// expone como `url` en GraphQL.
// ============================================================================

export interface ArchivoSustentoProveedor {
  id: string;
  url: string; // mapeado desde el campo Mongo `file`
  referencia_id: string;
  tipo: string; // 'medio_pago'
}

export interface ArchivoSustentoProveedorInput {
  url: string;
  referencia_id: string;
  tipo: string;
}
