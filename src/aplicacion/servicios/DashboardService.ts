import { ExpedientePagoModel } from '../../infraestructura/persistencia/mongo/schemas/ExpedientePagoSchema';
import { AprobacionModel } from '../../infraestructura/persistencia/mongo/schemas/AprobacionSchema';
import { DocumentoOCModel } from '../../infraestructura/persistencia/mongo/schemas/DocumentoOCSchema';
import { logger } from '../../infraestructura/logging';

// ============================================================================
// TIPOS PUBLICOS
// ============================================================================

export type RangoDashboard =
  | 'ESTE_MES'
  | 'MES_ANTERIOR'
  | 'ULTIMOS_30D'
  | 'ESTE_ANIO'
  | 'TODO';

export interface MetricasAdminFilter {
  rango?: RangoDashboard;
  proveedorId?: string | null;
}

export interface MetricasProveedorFilter {
  rango?: RangoDashboard;
}

export interface PagoPorMes {
  mes: string;
  monto: number;
  cantidad: number;
}

export interface SolicitudPorEstado {
  estado: string;
  cantidad: number;
}

export interface TopObra {
  obraId: string;
  obraNombre: string;
  montoTotal: number;
  ocCount: number;
}

export interface IngresoPorMes {
  mes: string;
  monto: number;
}

export interface AccionPendiente {
  tipo: 'DOCUMENTO_FALTANTE' | 'SOLICITUD_OBSERVADA' | 'OC_POR_VENCER';
  ocCodigo: string;
  mensaje: string;
  urlAccion: string;
  prioridad: 'ALTA' | 'MEDIA';
}

export interface MetricasAdmin {
  /** Expedientes con estado activo (configurado / en_ejecucion). Cada expediente representa una OC que entró al flujo de pagos. */
  ocActivasCount: number;
  /** Expedientes en estado `en_configuracion` — accionables: hay que terminarlos para que entren al flujo. */
  expedientesEnConfiguracionCount: number;
  /** STOCK: suma de `montoContrato` de TODOS los expedientes activos (sin filtro de fecha). */
  montoComprometido: number;
  /** STOCK: suma de `montoPagado` de TODOS los expedientes activos (sin filtro). Coherente con montoComprometido. */
  montoPagado: number;
  /** FLUJO: suma de aprobaciones APROBADAS dentro del rango (lo que se aprobó para pago en el período). */
  montoPagadoPeriodo: number;
  solicitudesPendientesCount: number;
  pagosPorMes: PagoPorMes[];
  solicitudesPorEstado: SolicitudPorEstado[];
  topObras: TopObra[];
}

export interface MetricasProveedor {
  montoPorCobrar: number;
  montoCobrado: number;
  ocActivasCount: number;
  solicitudesEnRevisionCount: number;
  ingresosPorMes: IngresoPorMes[];
  accionesPendientes: AccionPendiente[];
}

// ============================================================================
// CONSTANTES DE NEGOCIO
// ============================================================================

const ESTADOS_EXPEDIENTE_ACTIVO = ['configurado', 'en_ejecucion'];
const ESTADOS_APROBACION = ['EN_REVISION', 'OBSERVADO', 'APROBADO', 'RECHAZADO'];
const ESTADOS_SOLICITUD_PENDIENTES = ['EN_REVISION', 'OBSERVADO'];

// ============================================================================
// HELPERS DE FECHA
// ============================================================================

function rangoToFechas(rango: RangoDashboard): { from: Date; to: Date } | null {
  const now = new Date();
  switch (rango) {
    case 'ESTE_MES': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return { from, to };
    }
    case 'MES_ANTERIOR': {
      const from = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { from, to };
    }
    case 'ULTIMOS_30D': {
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      from.setHours(0, 0, 0, 0);
      return { from, to: now };
    }
    case 'ESTE_ANIO': {
      const from = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      const to = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { from, to };
    }
    case 'TODO':
    default:
      return null;
  }
}

function ultimosNMesesISO(n: number): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    out.push(`${d.getFullYear()}-${mm}`);
  }
  return out;
}

function inicioHaceNMeses(n: number): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - (n - 1), 1, 0, 0, 0, 0);
}

// ============================================================================
// SERVICIO DE DASHBOARD
// ============================================================================

/**
 * DashboardService — agrega metricas para los dashboards de admin y proveedor.
 *
 * No hereda de BaseService porque no es un CRUD de entidad: usa los modelos
 * Mongoose directamente para ejecutar pipelines de aggregation. Cada metodo
 * ejecuta varias agregaciones en paralelo y arma el objeto de respuesta.
 */
export class DashboardService {
  // --------------------------------------------------------------------------
  // ADMIN
  // --------------------------------------------------------------------------

  async obtenerMetricasAdmin(filter?: MetricasAdminFilter): Promise<MetricasAdmin> {
    const rango = filter?.rango ?? 'ESTE_MES';
    const proveedorId = filter?.proveedorId || undefined;
    const fechas = rangoToFechas(rango);

    try {
      // Cuando hay proveedorId, primero obtenemos sus expedienteIds para filtrar
      // las metricas de aprobaciones / solicitudes por expediente.
      const expedienteIdsDelProveedor = proveedorId
        ? await this.expedienteIdsPorProveedor(proveedorId)
        : null;

      const [
        ocActivasCount,
        expedientesEnConfiguracionCount,
        montoComprometido,
        montoPagado,
        montoPagadoPeriodo,
        solicitudesPendientesCount,
        pagosPorMes,
        solicitudesPorEstado,
        topObras,
      ] = await Promise.all([
        this.contarExpedientesActivos(proveedorId),
        this.contarExpedientesEnConfiguracion(proveedorId),
        this.sumarMontoComprometido(proveedorId),
        this.sumarMontoPagadoStock(proveedorId),
        this.sumarMontoPagadoFlujo(expedienteIdsDelProveedor, fechas),
        this.contarSolicitudesPendientes(expedienteIdsDelProveedor),
        this.agregarPagosPorMes(expedienteIdsDelProveedor),
        this.agregarSolicitudesPorEstado(expedienteIdsDelProveedor, fechas),
        this.agregarTopObras(proveedorId),
      ]);

      return {
        ocActivasCount,
        expedientesEnConfiguracionCount,
        montoComprometido,
        montoPagado,
        montoPagadoPeriodo,
        solicitudesPendientesCount,
        pagosPorMes,
        solicitudesPorEstado,
        topObras,
      };
    } catch (error) {
      logger.error('Error en obtenerMetricasAdmin', {
        error: error instanceof Error ? error.message : String(error),
        filter,
      });
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // PROVEEDOR
  // --------------------------------------------------------------------------

  async obtenerMetricasProveedor(
    proveedorId: string,
    filter?: MetricasProveedorFilter
  ): Promise<MetricasProveedor> {
    if (!proveedorId) {
      throw new Error('proveedorId es obligatorio');
    }
    const rango = filter?.rango ?? 'ESTE_MES';
    const fechas = rangoToFechas(rango);

    try {
      const expedienteIds = await this.expedienteIdsPorProveedor(proveedorId);

      const [
        montoPorCobrar,
        montoCobrado,
        ocActivasCount,
        solicitudesEnRevisionCount,
        ingresosPorMes,
        accionesPendientes,
      ] = await Promise.all([
        this.sumarMontoDisponible(proveedorId),
        this.sumarMontoPagadoFlujo(expedienteIds, fechas),
        this.contarExpedientesActivos(proveedorId),
        this.contarSolicitudesEnRevision(expedienteIds),
        this.agregarIngresosPorMes(expedienteIds),
        this.armarAccionesPendientes(proveedorId, expedienteIds),
      ]);

      return {
        montoPorCobrar,
        montoCobrado,
        ocActivasCount,
        solicitudesEnRevisionCount,
        ingresosPorMes,
        accionesPendientes,
      };
    } catch (error) {
      logger.error('Error en obtenerMetricasProveedor', {
        error: error instanceof Error ? error.message : String(error),
        proveedorId,
        filter,
      });
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // PIPELINES INDIVIDUALES
  // --------------------------------------------------------------------------

  private async expedienteIdsPorProveedor(proveedorId: string): Promise<string[]> {
    const docs = await ExpedientePagoModel.find({ proveedorId })
      .select('_id')
      .lean()
      .exec();
    return docs.map((d: any) => String(d._id));
  }

  private async contarExpedientesActivos(proveedorId?: string): Promise<number> {
    const match: any = { estado: { $in: ESTADOS_EXPEDIENTE_ACTIVO } };
    if (proveedorId) match.proveedorId = proveedorId;
    return ExpedientePagoModel.countDocuments(match).exec();
  }

  /**
   * Expedientes en estado `en_configuracion` — están a medio armar y no pueden
   * recibir solicitudes de pago hasta terminarse de configurar.
   */
  private async contarExpedientesEnConfiguracion(
    proveedorId?: string
  ): Promise<number> {
    const match: any = { estado: 'en_configuracion' };
    if (proveedorId) match.proveedorId = proveedorId;
    return ExpedientePagoModel.countDocuments(match).exec();
  }

  /**
   * STOCK: suma de `montoContrato` de TODOS los expedientes activos.
   * Sin filtro de fecha — representa el portfolio comprometido actual.
   */
  private async sumarMontoComprometido(proveedorId?: string): Promise<number> {
    const match: any = { estado: { $in: ESTADOS_EXPEDIENTE_ACTIVO } };
    if (proveedorId) match.proveedorId = proveedorId;

    const result = await ExpedientePagoModel.aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: '$montoContrato' } } },
    ]);
    return result[0]?.total ?? 0;
  }

  /**
   * STOCK: suma de `montoPagado` de TODOS los expedientes activos.
   * Coherente con montoComprometido — son del mismo universo de expedientes.
   */
  private async sumarMontoPagadoStock(proveedorId?: string): Promise<number> {
    const match: any = { estado: { $in: ESTADOS_EXPEDIENTE_ACTIVO } };
    if (proveedorId) match.proveedorId = proveedorId;

    const result = await ExpedientePagoModel.aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: '$montoPagado' } } },
    ]);
    return result[0]?.total ?? 0;
  }

  private async sumarMontoDisponible(proveedorId: string): Promise<number> {
    const result = await ExpedientePagoModel.aggregate([
      {
        $match: {
          proveedorId,
          estado: { $in: ESTADOS_EXPEDIENTE_ACTIVO },
        },
      },
      { $group: { _id: null, total: { $sum: '$montoDisponible' } } },
    ]);
    return result[0]?.total ?? 0;
  }

  /**
   * FLUJO: suma de aprobaciones APROBADAS en el rango — lo que se aprobó
   * para pago durante el período. Útil para "Pagado en el período".
   */
  private async sumarMontoPagadoFlujo(
    expedienteIds: string[] | null,
    fechas?: { from: Date; to: Date } | null
  ): Promise<number> {
    const match: any = { estado: 'APROBADO', entidadTipo: 'solicitud_pago' };
    if (expedienteIds) match.expedienteId = { $in: expedienteIds };
    if (fechas) match.fechaUltimaRevision = { $gte: fechas.from, $lte: fechas.to };

    const result = await AprobacionModel.aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: '$montoSolicitado' } } },
    ]);
    return result[0]?.total ?? 0;
  }

  private async contarSolicitudesPendientes(
    expedienteIds: string[] | null
  ): Promise<number> {
    const match: any = {
      estado: { $in: ESTADOS_SOLICITUD_PENDIENTES },
      entidadTipo: 'solicitud_pago',
    };
    if (expedienteIds) match.expedienteId = { $in: expedienteIds };
    return AprobacionModel.countDocuments(match).exec();
  }

  private async contarSolicitudesEnRevision(
    expedienteIds: string[] | null
  ): Promise<number> {
    const match: any = { estado: 'EN_REVISION', entidadTipo: 'solicitud_pago' };
    if (expedienteIds) match.expedienteId = { $in: expedienteIds };
    return AprobacionModel.countDocuments(match).exec();
  }

  /**
   * Pagos por mes — siempre últimos 6 meses calendario, ignora rango.
   * Usa fechaUltimaRevision de aprobaciones APROBADO.
   */
  private async agregarPagosPorMes(
    expedienteIds: string[] | null
  ): Promise<PagoPorMes[]> {
    const desde = inicioHaceNMeses(6);
    const match: any = {
      estado: 'APROBADO',
      entidadTipo: 'solicitud_pago',
      fechaUltimaRevision: { $gte: desde },
    };
    if (expedienteIds) match.expedienteId = { $in: expedienteIds };

    const raw = await AprobacionModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m', date: '$fechaUltimaRevision' },
          },
          monto: { $sum: '$montoSolicitado' },
          cantidad: { $sum: 1 },
        },
      },
    ]);

    const map = new Map<string, { monto: number; cantidad: number }>();
    for (const r of raw) {
      map.set(r._id, { monto: r.monto ?? 0, cantidad: r.cantidad ?? 0 });
    }
    return ultimosNMesesISO(6).map(mes => ({
      mes,
      monto: map.get(mes)?.monto ?? 0,
      cantidad: map.get(mes)?.cantidad ?? 0,
    }));
  }

  /**
   * Ingresos por mes (proveedor) — alias semantico de agregarPagosPorMes
   * sin el campo `cantidad`.
   */
  private async agregarIngresosPorMes(
    expedienteIds: string[] | null
  ): Promise<IngresoPorMes[]> {
    const pagos = await this.agregarPagosPorMes(expedienteIds);
    return pagos.map(p => ({ mes: p.mes, monto: p.monto }));
  }

  private async agregarSolicitudesPorEstado(
    expedienteIds: string[] | null,
    fechas?: { from: Date; to: Date } | null
  ): Promise<SolicitudPorEstado[]> {
    const match: any = { entidadTipo: 'solicitud_pago' };
    if (expedienteIds) match.expedienteId = { $in: expedienteIds };
    if (fechas) match.fechaEnvio = { $gte: fechas.from, $lte: fechas.to };

    const raw = await AprobacionModel.aggregate([
      { $match: match },
      { $group: { _id: '$estado', cantidad: { $sum: 1 } } },
    ]);

    const map = new Map<string, number>();
    for (const r of raw) map.set(r._id, r.cantidad ?? 0);

    return ESTADOS_APROBACION.map(estado => ({
      estado,
      cantidad: map.get(estado) ?? 0,
    }));
  }

  /**
   * Top 3 expedientes por monto comprometido — STOCK del portfolio activo.
   * Sin filtro de fecha (un expediente del año pasado sigue siendo relevante).
   */
  private async agregarTopObras(proveedorId?: string): Promise<TopObra[]> {
    const match: any = { estado: { $in: ESTADOS_EXPEDIENTE_ACTIVO } };
    if (proveedorId) match.proveedorId = proveedorId;

    const raw = await ExpedientePagoModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$codigo',
          montoTotal: { $sum: '$montoContrato' },
          ocCount: { $sum: 1 },
          descripcion: { $first: '$descripcion' },
        },
      },
      { $sort: { montoTotal: -1 } },
      { $limit: 3 },
    ]);

    return raw.map((r: any) => ({
      obraId: r._id ?? '',
      obraNombre: r.descripcion || r._id || 'Sin descripción',
      montoTotal: r.montoTotal ?? 0,
      ocCount: r.ocCount ?? 0,
    }));
  }

  // --------------------------------------------------------------------------
  // ACCIONES PENDIENTES (proveedor)
  // --------------------------------------------------------------------------

  private async armarAccionesPendientes(
    proveedorId: string,
    expedienteIds: string[]
  ): Promise<AccionPendiente[]> {
    if (!expedienteIds.length) return [];

    const ahora = new Date();
    const en7Dias = new Date(ahora);
    en7Dias.setDate(en7Dias.getDate() + 7);

    const [solicitudesObservadas, documentosFaltantes, expedientesPorVencer] =
      await Promise.all([
        AprobacionModel.find({
          entidadTipo: 'solicitud_pago',
          estado: 'OBSERVADO',
          expedienteId: { $in: expedienteIds },
        })
          .select('expedienteId entidadId')
          .lean()
          .exec(),
        DocumentoOCModel.find({
          expedienteId: { $in: expedienteIds },
          obligatorio: true,
          estado: { $in: ['BORRADOR', 'EN_REVISION', 'OBSERVADA'] },
        })
          .select('expedienteId checklistId')
          .limit(20)
          .lean()
          .exec(),
        ExpedientePagoModel.find({
          proveedorId,
          estado: { $in: ESTADOS_EXPEDIENTE_ACTIVO },
          fechaFinContrato: { $gte: ahora, $lte: en7Dias },
        })
          .select('codigo fechaFinContrato')
          .lean()
          .exec(),
      ]);

    // Mapa de expediente -> codigo para resolver mensajes
    const expedientesInfo = await ExpedientePagoModel.find({
      _id: { $in: expedienteIds },
    })
      .select('_id codigo')
      .lean()
      .exec();
    const ocCodigoPorExp = new Map<string, string>();
    for (const e of expedientesInfo) {
      ocCodigoPorExp.set(String(e._id), (e as any).codigo ?? '');
    }

    const acciones: AccionPendiente[] = [];

    for (const a of solicitudesObservadas as any[]) {
      const ocCodigo = ocCodigoPorExp.get(String(a.expedienteId)) ?? '';
      acciones.push({
        tipo: 'SOLICITUD_OBSERVADA',
        ocCodigo,
        mensaje: `Solicitud de pago observada en ${ocCodigo} — revisar`,
        urlAccion: `/proveedor/ordenes/${ocCodigo}`,
        prioridad: 'ALTA',
      });
    }

    for (const d of documentosFaltantes as any[]) {
      const ocCodigo = ocCodigoPorExp.get(String(d.expedienteId)) ?? '';
      acciones.push({
        tipo: 'DOCUMENTO_FALTANTE',
        ocCodigo,
        mensaje: `Documento obligatorio pendiente en ${ocCodigo}`,
        urlAccion: `/proveedor/ordenes/${ocCodigo}`,
        prioridad: 'MEDIA',
      });
    }

    for (const e of expedientesPorVencer as any[]) {
      const dias = Math.max(
        1,
        Math.ceil(
          (new Date(e.fechaFinContrato).getTime() - ahora.getTime()) / 86400000
        )
      );
      acciones.push({
        tipo: 'OC_POR_VENCER',
        ocCodigo: e.codigo ?? '',
        mensaje: `${e.codigo} vence en ${dias} ${dias === 1 ? 'día' : 'días'}`,
        urlAccion: `/proveedor/ordenes/${e.codigo ?? ''}`,
        prioridad: 'MEDIA',
      });
    }

    // Ordenar ALTA primero, limitar a 10
    acciones.sort((a, b) => (a.prioridad === b.prioridad ? 0 : a.prioridad === 'ALTA' ? -1 : 1));
    return acciones.slice(0, 10);
  }
}
