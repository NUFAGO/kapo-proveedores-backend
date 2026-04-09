import type { AgregarComentarioInput, EntidadTipoAprobacion, RevisionRequisitoInput } from '../entidades/Aprobacion';
import type { EstadoDocumentoSubido } from '../entidades/DocumentoSubido';
import type { DocumentoSubido } from '../entidades/DocumentoSubido';
import type { EstadoSolicitudPago } from '../entidades/SolicitudPago';
import { AprobacionService, type RevisorContext } from './AprobacionService';
import { AprobacionChecklistRevisionService } from './AprobacionChecklistRevisionService';
import { SolicitudPagoService } from './SolicitudPagoService';
import { DocumentoOCService } from './DocumentoOCService';
import { DocumentoSubidoService } from './DocumentoSubidoService';
import { ExpedientePagoService } from './ExpedientePagoService';
import { IExpedientePagoRepository } from '../repositorios/IExpedientePagoRepository';
import { ISolicitudPagoRepository } from '../repositorios/ISolicitudPagoRepository';
import { logger } from '../../infraestructura/logging';

export interface RevisionDocumentoChecklistInput {
  documentoSubidoId: string;
  resultado: 'APROBADO' | 'OBSERVADO';
  comentario?: string;
}

export interface FinalizarRevisionChecklistInput {
  aprobacionId: string;
  rechazar: boolean;
  comentarioRechazo?: string;
  /** Mensaje global en `observaciones` o `comentariosAprobacion` (no usado en rechazo). */
  comentarioGeneral?: string;
  revisionesDocumentos: RevisionDocumentoChecklistInput[];
  revisor: RevisorContext;
}

/**
 * Orquesta cierre de revisión checklist desde el kanban: estado de Aprobación,
 * entidad vinculada (solicitud de pago o documento OC), documentos subidos y,
 * solo en aprobación total de solicitud de pago, saldo del expediente.
 */
function fechaSubidaMs(d: DocumentoSubido): number {
  const raw = d.fechaSubida instanceof Date ? d.fechaSubida.getTime() : Date.parse(String(d.fechaSubida));
  return Number.isFinite(raw) ? raw : 0;
}

/** Misma regla que el modal admin: última `version` por requisito; si empatan, `fechaSubida` más reciente; sin `requisitoDocumentoId`, cada fila cuenta. */
function documentosActivosParaRevisionChecklist(docs: DocumentoSubido[]): DocumentoSubido[] {
  const porRequisito = new Map<string, DocumentoSubido[]>();
  const sinRequisito: DocumentoSubido[] = [];
  for (const d of docs) {
    const rid = d.requisitoDocumentoId?.trim();
    if (!rid) {
      sinRequisito.push(d);
      continue;
    }
    const arr = porRequisito.get(rid) ?? [];
    arr.push(d);
    porRequisito.set(rid, arr);
  }
  const out: DocumentoSubido[] = [];
  for (const grupo of porRequisito.values()) {
    if (grupo.length === 0) continue;
    out.push(
      grupo.reduce((a, b) => {
        if (b.version !== a.version) return b.version > a.version ? b : a;
        return fechaSubidaMs(b) >= fechaSubidaMs(a) ? b : a;
      })
    );
  }
  out.push(...sinRequisito);
  return out;
}

function toComentarioInput(
  ctx: FinalizarRevisionChecklistInput,
  mensaje: string,
  revisionesRequisito?: RevisionRequisitoInput[]
): AgregarComentarioInput {
  const o: AgregarComentarioInput = { mensaje, usuarioId: ctx.revisor.revisorId };
  const nom = ctx.revisor.revisorNombre;
  if (nom !== undefined && nom !== null && nom !== '') {
    o.usuarioNombre = nom;
  }
  if (revisionesRequisito !== undefined && revisionesRequisito.length > 0) {
    o.revisionesRequisito = revisionesRequisito;
  }
  return o;
}

export class AprobacionFinalizarRevisionChecklistService {
  constructor(
    private readonly aprobacionService: AprobacionService,
    private readonly checklistRevision: AprobacionChecklistRevisionService,
    private readonly solicitudPagoService: SolicitudPagoService,
    private readonly documentoOCService: DocumentoOCService,
    private readonly documentoSubidoService: DocumentoSubidoService,
    private readonly expedientePagoRepository: IExpedientePagoRepository,
    private readonly solicitudPagoRepository: ISolicitudPagoRepository,
    private readonly expedientePagoService: ExpedientePagoService
  ) {}

  async ejecutar(input: FinalizarRevisionChecklistInput): Promise<void> {
    const aprob = await this.aprobacionService.obtenerPorId(input.aprobacionId);
    if (aprob.estado === 'APROBADO' || aprob.estado === 'RECHAZADO') {
      throw new Error('La aprobación ya está cerrada');
    }
    if (aprob.estado !== 'EN_REVISION' && aprob.estado !== 'OBSERVADO') {
      throw new Error('Solo se puede finalizar revisión desde EN_REVISION u OBSERVADO');
    }

    const detalle = await this.checklistRevision.obtenerDetallePorAprobacionId(input.aprobacionId);
    const docs = detalle.documentosSubidos;
    const docsActivos = documentosActivosParaRevisionChecklist(docs);
    const docIds = new Set(docs.map((d) => d.id));
    const docIdsActivos = new Set(docsActivos.map((d) => d.id));

    if (input.rechazar) {
      if (detalle.entidadTipo === 'documento_oc') {
        throw new Error(
          'Las aprobaciones de documento OC no se rechazan: marcá las entregas observadas y usá «Observar».'
        );
      }
      const msg = input.comentarioRechazo?.trim();
      if (!msg) {
        throw new Error('El comentario de rechazo es obligatorio');
      }
      await this.ejecutarRechazo(detalle.entidadId, docs, msg, input);
      return;
    }

    const revs = input.revisionesDocumentos;
    if (revs.length !== docsActivos.length) {
      throw new Error('Debe enviar una decisión por cada entrega vigente del checklist');
    }
    const seen = new Set<string>();
    for (const r of revs) {
      if (!docIds.has(r.documentoSubidoId)) {
        throw new Error(`Documento subido no pertenece a esta aprobación: ${r.documentoSubidoId}`);
      }
      if (!docIdsActivos.has(r.documentoSubidoId)) {
        throw new Error(
          `Solo se revisan las entregas vigentes (última versión por requisito): ${r.documentoSubidoId}`
        );
      }
      if (seen.has(r.documentoSubidoId)) {
        throw new Error(`Documento duplicado en revisiones: ${r.documentoSubidoId}`);
      }
      seen.add(r.documentoSubidoId);
      if (r.resultado === 'OBSERVADO') {
        const c = r.comentario?.trim();
        if (!c) {
          throw new Error('Comentario obligatorio para cada documento observado');
        }
      }
    }

    const hayObservado = revs.some((r) => r.resultado === 'OBSERVADO');
    if (hayObservado) {
      await this.ejecutarObservacionMixta(aprob.entidadTipo, detalle.entidadId, revs, docsActivos, input);
    } else {
      await this.ejecutarAprobacionTotal(aprob.entidadTipo, detalle.entidadId, revs, docsActivos, input);
    }
  }

  private revisionesPorRequisito(
    docs: DocumentoSubido[],
    revById: Map<string, RevisionDocumentoChecklistInput>
  ): RevisionRequisitoInput[] {
    const byReq = new Map<string, 'APROBADO' | 'OBSERVADO'>();
    for (const d of docs) {
      const rid = d.requisitoDocumentoId?.trim();
      if (!rid) continue;
      const r = revById.get(d.id);
      if (!r) continue;
      const next = r.resultado === 'OBSERVADO' ? 'OBSERVADO' : 'APROBADO';
      const prev = byReq.get(rid);
      if (!prev || next === 'OBSERVADO') {
        byReq.set(rid, next);
      }
    }
    return [...byReq.entries()].map(([requisitoDocumentoId, resultado]) => ({
      requisitoDocumentoId,
      resultado,
    }));
  }

  private async actualizarEstadoDoc(
    id: string,
    estado: EstadoDocumentoSubido,
    comentario?: string
  ): Promise<void> {
    await this.documentoSubidoService.aplicarEstadoEnRevisionChecklist(id, estado, comentario);
  }

  /** Solo aplica a `solicitud_pago`: solicitud y entregas pasan a rechazado; documento OC no admite rechazo. */
  private async ejecutarRechazo(
    solicitudPagoId: string,
    docs: DocumentoSubido[],
    msg: string,
    input: FinalizarRevisionChecklistInput
  ): Promise<void> {
    for (const d of docs) {
      await this.actualizarEstadoDoc(d.id, 'RECHAZADO', msg);
    }

    await this.solicitudPagoService.rechazarSolicitudPago(solicitudPagoId, msg);

    await this.aprobacionService.registrarRechazo(
      input.aprobacionId,
      toComentarioInput(input, msg),
      input.revisor
    );
  }

  private async ejecutarObservacionMixta(
    entidadTipo: EntidadTipoAprobacion,
    entidadId: string,
    revs: RevisionDocumentoChecklistInput[],
    docsActivos: DocumentoSubido[],
    input: FinalizarRevisionChecklistInput
  ): Promise<void> {
    const revById = new Map(revs.map((r) => [r.documentoSubidoId, r] as const));
    for (const d of docsActivos) {
      const r = revById.get(d.id)!;
      if (r.resultado === 'OBSERVADO') {
        await this.actualizarEstadoDoc(d.id, 'OBSERVADO', r.comentario!.trim());
      } else {
        await this.actualizarEstadoDoc(d.id, 'APROBADO');
      }
    }

    const lineas = revs
      .filter((r) => r.resultado === 'OBSERVADO')
      .map((r) => r.comentario?.trim() || '')
      .filter(Boolean);
    const g = input.comentarioGeneral?.trim();
    const bloqueDetalle =
      lineas.length > 0 ? `Documentos observados:\n${lineas.join('\n')}` : 'Documentos observados';
    const mensajeObs = g ? `${g}\n\n${bloqueDetalle}` : bloqueDetalle;
    const revisionesRequisito = this.revisionesPorRequisito(docsActivos, revById);

    if (entidadTipo === 'solicitud_pago') {
      const sol = await this.solicitudPagoService.obtenerSolicitudPago(entidadId);
      if (sol.estado === 'EN_REVISION') {
        await this.solicitudPagoService.observarSolicitudPago(entidadId, mensajeObs);
      } else if (sol.estado === 'OBSERVADA') {
        const r = await this.solicitudPagoRepository.update(entidadId, {
          estado: 'OBSERVADA' as EstadoSolicitudPago,
        });
        if (!r) throw new Error('No se pudo actualizar solicitud observada');
      } else {
        throw new Error('La solicitud no admite observación en su estado actual');
      }
    } else {
      await this.documentoOCService.observarDocumentoOC(entidadId);
    }

    await this.aprobacionService.registrarObservacion(
      input.aprobacionId,
      toComentarioInput(input, mensajeObs, revisionesRequisito),
      input.revisor
    );
  }

  private async ejecutarAprobacionTotal(
    entidadTipo: EntidadTipoAprobacion,
    entidadId: string,
    revs: RevisionDocumentoChecklistInput[],
    docsActivos: DocumentoSubido[],
    input: FinalizarRevisionChecklistInput
  ): Promise<void> {
    const revById = new Map(revs.map((r) => [r.documentoSubidoId, r] as const));
    for (const d of docsActivos) {
      await this.actualizarEstadoDoc(d.id, 'APROBADO');
    }

    const revisionesRequisito = this.revisionesPorRequisito(docsActivos, revById);

    if (entidadTipo === 'solicitud_pago') {
      const aprob = await this.aprobacionService.obtenerPorId(input.aprobacionId);
      const sol = await this.solicitudPagoService.obtenerSolicitudPago(entidadId);
      if (sol.estado !== 'EN_REVISION' && sol.estado !== 'OBSERVADA') {
        throw new Error('La solicitud no admite aprobación en su estado actual');
      }
      /** Monto de la fila del kanban; si falta, el de la solicitud en BD. */
      const montoCompromiso =
        aprob.montoSolicitado !== undefined && aprob.montoSolicitado !== null
          ? Number(aprob.montoSolicitado)
          : sol.montoSolicitado;
      if (
        aprob.montoSolicitado !== undefined &&
        aprob.montoSolicitado !== null &&
        Math.abs(Number(aprob.montoSolicitado) - sol.montoSolicitado) > 0.01
      ) {
        logger.warn(
          '[AprobacionFinalizarRevisionChecklist] montoSolicitado aprobación ≠ solicitud; se usa el de la aprobación para el expediente',
          {
            aprobacionId: input.aprobacionId,
            solicitudPagoId: entidadId,
            montoSolicitadoAprobacion: aprob.montoSolicitado,
            montoSolicitadoSolicitud: sol.montoSolicitado,
            montoUsadoExpediente: montoCompromiso,
          }
        );
      }
      const expediente = await this.expedientePagoRepository.findById(sol.expedienteId);
      if (!expediente) throw new Error('Expediente no encontrado');
      const nuevoComp = expediente.montoComprometido + montoCompromiso;
      const nuevoDisp = expediente.montoContrato - nuevoComp;
      const saldosContext = {
        operacion: 'finalizarRevisionChecklist_aprobarSolicitud',
        aprobacionId: input.aprobacionId,
        solicitudPagoId: entidadId,
        expedienteId: sol.expedienteId,
        montoContrato: expediente.montoContrato,
        montoComprometidoActual: expediente.montoComprometido,
        montoPagado: expediente.montoPagado,
        montoDisponibleActual: expediente.montoDisponible,
        montoSolicitadoAprobacion: aprob.montoSolicitado ?? null,
        montoSolicitadoSolicitud: sol.montoSolicitado,
        montoUsadoParaComprometer: montoCompromiso,
        nuevoMontoComprometido: nuevoComp,
        nuevoMontoDisponible: nuevoDisp,
      };
      if (nuevoDisp < 0) {
        logger.warn(
          '[AprobacionFinalizarRevisionChecklist] montoDisponible quedaría negativo (fallará validación Mongo)',
          saldosContext
        );
      } else {
        logger.info('[AprobacionFinalizarRevisionChecklist] Actualizando saldos expediente al aprobar', saldosContext);
      }
      try {
        await this.expedientePagoRepository.update(sol.expedienteId, {
          montoComprometido: nuevoComp,
          montoDisponible: nuevoDisp,
        });
      } catch (err) {
        logger.error(
          '[AprobacionFinalizarRevisionChecklist] Error al persistir saldos del expediente',
          {
            ...saldosContext,
            error: err instanceof Error ? err.message : String(err),
          }
        );
        throw err;
      }
      const patchSolicitud: { estado: EstadoSolicitudPago; montoSolicitado?: number } = {
        estado: 'APROBADO',
      };
      if (Math.abs(montoCompromiso - sol.montoSolicitado) > 0.01) {
        patchSolicitud.montoSolicitado = montoCompromiso;
      }
      const up = await this.solicitudPagoRepository.update(entidadId, patchSolicitud);
      if (!up) throw new Error('No se pudo aprobar la solicitud');
      await this.expedientePagoService.intentarCerrarExpedientePorCupoYDocumentosOC(
        sol.expedienteId,
        { estado: expediente.estado, montoDisponible: nuevoDisp }
      );
    } else {
      await this.documentoOCService.aprobarDocumentoOC(entidadId);
    }

    const mensajeAprobacion =
      input.comentarioGeneral?.trim() || 'Aprobado en revisión de checklist';
    await this.aprobacionService.registrarAprobacion(
      input.aprobacionId,
      toComentarioInput(input, mensajeAprobacion, revisionesRequisito),
      input.revisor
    );
  }
}
