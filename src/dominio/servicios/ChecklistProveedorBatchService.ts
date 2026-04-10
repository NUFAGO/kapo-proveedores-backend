import mongoose from 'mongoose';
import { SolicitudPagoService } from './SolicitudPagoService';
import { DocumentoSubidoService } from './DocumentoSubidoService';
import { AprobacionService } from './AprobacionService';
import { IExpedientePagoRepository } from '../repositorios/IExpedientePagoRepository';
import { IDocumentoOCRepository } from '../repositorios/IDocumentoOCRepository';
import { ISolicitudPagoRepository } from '../repositorios/ISolicitudPagoRepository';
import { ITipoPagoOCRepository } from '../repositorios/ITipoPagoOCRepository';
import { IReporteSolicitudPagoRepository } from '../repositorios/IReporteSolicitudPagoRepository';
import { ArchivoSubido, DocumentoSubidoInput } from '../entidades/DocumentoSubido';

export interface ArchivoChecklistProveedorInput {
  url: string;
  nombreOriginal: string;
  mimeType: string;
  tamanioBytes: number;
  fechaSubida: string;
}

export interface RequisitoArchivosChecklistProveedorInput {
  requisitoDocumentoId: string;
  archivos: ArchivoChecklistProveedorInput[];
}

export interface ChecklistProveedorBatchInput {
  context: 'solicitud_pago' | 'documento_oc';
  expedienteId: string;
  tipoPagoOCId?: string;
  montoSolicitado?: number;
  documentoOCId?: string;
  solicitanteId: string;
  solicitanteNombre: string;
  requisitosArchivos: RequisitoArchivosChecklistProveedorInput[];
  /** Solo solicitud_pago: ids de reportes a vincular (opcional). */
  reporteSolicitudPagoIds?: string[];
}

export interface ProcesarChecklistProveedorResultado {
  solicitudPagoId?: string;
  /** Solo `documento_oc`: id del documento OC asociado al envío. */
  documentoOCId?: string;
  documentosSubidosIds: string[];
  /** Siempre: fila `Aprobacion` creada al cerrar el batch (misma transacción). */
  aprobacionId: string;
}

/** Subsanación: entidad ya observada + nuevas entregas parciales (URLs provisionales vía input). */
export interface ChecklistProveedorSubsanacionInput {
  context: 'solicitud_pago' | 'documento_oc';
  expedienteId: string;
  entidadId: string;
  aprobacionId: string;
  solicitanteId: string;
  solicitanteNombre: string;
  requisitosArchivos: RequisitoArchivosChecklistProveedorInput[];
  /** Si viene informado (solo solicitud_pago), actualiza solicitud y aprobación. */
  montoSolicitado?: number;
  /** Solo solicitud_pago: ids de reportes sin vincular a asociar a la solicitud. */
  reporteSolicitudPagoIds?: string[];
}

export interface ProcesarChecklistSubsanacionResultado {
  entidadId: string;
  aprobacionId: string;
  documentosSubidosIds: string[];
}

function toArchivosSubidos(archivos: ArchivoChecklistProveedorInput[]): ArchivoSubido[] {
  return archivos.map((a) => ({
    url: a.url,
    nombreOriginal: a.nombreOriginal,
    mimeType: a.mimeType,
    tamanioBytes: a.tamanioBytes,
    fechaSubida: new Date(a.fechaSubida),
  }));
}

const EPS_MONTO = 1e-9;

export class ChecklistProveedorBatchService {
  constructor(
    private readonly solicitudPagoService: SolicitudPagoService,
    private readonly solicitudPagoRepository: ISolicitudPagoRepository,
    private readonly documentoSubidoService: DocumentoSubidoService,
    private readonly aprobacionService: AprobacionService,
    private readonly expedientePagoRepository: IExpedientePagoRepository,
    private readonly documentoOCRepository: IDocumentoOCRepository,
    private readonly tipoPagoOCRepository: ITipoPagoOCRepository,
    private readonly reporteSolicitudPagoRepository: IReporteSolicitudPagoRepository
  ) {}

  private async validarMontoSubsanacionSolicitud(
    expedienteId: string,
    tipoPagoOCId: string,
    montoSolicitado: number,
    session?: any
  ): Promise<void> {
    if (!(montoSolicitado > 0)) {
      throw new Error('El monto solicitado debe ser mayor a cero');
    }
    const expediente = await this.expedientePagoRepository.findById(expedienteId, session);
    if (!expediente) {
      throw new Error('El expediente especificado no existe');
    }
    const tipoPago = await this.tipoPagoOCRepository.findById(tipoPagoOCId, session);
    if (!tipoPago) {
      throw new Error('El tipo de pago especificado no existe');
    }
    if (tipoPago.expedienteId !== expedienteId) {
      throw new Error('El tipo de pago no pertenece al expediente');
    }
    if (montoSolicitado > expediente.montoDisponible + EPS_MONTO) {
      throw new Error('El monto solicitado supera el disponible a pagar del expediente');
    }
    if (tipoPago.porcentajeMaximo) {
      const montoMaximo = (expediente.montoContrato * tipoPago.porcentajeMaximo) / 100;
      if (montoSolicitado > montoMaximo + EPS_MONTO) {
        throw new Error(
          `El monto solicitado excede el máximo permitido (${montoMaximo}) para este tipo de pago`
        );
      }
    }
  }

  /**
   * Crea solicitud (si aplica), todos los documentos subidos y la aprobación en una transacción Mongo.
   * Si algo falla la transacción hace rollback completo — no quedan registros parciales.
   */
  async procesar(input: ChecklistProveedorBatchInput): Promise<ProcesarChecklistProveedorResultado> {
    const resultado: ProcesarChecklistProveedorResultado = {
      documentosSubidosIds: [],
      aprobacionId: '',
    };

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        if (input.context === 'solicitud_pago') {
          await this.procesarSolicitudPago(input, session, resultado);
        } else {
          await this.procesarDocumentoOC(input, session, resultado);
        }
      });
    } finally {
      await session.endSession();
    }

    return resultado;
  }

  /**
   * Proveedor subsana: inserta solo `DocumentoSubido` nuevos (con version = max+1 por requisito),
   * pone solicitud o documento OC en EN_REVISION y la misma aprobación en EN_REVISION.
   */
  async procesarSubsanacion(input: ChecklistProveedorSubsanacionInput): Promise<ProcesarChecklistSubsanacionResultado> {
    const reqs = input.requisitosArchivos.filter((r) => r.archivos?.length);
    if (reqs.length === 0) {
      throw new Error('Debe enviar al menos un requisito con archivos para subsanar');
    }

    const aprob = await this.aprobacionService.obtenerPorId(input.aprobacionId);
    if (aprob.expedienteId !== input.expedienteId) {
      throw new Error('La aprobación no pertenece al expediente indicado');
    }
    if (aprob.entidadId !== input.entidadId || aprob.entidadTipo !== input.context) {
      throw new Error('La aprobación no coincide con la entidad enviada');
    }
    if (aprob.estado !== 'OBSERVADO') {
      throw new Error('Solo se puede subsanar cuando la aprobación está OBSERVADA');
    }

    if (input.montoSolicitado != null && input.context !== 'solicitud_pago') {
      throw new Error('montoSolicitado solo aplica cuando context es solicitud_pago');
    }
    if (
      input.reporteSolicitudPagoIds?.length &&
      input.context !== 'solicitud_pago'
    ) {
      throw new Error('reporteSolicitudPagoIds solo aplica cuando context es solicitud_pago');
    }

    let montoSubsanacionSolicitud: number | undefined;

    if (input.context === 'solicitud_pago') {
      const sol = await this.solicitudPagoRepository.findById(input.entidadId);
      if (!sol) throw new Error('Solicitud de pago no encontrada');
      if (sol.expedienteId !== input.expedienteId) {
        throw new Error('La solicitud no pertenece al expediente indicado');
      }
      if (sol.estado !== 'OBSERVADA') {
        throw new Error('La solicitud debe estar observada para subsanar');
      }
      if (input.montoSolicitado != null) {
        const m = Number(input.montoSolicitado);
        if (!Number.isFinite(m)) {
          throw new Error('montoSolicitado inválido');
        }
        await this.validarMontoSubsanacionSolicitud(input.expedienteId, sol.tipoPagoOCId, m);
        montoSubsanacionSolicitud = m;
      }
    } else {
      const doc = await this.documentoOCRepository.findById(input.entidadId);
      if (!doc) throw new Error('Documento OC no encontrado');
      if (doc.expedienteId !== input.expedienteId) {
        throw new Error('El documento OC no pertenece al expediente indicado');
      }
      if (doc.estado !== 'OBSERVADA') {
        throw new Error('El documento OC debe estar observado para subsanar');
      }
    }

    const resultado: ProcesarChecklistSubsanacionResultado = {
      entidadId: input.entidadId,
      aprobacionId: input.aprobacionId,
      documentosSubidosIds: [],
    };

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const docsInput: DocumentoSubidoInput[] = [];
        for (const req of reqs) {
          const base = {
            usuarioId: input.solicitanteId,
            requisitoDocumentoId: req.requisitoDocumentoId,
            archivos: toArchivosSubidos(req.archivos),
          };
          if (input.context === 'solicitud_pago') {
            const maxV = await this.documentoSubidoService.obtenerMaxVersionPorPadreYRequisito(
              { solicitudPagoId: input.entidadId, requisitoDocumentoId: req.requisitoDocumentoId },
              session
            );
            docsInput.push({
              ...base,
              solicitudPagoId: input.entidadId,
              version: maxV + 1,
            });
          } else {
            const maxV = await this.documentoSubidoService.obtenerMaxVersionPorPadreYRequisito(
              { documentoOCId: input.entidadId, requisitoDocumentoId: req.requisitoDocumentoId },
              session
            );
            docsInput.push({
              ...base,
              documentoOCId: input.entidadId,
              version: maxV + 1,
            });
          }
        }

        const docs = await this.documentoSubidoService.crearDocumentosSubidosBatch(docsInput, session);
        resultado.documentosSubidosIds = docs.map((d) => d.id);

        if (input.context === 'solicitud_pago') {
          const solPatch: { estado: 'EN_REVISION'; montoSolicitado?: number } = {
            estado: 'EN_REVISION',
          };
          if (montoSubsanacionSolicitud != null) {
            solPatch.montoSolicitado = montoSubsanacionSolicitud;
          }
          const up = await this.solicitudPagoRepository.update(input.entidadId, solPatch, session);
          if (!up) throw new Error('No se pudo actualizar la solicitud a en revisión');
        } else {
          const docOc = await this.documentoOCRepository.findById(input.entidadId, session);
          if (docOc && !docOc.fechaCarga && docs.length > 0) {
            await this.documentoOCRepository.update(input.entidadId, { fechaCarga: new Date() }, session);
          }
          const up = await this.documentoOCRepository.update(
            input.entidadId,
            { estado: 'EN_REVISION' },
            session
          );
          if (!up) throw new Error('No se pudo actualizar el documento OC a en revisión');
        }

        await this.aprobacionService.volverAEnRevisionTrasSubsanacionProveedor(
          input.aprobacionId,
          session,
          montoSubsanacionSolicitud != null
            ? { montoSolicitado: montoSubsanacionSolicitud }
            : undefined
        );

        if (input.context === 'solicitud_pago') {
          const idsReportes = input.reporteSolicitudPagoIds?.filter((id) =>
            String(id).trim().length > 0
          );
          if (idsReportes?.length) {
            const expediente = await this.expedientePagoRepository.findById(input.expedienteId, session);
            if (!expediente) {
              throw new Error('El expediente especificado no existe');
            }
            await this.reporteSolicitudPagoRepository.vincularSolicitudPagoPorIds(
              idsReportes,
              input.entidadId,
              expediente.proveedorId,
              session
            );
          }
        }
      });
    } finally {
      await session.endSession();
    }

    return resultado;
  }

  private async procesarSolicitudPago(
    input: ChecklistProveedorBatchInput,
    session: mongoose.ClientSession,
    resultado: ProcesarChecklistProveedorResultado
  ): Promise<void> {
    if (!input.tipoPagoOCId || input.montoSolicitado === undefined || input.montoSolicitado === null) {
      throw new Error('tipoPagoOCId y montoSolicitado son obligatorios para context solicitud_pago');
    }

    const solicitud = await this.solicitudPagoService.crearSolicitudPago(
      {
        expedienteId: input.expedienteId,
        tipoPagoOCId: input.tipoPagoOCId,
        montoSolicitado: input.montoSolicitado,
      },
      session
    );
    resultado.solicitudPagoId = solicitud.id;

    // Construir todos los inputs en memoria y hacer un único insertMany (sin re-fetch del padre).
    const docsInput: DocumentoSubidoInput[] = input.requisitosArchivos
      .filter((req) => req.archivos?.length)
      .map((req) => ({
        solicitudPagoId: solicitud.id,
        usuarioId: input.solicitanteId,
        requisitoDocumentoId: req.requisitoDocumentoId,
        archivos: toArchivosSubidos(req.archivos),
      }));

    const docs = await this.documentoSubidoService.crearDocumentosSubidosBatch(docsInput, session);
    resultado.documentosSubidosIds = docs.map((d) => d.id);

    // Solicitud pasa a EN_REVISION; documentos subidos quedan en PENDIENTE.
    const solicitudEnRevision = await this.solicitudPagoRepository.update(
      solicitud.id,
      { estado: 'EN_REVISION' },
      session
    );
    if (!solicitudEnRevision) {
      throw new Error('No se pudo actualizar la solicitud a en revisión');
    }

    const aprobacion = await this.aprobacionService.crear(
      {
        entidadTipo: 'solicitud_pago',
        entidadId: solicitud.id,
        expedienteId: input.expedienteId,
        montoSolicitado: solicitud.montoSolicitado,
        tipoPagoOCId: input.tipoPagoOCId,
        solicitanteId: input.solicitanteId,
        solicitanteNombre: input.solicitanteNombre,
      },
      session
    );
    resultado.aprobacionId = aprobacion.id;

    const idsReportes = input.reporteSolicitudPagoIds?.filter((id) => String(id).trim().length > 0);
    if (idsReportes?.length) {
      const expediente = await this.expedientePagoRepository.findById(input.expedienteId, session);
      if (!expediente) {
        throw new Error('El expediente especificado no existe');
      }
      await this.reporteSolicitudPagoRepository.vincularSolicitudPagoPorIds(
        idsReportes,
        solicitud.id,
        expediente.proveedorId,
        session
      );
    }
  }

  private async procesarDocumentoOC(
    input: ChecklistProveedorBatchInput,
    session: mongoose.ClientSession,
    resultado: ProcesarChecklistProveedorResultado
  ): Promise<void> {
    if (!input.documentoOCId) {
      throw new Error('documentoOCId es obligatorio para context documento_oc');
    }

    const documentoOC = await this.documentoOCRepository.findById(input.documentoOCId, session);
    if (!documentoOC) {
      throw new Error('El documento OC especificado no existe');
    }
    if (documentoOC.expedienteId !== input.expedienteId) {
      throw new Error('El documento OC no pertenece al expediente indicado');
    }
    if (
      documentoOC.estado !== 'BORRADOR' &&
      documentoOC.estado !== 'EN_REVISION' &&
      documentoOC.estado !== 'OBSERVADA'
    ) {
      throw new Error(
        'El documento OC no admite envío de checklist en su estado actual (debe estar en borrador, en revisión u observado)'
      );
    }

    const expediente = await this.expedientePagoRepository.findById(input.expedienteId, session);
    if (!expediente) {
      throw new Error('El expediente especificado no existe');
    }
    // Igual que al crear solicitud de pago (SolicitudPagoService.crearSolicitudPago): primer envío a revisión.
    if (expediente.estado === 'configurado') {
      await this.expedientePagoRepository.update(
        input.expedienteId,
        { estado: 'en_ejecucion' },
        session
      );
    }

    // Construir todos los inputs en memoria y hacer un único insertMany (sin re-fetch del padre).
    const docsInput: DocumentoSubidoInput[] = input.requisitosArchivos
      .filter((req) => req.archivos?.length)
      .map((req) => ({
        documentoOCId: input.documentoOCId!,
        usuarioId: input.solicitanteId,
        requisitoDocumentoId: req.requisitoDocumentoId,
        archivos: toArchivosSubidos(req.archivos),
      }));

    const docs = await this.documentoSubidoService.crearDocumentosSubidosBatch(docsInput, session);
    resultado.documentosSubidosIds = docs.map((d) => d.id);

    // Actualizar fechaCarga una sola vez si aún no tenía (no N veces en el loop anterior).
    if (!documentoOC.fechaCarga && docs.length > 0) {
      await this.documentoOCRepository.update(
        input.documentoOCId,
        { fechaCarga: new Date() },
        session
      );
    }

    // Documento OC pasa a EN_REVISION.
    const docOcEnRevision = await this.documentoOCRepository.update(
      input.documentoOCId,
      { estado: 'EN_REVISION' },
      session
    );
    if (!docOcEnRevision) {
      throw new Error('No se pudo actualizar el documento OC a en revisión');
    }

    const aprobacion = await this.aprobacionService.crear(
      {
        entidadTipo: 'documento_oc',
        entidadId: input.documentoOCId,
        expedienteId: input.expedienteId,
        solicitanteId: input.solicitanteId,
        solicitanteNombre: input.solicitanteNombre,
      },
      session
    );
    resultado.aprobacionId = aprobacion.id;
    resultado.documentoOCId = input.documentoOCId;
  }

  /**
   * Comprueba que el expediente pertenezca al proveedor del token (resolver).
   */
  async assertExpedienteDelProveedor(expedienteId: string, proveedorId: string): Promise<void> {
    const exp = await this.expedientePagoRepository.findById(expedienteId);
    if (!exp) {
      throw new Error('El expediente especificado no existe');
    }
    if (exp.proveedorId !== proveedorId) {
      throw new Error('AUTORIZACION_DENEGADA: El expediente no pertenece a tu proveedor');
    }
  }
}
