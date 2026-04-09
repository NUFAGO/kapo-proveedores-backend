import {
  Aprobacion,
  CrearAprobacionInput,
  AprobacionFiltros,
  AprobacionConnection,
  AgregarComentarioInput,
  ItemComentarioAprobacion,
  EstadoAprobacion,
  EntidadTipoAprobacion,
} from '../entidades/Aprobacion';
import { IAprobacionRepository } from '../repositorios/IAprobacionRepository';

export interface RevisorContext {
  revisorId: string;
  revisorNombre?: string;
}

export class AprobacionService {
  constructor(private readonly repo: IAprobacionRepository) {}

  private toItemComentario(input: AgregarComentarioInput): ItemComentarioAprobacion {
    const base: ItemComentarioAprobacion = {
      mensaje: input.mensaje,
      usuarioId: input.usuarioId,
      fecha: new Date(),
    };
    if (input.usuarioNombre !== undefined && input.usuarioNombre !== '') {
      base.usuarioNombre = input.usuarioNombre;
    }
    if (input.revisionesRequisito !== undefined && input.revisionesRequisito.length > 0) {
      base.revisionesRequisito = input.revisionesRequisito.map((r) => ({
        requisitoDocumentoId: r.requisitoDocumentoId,
        resultado: r.resultado,
      }));
    }
    return base;
  }

  private setRevisor(ctx: RevisorContext) {
    const s: { revisorId: string; revisorNombre?: string } = { revisorId: ctx.revisorId };
    if (ctx.revisorNombre !== undefined && ctx.revisorNombre !== '') {
      s.revisorNombre = ctx.revisorNombre;
    }
    return s;
  }

  async crear(input: CrearAprobacionInput, session?: any): Promise<Aprobacion> {
    if (input.entidadTipo === 'solicitud_pago') {
      if (input.montoSolicitado === undefined || input.montoSolicitado === null) {
        throw new Error('montoSolicitado es obligatorio cuando entidadTipo es solicitud_pago');
      }
      if (typeof input.montoSolicitado !== 'number' || Number.isNaN(input.montoSolicitado)) {
        throw new Error('montoSolicitado debe ser un número válido');
      }
      if (input.montoSolicitado < 0) {
        throw new Error('montoSolicitado no puede ser negativo');
      }
    } else if (input.montoSolicitado !== undefined || input.tipoPagoOCId !== undefined) {
      throw new Error('montoSolicitado y tipoPagoOCId solo aplican a entidadTipo solicitud_pago');
    }

    const existente = await this.repo.obtenerPorEntidad(input.entidadTipo, input.entidadId, session);
    if (existente) {
      throw new Error(
        `Ya existe una aprobación para ${input.entidadTipo} con id ${input.entidadId}`
      );
    }
    return this.repo.crear(input, session);
  }

  async obtenerPorId(id: string): Promise<Aprobacion> {
    const a = await this.repo.obtenerPorId(id);
    if (!a) throw new Error('Aprobación no encontrada');
    return a;
  }

  async obtenerPorEntidad(entidadTipo: string, entidadId: string): Promise<Aprobacion | null> {
    return this.repo.obtenerPorEntidad(entidadTipo, entidadId);
  }

  async listar(filtros: AprobacionFiltros): Promise<AprobacionConnection> {
    return this.repo.listar(filtros);
  }

  private static readonly ESTADOS_KANBAN: readonly EstadoAprobacion[] = [
    'EN_REVISION',
    'OBSERVADO',
    'APROBADO',
    'RECHAZADO',
  ];

  /**
   * Datos iniciales del tablero Kanban: una lista paginada por estado en paralelo (patrón reclutamiento).
   */
  async getKanbanDataAprobaciones(filtros?: {
    expedienteId?: string;
    entidadTipo?: EntidadTipoAprobacion;
    limit?: number;
  }): Promise<
    Record<
      EstadoAprobacion,
      { items: Aprobacion[]; total: number; hasNextPage: boolean }
    >
  > {
    const limit = filtros?.limit ?? 20;
    const base: AprobacionFiltros = {
      page: 1,
      limit,
      ...(filtros?.expedienteId !== undefined && filtros.expedienteId !== ''
        ? { expedienteId: filtros.expedienteId }
        : {}),
      ...(filtros?.entidadTipo !== undefined ? { entidadTipo: filtros.entidadTipo } : {}),
    };

    const results = await Promise.all(
      AprobacionService.ESTADOS_KANBAN.map((estado) =>
        this.repo.listar({ ...base, estado })
      )
    );

    const out = {} as Record<
      EstadoAprobacion,
      { items: Aprobacion[]; total: number; hasNextPage: boolean }
    >;
    AprobacionService.ESTADOS_KANBAN.forEach((estado, i) => {
      const conn = results[i]!;
      out[estado] = {
        items: conn.items,
        total: conn.totalCount,
        hasNextPage: conn.totalCount > limit,
      };
    });
    return out;
  }

  /**
   * Admin observa: agrega a observaciones y deja estado OBSERVADO.
   */
  async registrarObservacion(
    id: string,
    input: AgregarComentarioInput,
    revisor: RevisorContext
  ): Promise<Aprobacion> {
    const actual = await this.obtenerPorId(id);
    if (actual.estado === 'RECHAZADO' || actual.estado === 'APROBADO') {
      throw new Error('No se puede observar una aprobación finalizada');
    }
    const item = this.toItemComentario(input);
    const updated = await this.repo.agregarObservacion(id, item, {
      estado: 'OBSERVADO',
      ...this.setRevisor(revisor),
    });
    if (!updated) throw new Error('Aprobación no encontrada');
    return updated;
  }

  /**
   * Admin aprueba: agrega comentario (mensaje vacío → "Aprobado").
   */
  async registrarAprobacion(
    id: string,
    input: AgregarComentarioInput,
    revisor: RevisorContext
  ): Promise<Aprobacion> {
    const actual = await this.obtenerPorId(id);
    if (actual.estado === 'APROBADO') {
      throw new Error('La aprobación ya está finalizada');
    }
    if (actual.estado === 'RECHAZADO') {
      throw new Error('No se puede aprobar una solicitud rechazada');
    }
    const item = this.toItemComentario({
      ...input,
      mensaje: input.mensaje?.trim() || 'Aprobado',
    });
    const updated = await this.repo.agregarComentarioAprobacion(id, item, {
      estado: 'APROBADO',
      ...this.setRevisor(revisor),
    });
    if (!updated) throw new Error('Aprobación no encontrada');
    return updated;
  }

  /**
   * Admin rechaza: estado RECHAZADO.
   */
  async registrarRechazo(
    id: string,
    input: AgregarComentarioInput,
    revisor: RevisorContext
  ): Promise<Aprobacion> {
    const actual = await this.obtenerPorId(id);
    if (actual.estado === 'APROBADO') {
      throw new Error('No se puede rechazar una aprobación ya aprobada');
    }
    const item = this.toItemComentario(input);
    const updated = await this.repo.agregarComentarioRechazo(id, item, {
      estado: 'RECHAZADO',
      ...this.setRevisor(revisor),
    });
    if (!updated) throw new Error('Aprobación no encontrada');
    return updated;
  }

  /**
   * Tras corrección del proveedor: mantiene OBSERVADO e incrementa ciclo (sin PENDIENTE en aprobación).
   */
  async volverTrasCorreccion(id: string): Promise<Aprobacion> {
    const actual = await this.obtenerPorId(id);
    if (actual.estado !== 'OBSERVADO') {
      throw new Error('Solo se puede registrar una nueva vuelta desde estado OBSERVADO');
    }
    const updated = await this.repo.actualizar(id, {
      estado: 'OBSERVADO',
      numeroCiclo: actual.numeroCiclo + 1,
      fechaUltimaRevision: new Date(),
    });
    if (!updated) throw new Error('Aprobación no encontrada');
    return updated;
  }

  /**
   * Tras subsanación del proveedor (nuevos archivos): la fila vuelve a EN_REVISION en el kanban.
   */
  async volverAEnRevisionTrasSubsanacionProveedor(
    id: string,
    session?: any,
    extra?: { montoSolicitado?: number }
  ): Promise<Aprobacion> {
    const actual = await this.obtenerPorId(id);
    if (actual.estado !== 'OBSERVADO') {
      throw new Error('Solo se puede reenviar a revisión desde estado OBSERVADO');
    }
    const patch: {
      estado: 'EN_REVISION';
      numeroCiclo: number;
      fechaUltimaRevision: Date;
      montoSolicitado?: number;
    } = {
      estado: 'EN_REVISION',
      numeroCiclo: actual.numeroCiclo + 1,
      fechaUltimaRevision: new Date(),
    };
    if (
      extra?.montoSolicitado != null &&
      typeof extra.montoSolicitado === 'number' &&
      Number.isFinite(extra.montoSolicitado) &&
      extra.montoSolicitado >= 0
    ) {
      patch.montoSolicitado = extra.montoSolicitado;
    }
    const updated = await this.repo.actualizar(id, patch, session);
    if (!updated) throw new Error('Aprobación no encontrada');
    return updated;
  }
}
