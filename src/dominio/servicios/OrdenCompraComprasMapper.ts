import type { Proveedor } from '../entidades/Proveedor';

/** Campos válidos en Kapo-Compras `OrdenCompraConRequerimiento` / `CotizacionMini`. */
export const COMPRAS_OC_LIST_FIELDS = `
  id
  codigo_orden
  estado
  descripcion
  fecha_ini
  fecha_fin
  tipo
  total
  obra_id
  req_usuario_id
  proveedor_id
  divisa_id
  estado_almacen
  estado_comprobante
  cantidad_cierre
  tiene_expediente
  requerimiento {
    obra_id
    req_usuario_id
    codigo_rq
    empresa_id
  }
  cotizacion_id {
    id
    codigo_cotizacion
    estado
    usuario_id {
      id
      nombres
      apellidos
      dni
    }
  }
`;

export type ComprasOrdenCompraRow = {
  id?: string;
  codigo_orden?: string | null;
  estado?: string | null;
  descripcion?: string | null;
  fecha_ini?: string | null;
  fecha_fin?: string | null;
  tipo?: string | null;
  total?: number | null;
  obra_id?: string | null;
  req_usuario_id?: string | null;
  proveedor_id?: string | null;
  divisa_id?: string | null;
  estado_almacen?: string | null;
  estado_comprobante?: string | null;
  cantidad_cierre?: number | null;
  tiene_expediente?: boolean | null;
  requerimiento?: Array<{
    obra_id?: string | null;
    req_usuario_id?: string | null;
    codigo_rq?: string | null;
    empresa_id?: string | null;
  }> | null;
  cotizacion_id?: {
    id?: string;
    codigo_cotizacion?: string | null;
    estado?: string | null;
    usuario_id?: {
      id?: string;
      nombres?: string | null;
      apellidos?: string | null;
      dni?: string | null;
    } | null;
  } | null;
};

function mapProveedorToLegacyShape(p: Proveedor | undefined | null) {
  if (!p) return null;
  return {
    id: p.id,
    nombre_comercial: p.nombre_comercial ?? '',
    ruc: p.ruc ?? '',
    razon_social: p.razon_social ?? '',
    telefono: p.telefono ?? '',
    correo: p.correo ?? '',
    direccion: p.direccion ?? '',
    rubro: p.rubro ?? '',
    estado: p.estado ?? '',
    tipo: p.tipo ?? '',
    actividad: p.actividad ?? '',
    estado_sunat: p.estado_sunat ?? '',
    condicion: p.condicion ?? '',
    agente_retencion: p.agente_retencion ?? false,
    sub_contrata: p.sub_contrata ?? false,
    distrito: p.distrito ?? '',
    provincia: p.provincia ?? '',
    departamento: p.departamento ?? '',
  };
}

/**
 * Adapta fila de Kapo-Compras al shape expuesto por Proveedores (paridad monolito / FE).
 */
export function mapComprasRowToProveedoresOc(
  row: ComprasOrdenCompraRow,
  proveedorById: Map<string, Proveedor>,
): Record<string, unknown> {
  const req0 = row.requerimiento?.[0];
  const proveedorId = row.proveedor_id?.trim() || '';
  const proveedor = proveedorId ? proveedorById.get(proveedorId) : undefined;

  return {
    ...row,
    codigo_rq: req0?.codigo_rq ?? null,
    proveedor: mapProveedorToLegacyShape(proveedor ?? null),
    obra: row.obra_id
      ? {
          id: row.obra_id,
          titulo: null,
          nombre: null,
          descripcion: null,
          direccion: null,
          estado: null,
        }
      : null,
    pagos: [],
    comprobantes: [],
    cotizacion_id: row.cotizacion_id
      ? {
          ...row.cotizacion_id,
          aprobacion: null,
          fecha: null,
        }
      : null,
  };
}

// ============================================================================
// Variante LEAN para la pantalla `revision-asignacion/ordenes-compra` (solo
// servicios). Lee de Kapo-Compras UNICAMENTE campos de su propio dominio (sin
// `requerimiento{}` ni `cotizacion_id{}`, que en Compras se hidratan por HTTP a
// otros MS y encarecen/rompen la query). El proveedor se hidrata en NUESTRO MS.
// ============================================================================

/** Campos mínimos de `OrdenCompraConRequerimiento` (dominio propio de Compras). */
export const COMPRAS_OC_REVISION_FIELDS = `
  id
  codigo_orden
  descripcion
  estado
  total
  fecha_ini
  fecha_fin
  tipo
  tiene_expediente
  proveedor_id
`;

export type ComprasOrdenCompraRevisionRow = {
  id?: string;
  codigo_orden?: string | null;
  descripcion?: string | null;
  estado?: string | null;
  total?: number | null;
  fecha_ini?: string | null;
  fecha_fin?: string | null;
  tipo?: string | null;
  tiene_expediente?: boolean | null;
  proveedor_id?: string | null;
};

/** Adapta la fila mínima de Compras + proveedor hidratado localmente (solo lo que usa el FE). */
export function mapComprasRowToOcRevision(
  row: ComprasOrdenCompraRevisionRow,
  proveedorById: Map<string, Proveedor>,
): Record<string, unknown> {
  const proveedorId = row.proveedor_id?.trim() || '';
  const proveedor = proveedorId ? proveedorById.get(proveedorId) : undefined;
  return {
    id: row.id,
    codigo_orden: row.codigo_orden ?? null,
    descripcion: row.descripcion ?? null,
    estado: row.estado ?? null,
    total: row.total ?? null,
    fecha_ini: row.fecha_ini ?? null,
    fecha_fin: row.fecha_fin ?? null,
    tiene_expediente: row.tiene_expediente ?? null,
    proveedor_id: row.proveedor_id ?? null,
    proveedor: proveedor
      ? { id: proveedor.id, nombre_comercial: proveedor.nombre_comercial ?? '' }
      : null,
  };
}

export function collectProveedorIdsFromRevisionRows(
  rows: ComprasOrdenCompraRevisionRow[],
): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    const id = row.proveedor_id?.trim();
    if (id) ids.add(id);
  }
  return [...ids];
}

export function collectProveedorIdsFromComprasRows(rows: ComprasOrdenCompraRow[]): string[] {
  const ids = new Set<string>();
  for (const row of rows) {
    const id = row.proveedor_id?.trim();
    if (id) ids.add(id);
  }
  return [...ids];
}
