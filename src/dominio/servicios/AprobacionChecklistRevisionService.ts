import { AprobacionService } from './AprobacionService';
import { SolicitudPagoService } from './SolicitudPagoService';
import { DocumentoOCService } from './DocumentoOCService';
import { PlantillaChecklistService } from './PlantillaChecklistService';
import { DocumentoSubidoService } from './DocumentoSubidoService';
import { TipoPagoOCService } from './TipoPagoOCService';
import { PlantillaChecklist } from '../entidades/PlantillaChecklist';
import { DocumentoSubido } from '../entidades/DocumentoSubido';
import type { SolicitudPago } from '../entidades/SolicitudPago';
import { EntidadTipoAprobacion, EstadoAprobacion } from '../entidades/Aprobacion';

export interface AprobacionChecklistRevisionDetalle {
  aprobacionId: string;
  estado: EstadoAprobacion;
  entidadTipo: EntidadTipoAprobacion;
  entidadId: string;
  expedienteId: string;
  montoSolicitado?: number;
  tipoPagoOCId?: string;
  checklist: PlantillaChecklist;
  documentosSubidos: DocumentoSubido[];
}

/**
 * Arma checklist + entregas para revisión admin a partir del ítem del kanban (Aprobacion).
 */
export class AprobacionChecklistRevisionService {
  constructor(
    private readonly aprobacionService: AprobacionService,
    private readonly solicitudPagoService: SolicitudPagoService,
    private readonly documentoOCService: DocumentoOCService,
    private readonly plantillaChecklistService: PlantillaChecklistService,
    private readonly documentoSubidoService: DocumentoSubidoService,
    private readonly tipoPagoOCService: TipoPagoOCService
  ) {}

  async obtenerDetallePorAprobacionId(aprobacionId: string): Promise<AprobacionChecklistRevisionDetalle> {
    const aprob = await this.aprobacionService.obtenerPorId(aprobacionId);

    if (aprob.entidadTipo === 'solicitud_pago') {
      const solicitud = await this.solicitudPagoService.obtenerSolicitudPago(aprob.entidadId);
      const tipoPagoId = aprob.tipoPagoOCId ?? solicitud.tipoPagoOCId;
      const tipoPago = await this.tipoPagoOCService.obtenerTipoPagoOC(tipoPagoId);
      const checklist = await this.plantillaChecklistService.obtenerConRequisitos(tipoPago.checklistId);
      if (!checklist) {
        throw new Error('Plantilla de checklist no encontrada o inactiva');
      }
      const documentosSubidos = await this.documentoSubidoService.obtenerDocumentosSubidosPorSolicitudPago(
        solicitud.id
      );
      return {
        aprobacionId: aprob.id,
        estado: aprob.estado,
        entidadTipo: 'solicitud_pago',
        entidadId: solicitud.id,
        expedienteId: aprob.expedienteId,
        /** Mismo criterio que al aprobar: primero el monto de la fila `Aprobacion` (kanban), si no el de la solicitud. */
        montoSolicitado:
          aprob.montoSolicitado !== undefined && aprob.montoSolicitado !== null
            ? Number(aprob.montoSolicitado)
            : solicitud.montoSolicitado,
        tipoPagoOCId: tipoPagoId,
        checklist,
        documentosSubidos,
      };
    }

    if (aprob.entidadTipo === 'documento_oc') {
      const docOc = await this.documentoOCService.obtenerDocumentoOC(aprob.entidadId);
      const checklist = await this.plantillaChecklistService.obtenerConRequisitos(docOc.checklistId);
      if (!checklist) {
        throw new Error('Plantilla de checklist no encontrada o inactiva');
      }
      const documentosSubidos = await this.documentoSubidoService.obtenerDocumentosSubidosPorDocumentoOC(
        docOc.id
      );
      return {
        aprobacionId: aprob.id,
        estado: aprob.estado,
        entidadTipo: 'documento_oc',
        entidadId: docOc.id,
        expedienteId: aprob.expedienteId,
        checklist,
        documentosSubidos,
      };
    }

    throw new Error(`Tipo de entidad no soportado: ${String(aprob.entidadTipo)}`);
  }

  /**
   * Misma forma que N × `obtenerDetallePorAprobacionId`, optimizado: pocas consultas Mongo (aprobaciones, tipos pago, checklists, documentos).
   */
  async construirDetallesRevisionPorSolicitudesPago(
    solicitudes: SolicitudPago[]
  ): Promise<Map<string, AprobacionChecklistRevisionDetalle | null>> {
    const out = new Map<string, AprobacionChecklistRevisionDetalle | null>();
    if (solicitudes.length === 0) {
      return out;
    }

    const solicitudIds = solicitudes.map((s) => s.id);

    const aprobs = await this.aprobacionService.listarPorEntidadTipoYEntidadIds(
      'solicitud_pago',
      solicitudIds
    );
    const aprobPorEntidad = new Map<string, (typeof aprobs)[0]>();
    for (const a of aprobs) {
      const cur = aprobPorEntidad.get(a.entidadId);
      if (!cur || (a.numeroCiclo ?? 0) > (cur.numeroCiclo ?? 0)) {
        aprobPorEntidad.set(a.entidadId, a);
      }
    }

    const tipoPagoIdsNeeded = new Set<string>();
    for (const sol of solicitudes) {
      const ap = aprobPorEntidad.get(sol.id);
      const tid = ap?.tipoPagoOCId ?? sol.tipoPagoOCId;
      if (tid) {
        tipoPagoIdsNeeded.add(tid);
      }
    }

    const [tipos, todosDocs] = await Promise.all([
      this.tipoPagoOCService.obtenerPorIds([...tipoPagoIdsNeeded]),
      this.documentoSubidoService.obtenerDocumentosSubidosPorSolicitudPagoIds(solicitudIds),
    ]);

    const tipoPorId = new Map(tipos.map((t) => [t.id, t]));
    const docsPorSol = new Map<string, DocumentoSubido[]>();
    for (const d of todosDocs) {
      const sid = d.solicitudPagoId;
      if (!sid) {
        continue;
      }
      if (!docsPorSol.has(sid)) {
        docsPorSol.set(sid, []);
      }
      docsPorSol.get(sid)!.push(d);
    }

    const checklistIds = [
      ...new Set(
        tipos.map((t) => t.checklistId).filter((cid): cid is string => Boolean(cid && String(cid).trim()))
      ),
    ];
    const checklists = await this.plantillaChecklistService.obtenerConRequisitosPorIds(checklistIds);
    const checklistPorId = new Map(checklists.map((c) => [c.id, c]));

    for (const sol of solicitudes) {
      try {
        const aprob = aprobPorEntidad.get(sol.id);
        if (!aprob) {
          out.set(sol.id, null);
          continue;
        }
        const tipoPagoId = aprob.tipoPagoOCId ?? sol.tipoPagoOCId;
        const tipoPago = tipoPorId.get(tipoPagoId);
        if (!tipoPago?.checklistId) {
          out.set(sol.id, null);
          continue;
        }
        const checklist = checklistPorId.get(tipoPago.checklistId);
        if (!checklist) {
          out.set(sol.id, null);
          continue;
        }
        const documentosSubidos = docsPorSol.get(sol.id) ?? [];
        out.set(sol.id, {
          aprobacionId: aprob.id,
          estado: aprob.estado,
          entidadTipo: 'solicitud_pago',
          entidadId: sol.id,
          expedienteId: aprob.expedienteId,
          montoSolicitado:
            aprob.montoSolicitado !== undefined && aprob.montoSolicitado !== null
              ? Number(aprob.montoSolicitado)
              : sol.montoSolicitado,
          tipoPagoOCId: tipoPagoId,
          checklist,
          documentosSubidos,
        });
      } catch {
        out.set(sol.id, null);
      }
    }

    return out;
  }

  /**
   * Solo entregas vinculadas a la aprobación (sin cargar plantilla checklist).
   * Para portal proveedor: una sola operación GraphQL junto a la fila `Aprobacion`.
   */
  async obtenerDocumentosSubidosPorAprobacionId(aprobacionId: string): Promise<DocumentoSubido[]> {
    const aprob = await this.aprobacionService.obtenerPorId(aprobacionId);

    if (aprob.entidadTipo === 'solicitud_pago') {
      const solicitud = await this.solicitudPagoService.obtenerSolicitudPago(aprob.entidadId);
      return this.documentoSubidoService.obtenerDocumentosSubidosPorSolicitudPago(solicitud.id);
    }

    if (aprob.entidadTipo === 'documento_oc') {
      const docOc = await this.documentoOCService.obtenerDocumentoOC(aprob.entidadId);
      return this.documentoSubidoService.obtenerDocumentosSubidosPorDocumentoOC(docOc.id);
    }

    throw new Error(`Tipo de entidad no soportado: ${String(aprob.entidadTipo)}`);
  }
}
