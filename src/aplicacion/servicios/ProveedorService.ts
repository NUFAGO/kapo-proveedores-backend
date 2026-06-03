import { IProveedorRepository } from '../../dominio/repositorios/IProveedorRepository';
import {
  Proveedor,
  ProveedorInput,
  ProveedorUpdateInput,
  ProveedorPaginationInput,
  ProveedorPaginatedResponse,
  EstadisticasDetalladas,
} from '../../dominio/entidades/Proveedor';
import { logger } from '../../infraestructura/logging';

const ESTADO_PROVEEDOR_ALTA = 'ACTIVO';

function normEstadoComparable(estado?: string | null): string {
  const t = (estado ?? '').trim();
  if (!t || t === '-') return '';
  return t.toLowerCase();
}

/** ACTIVO/activo e INACTIVO/inactivo → MAYÚSCULAS al guardar; estados de flujo igual. */
function normalizarEstadoProveedorParaEscritura(
  estado?: string | null
): string | undefined {
  if (estado == null) return undefined;
  const t = estado.trim();
  if (!t) return undefined;

  const l = normEstadoComparable(t);
  if (l === 'activo') return 'ACTIVO';
  if (l === 'inactivo') return 'INACTIVO';

  const u = t.toUpperCase();
  if (
    u === 'PENDIENTE_ACTIVACION' ||
    u === 'PENDIENTE_INACTIVACION' ||
    u === 'SUSPENDIDO' ||
    u === 'BLOQUEADO'
  ) {
    return u;
  }

  return t;
}

/**
 * Servicio de aplicación de Proveedor.
 * Ahora consume datos desde su propio dominio (Mongo); ya NO es proxy HTTP a inacons.
 * Recibe el repositorio por constructor (arquitectura hexagonal).
 *
 * Los nombres públicos se conservan porque CodigoAccesoService y el resolver
 * dependen de ellos.
 */
export class ProveedorService {
  constructor(private readonly repository: IProveedorRepository) {}

  async listarProveedores(): Promise<Proveedor[]> {
    return this.repository.listProveedor();
  }

  async listarProveedoresPaginados(
    filter?: ProveedorPaginationInput
  ): Promise<ProveedorPaginatedResponse> {
    return this.repository.listProveedoresPaginated(filter);
  }

  async obtenerProveedorPorId(id: string): Promise<Proveedor | null> {
    return this.repository.getProveedorById(id);
  }

  async buscarProveedorPorRuc(ruc: string): Promise<Proveedor | null> {
    return this.repository.getProveedorByRuc(ruc);
  }

  async listarProveedoresSubContrata(): Promise<Proveedor[]> {
    return this.repository.listProveedoresSubContrata();
  }

  /**
   * Conservado por compatibilidad de contrato. Las cotizaciones NO se migraron
   * (viven en compras), por lo que devuelve null. Si en el futuro kapo necesita
   * estas métricas, este método debe consultar al MS que posee cotizacion_proveedores.
   */
  async obtenerEstadisticasCotizaciones(_proveedorId: string): Promise<EstadisticasDetalladas | null> {
    return null;
  }

  async crearProveedor(input: ProveedorInput): Promise<Proveedor> {
    if (!input.razon_social?.trim()) throw new Error('La razón social es obligatoria');
    if (!input.ruc?.toString().trim()) throw new Error('El RUC es obligatorio');
    const payload: ProveedorInput = {
      ...input,
      estado: normalizarEstadoProveedorParaEscritura(input.estado) ?? ESTADO_PROVEEDOR_ALTA,
    };
    return this.repository.addProveedor(payload);
  }

  async actualizarProveedor(
    id: string,
    input: ProveedorUpdateInput
  ): Promise<Proveedor | null> {
    const payload: ProveedorUpdateInput = { ...input };
    if (input.estado !== undefined) {
      const normalizado = normalizarEstadoProveedorParaEscritura(input.estado);
      if (normalizado !== undefined) payload.estado = normalizado;
    }
    const result = await this.repository.updateProveedor(id, payload);
    if (!result) {
      logger.warn('Proveedor no encontrado para actualizar', { id });
      throw new Error('Proveedor no encontrado');
    }
    return result;
  }

  async eliminarProveedor(id: string): Promise<Proveedor | null> {
    const result = await this.repository.deleteProveedor(id);
    if (!result) {
      logger.warn('Proveedor no encontrado para eliminar', { id });
      throw new Error('Proveedor no encontrado');
    }
    return result;
  }
}
