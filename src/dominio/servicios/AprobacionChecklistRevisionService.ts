import { AprobacionService } from './AprobacionService';
import { SolicitudPagoService } from './SolicitudPagoService';
import { DocumentoOCService } from './DocumentoOCService';
import { PlantillaChecklistService } from './PlantillaChecklistService';
import { DocumentoSubidoService } from './DocumentoSubidoService';
import { TipoPagoOCService } from './TipoPagoOCService';
import { PlantillaChecklist } from '../entidades/PlantillaChecklist';
import { DocumentoSubido } from '../entidades/DocumentoSubido';
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
