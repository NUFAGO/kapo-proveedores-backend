import { IResolvers } from '@graphql-tools/utils';
import { ChecklistProveedorBatchService } from '../../../dominio/servicios/ChecklistProveedorBatchService';
import { ErrorHandler } from './ErrorHandler';
import { proveedorGuard, GraphQLContext } from '../../auth/GraphQLGuards';
import type { ArchivoChecklistProveedorInput, RequisitoArchivosChecklistProveedorInput } from '../../../dominio/servicios/ChecklistProveedorBatchService';

type ChecklistProveedorBatchInputGql = {
  context: 'solicitud_pago' | 'documento_oc';
  expedienteId: string;
  tipoPagoOCId?: string;
  montoSolicitado?: number;
  documentoOCId?: string;
  solicitanteId: string;
  solicitanteNombre: string;
  reporteSolicitudPagoIds?: string[] | null;
  requisitosArchivos: Array<{
    requisitoDocumentoId: string;
    archivos: Array<{
      url: string;
      nombreOriginal: string;
      mimeType: string;
      tamanioBytes: number;
      fechaSubida: string;
    }>;
  }>;
};

type ChecklistProveedorSubsanacionInputGql = {
  context: 'solicitud_pago' | 'documento_oc';
  expedienteId: string;
  entidadId: string;
  aprobacionId: string;
  solicitanteId: string;
  solicitanteNombre: string;
  requisitosArchivos: ChecklistProveedorBatchInputGql['requisitosArchivos'];
  montoSolicitado?: number | null;
  reporteSolicitudPagoIds?: string[] | null;
};

type GqlRequisitosArchivos = ChecklistProveedorBatchInputGql['requisitosArchivos'];

function mapArchivoChecklistFromGql(a: GqlRequisitosArchivos[number]['archivos'][number]): ArchivoChecklistProveedorInput {
  return {
    url: a.url,
    nombreOriginal: a.nombreOriginal,
    mimeType: a.mimeType,
    tamanioBytes: Number(a.tamanioBytes),
    fechaSubida: typeof a.fechaSubida === 'string' ? a.fechaSubida : String(a.fechaSubida),
  };
}

function mapRequisitosArchivosFromGql(requisitos: GqlRequisitosArchivos): RequisitoArchivosChecklistProveedorInput[] {
  return requisitos.map((r) => ({
    requisitoDocumentoId: r.requisitoDocumentoId,
    archivos: r.archivos.map(mapArchivoChecklistFromGql),
  }));
}

/** Solo `solicitud_pago` puede enviar ids; en `documento_oc` se ignoran aunque vengan en el input. */
function reporteSolicitudPagoIdsForContext(
  context: 'solicitud_pago' | 'documento_oc',
  raw: string[] | null | undefined
): string[] | undefined {
  if (context !== 'solicitud_pago') return undefined;
  const ids =
    raw
      ?.map((id) => (id == null ? '' : String(id).trim()))
      .filter((s) => s.length > 0) ?? [];
  return ids.length > 0 ? ids : undefined;
}

async function assertProveedorSesionYExpediente(
  context: GraphQLContext,
  expedienteId: string,
  solicitanteId: string,
  batchService: ChecklistProveedorBatchService
): Promise<void> {
  const user = context.user;
  if (!user?.id) {
    throw new Error('AUTENTICACION_REQUERIDA: Usuario no identificado');
  }
  if (String(user.id) !== String(solicitanteId)) {
    throw new Error('SOLICITUD_INVALIDA: solicitanteId no coincide con la sesión');
  }
  const proveedorId = user.proveedor_id;
  if (!proveedorId) {
    throw new Error('SOLICITUD_INVALIDA: Sesión sin proveedor asociado');
  }
  await batchService.assertExpedienteDelProveedor(expedienteId, String(proveedorId));
}

export class ChecklistProveedorResolver {
  constructor(private readonly batchService: ChecklistProveedorBatchService) {}

  getResolvers(): IResolvers {
    return {
      Mutation: {
        procesarChecklistProveedor: proveedorGuard(
          async (_: unknown, args: { input: ChecklistProveedorBatchInputGql }, context: GraphQLContext) => {
            return await ErrorHandler.handleError(
              async () => {
                const input = args.input;
                await assertProveedorSesionYExpediente(context, input.expedienteId, input.solicitanteId, this.batchService);

                const reporteSolicitudPagoIds = reporteSolicitudPagoIdsForContext(
                  input.context,
                  input.reporteSolicitudPagoIds
                );
                const requisitosArchivos = mapRequisitosArchivosFromGql(input.requisitosArchivos);

                return await this.batchService.procesar({
                  context: input.context,
                  expedienteId: input.expedienteId,
                  solicitanteId: input.solicitanteId,
                  solicitanteNombre: input.solicitanteNombre,
                  requisitosArchivos,
                  ...(input.tipoPagoOCId !== undefined ? { tipoPagoOCId: input.tipoPagoOCId } : {}),
                  ...(input.montoSolicitado !== undefined && input.montoSolicitado !== null
                    ? { montoSolicitado: input.montoSolicitado }
                    : {}),
                  ...(input.documentoOCId !== undefined ? { documentoOCId: input.documentoOCId } : {}),
                  ...(reporteSolicitudPagoIds ? { reporteSolicitudPagoIds } : {}),
                });
              },
              'procesarChecklistProveedor'
            );
          }
        ),

        procesarChecklistSubsanacion: proveedorGuard(
          async (_: unknown, args: { input: ChecklistProveedorSubsanacionInputGql }, context: GraphQLContext) => {
            return await ErrorHandler.handleError(
              async () => {
                const input = args.input;
                await assertProveedorSesionYExpediente(context, input.expedienteId, input.solicitanteId, this.batchService);

                const montoRaw = input.montoSolicitado;
                const montoParsed =
                  montoRaw != null && Number.isFinite(Number(montoRaw)) ? Number(montoRaw) : undefined;

                const reporteSolicitudPagoIds = reporteSolicitudPagoIdsForContext(
                  input.context,
                  input.reporteSolicitudPagoIds
                );

                return await this.batchService.procesarSubsanacion({
                  context: input.context,
                  expedienteId: input.expedienteId,
                  entidadId: input.entidadId,
                  aprobacionId: input.aprobacionId,
                  solicitanteId: input.solicitanteId,
                  solicitanteNombre: input.solicitanteNombre,
                  ...(montoParsed !== undefined ? { montoSolicitado: montoParsed } : {}),
                  requisitosArchivos: mapRequisitosArchivosFromGql(input.requisitosArchivos),
                  ...(reporteSolicitudPagoIds ? { reporteSolicitudPagoIds } : {}),
                });
              },
              'procesarChecklistSubsanacion'
            );
          }
        ),
      },
    };
  }
}
