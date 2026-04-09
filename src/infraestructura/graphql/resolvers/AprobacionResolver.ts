import { IResolvers } from '@graphql-tools/utils';
import { AprobacionService, RevisorContext } from '../../../dominio/servicios/AprobacionService';
import {
  AprobacionChecklistRevisionService,
  type AprobacionChecklistRevisionDetalle,
} from '../../../dominio/servicios/AprobacionChecklistRevisionService';
import { AprobacionFinalizarRevisionChecklistService } from '../../../dominio/servicios/AprobacionFinalizarRevisionChecklistService';
import type { DocumentoSubido } from '../../../dominio/entidades/DocumentoSubido';
import type { PlantillaChecklist } from '../../../dominio/entidades/PlantillaChecklist';
import {
  Aprobacion,
  AgregarComentarioInput,
  AprobacionFiltros,
  EntidadTipoAprobacion,
  EstadoAprobacion,
  ItemComentarioAprobacion,
  RevisionRequisitoComentario,
} from '../../../dominio/entidades/Aprobacion';
import { ErrorHandler } from './ErrorHandler';
import { adminGuard, authGuard, type GraphQLContext } from '../../auth/GraphQLGuards';
import type { IExpedientePagoRepository } from '../../../dominio/repositorios/IExpedientePagoRepository';
import type {
  FinalizarRevisionChecklistInput,
  RevisionDocumentoChecklistInput,
} from '../../../dominio/servicios/AprobacionFinalizarRevisionChecklistService';

function toIso(d: Date | undefined | null): string | null {
  if (!d) return null;
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString();
}

function mapRevisionGQL(r: RevisionRequisitoComentario) {
  return {
    requisitoDocumentoId: r.requisitoDocumentoId,
    resultado: r.resultado,
  };
}

function mapComentarioGQL(c: ItemComentarioAprobacion) {
  return {
    mensaje: c.mensaje,
    usuarioId: c.usuarioId,
    usuarioNombre: c.usuarioNombre ?? null,
    fecha: toIso(c.fecha) ?? '',
    revisionesRequisito:
      c.revisionesRequisito !== undefined && c.revisionesRequisito.length > 0
        ? c.revisionesRequisito.map(mapRevisionGQL)
        : null,
  };
}

function toIsoDate(d: Date | string | undefined | null): string | null {
  if (d == null) return null;
  if (d instanceof Date) return d.toISOString();
  if (typeof d === 'string') return d;
  return new Date(d as unknown as string).toISOString();
}

function mapDocumentoSubidoRevisionGQL(d: DocumentoSubido) {
  return {
    id: d.id,
    documentoOCId: d.documentoOCId ?? null,
    solicitudPagoId: d.solicitudPagoId ?? null,
    requisitoDocumentoId: d.requisitoDocumentoId ?? null,
    usuario: null,
    archivos: d.archivos.map((a) => ({
      url: a.url,
      nombreOriginal: a.nombreOriginal,
      mimeType: a.mimeType,
      tamanioBytes: a.tamanioBytes,
      fechaSubida: toIsoDate(a.fechaSubida as unknown as Date) ?? '',
    })),
    version: d.version,
    estado: d.estado,
    fechaSubida: toIsoDate(d.fechaSubida as unknown as Date) ?? '',
    fechaRevision: toIsoDate(d.fechaRevision as unknown as Date | undefined),
    comentariosRevision: d.comentariosRevision ?? null,
  };
}

/** Normaliza checklist/requisitos del dominio al shape esperado por GraphQL. */
function mapChecklistRevisionGQL(plantilla: PlantillaChecklist) {
  const requisitos = (plantilla.requisitos ?? [])
    .filter((r) => r.activo !== false)
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    .map((r) => {
      const pd = r.plantillaDocumento;
      return {
        id: r.id,
        checklistId: r.checklistId,
        tipoRequisito: r.tipoRequisito,
        plantillaDocumentoId: r.plantillaDocumentoId ?? null,
        formularioId: r.formularioId ?? null,
        obligatorio: r.obligatorio,
        orden: r.orden,
        activo: r.activo,
        plantillaDocumento: pd
          ? {
              id: pd.id,
              codigo: (pd as { codigo?: string }).codigo ?? '',
              tipoDocumentoId: (pd as { tipoDocumentoId?: string }).tipoDocumentoId ?? '',
              nombrePlantilla: pd.nombrePlantilla,
              plantillaUrl: pd.plantillaUrl,
              formatosPermitidos: (pd as { formatosPermitidos?: string }).formatosPermitidos ?? null,
              activo: pd.activo,
              fechaCreacion: (pd as { fechaCreacion?: string }).fechaCreacion ?? new Date().toISOString(),
              fechaActualizacion: (pd as { fechaActualizacion?: string }).fechaActualizacion ?? null,
              tipoDocumento: null,
            }
          : null,
        formulario: r.formulario
          ? {
              id: r.formulario.id,
              nombre: r.formulario.nombre,
              version: r.formulario.version,
              activo: r.formulario.activo,
              descripcion: null,
              baseId: '',
              campos: {},
            }
          : null,
      };
    });

  return {
    id: plantilla.id,
    codigo: plantilla.codigo,
    nombre: plantilla.nombre,
    descripcion: plantilla.descripcion ?? null,
    categoriaChecklistId: plantilla.categoriaChecklistId,
    categoria: plantilla.categoria
      ? {
          id: plantilla.categoria.id,
          nombre: plantilla.categoria.nombre,
          tipoUso: plantilla.categoria.tipoUso,
          descripcion: plantilla.categoria.descripcion ?? null,
          permiteMultiple: null,
          permiteVincularReportes: null,
          estado: 'activo',
          fechaCreacion: plantilla.categoria.fechaCreacion,
          fechaActualizacion: plantilla.categoria.fechaActualizacion ?? null,
        }
      : null,
    activo: plantilla.activo,
    fechaCreacion: plantilla.fechaCreacion,
    fechaActualizacion: plantilla.fechaActualizacion ?? null,
    requisitos,
  };
}

function mapDetalleChecklistRevisionGQL(detalle: AprobacionChecklistRevisionDetalle) {
  const base: Record<string, unknown> = {
    aprobacionId: detalle.aprobacionId,
    estado: detalle.estado,
    entidadTipo: detalle.entidadTipo,
    entidadId: detalle.entidadId,
    expedienteId: detalle.expedienteId,
    checklist: mapChecklistRevisionGQL(detalle.checklist),
    documentosSubidos: detalle.documentosSubidos.map(mapDocumentoSubidoRevisionGQL),
  };
  if (detalle.montoSolicitado !== undefined) {
    base['montoSolicitado'] = detalle.montoSolicitado;
  }
  if (detalle.tipoPagoOCId !== undefined) {
    base['tipoPagoOCId'] = detalle.tipoPagoOCId;
  }
  return base;
}

function mapAprobacionGQL(a: Aprobacion) {
  return {
    id: a.id,
    entidadTipo: a.entidadTipo,
    entidadId: a.entidadId,
    expedienteId: a.expedienteId,
    montoSolicitado: a.montoSolicitado ?? null,
    tipoPagoOCId: a.tipoPagoOCId ?? null,
    estado: a.estado,
    solicitanteId: a.solicitanteId ?? null,
    solicitanteNombre: a.solicitanteNombre ?? null,
    revisorId: a.revisorId ?? null,
    revisorNombre: a.revisorNombre ?? null,
    fechaEnvio: toIso(a.fechaEnvio) ?? '',
    fechaUltimaRevision: toIso(a.fechaUltimaRevision),
    numeroCiclo: a.numeroCiclo,
    observaciones: a.observaciones.map(mapComentarioGQL),
    comentariosAprobacion: a.comentariosAprobacion.map(mapComentarioGQL),
    comentariosRechazo: a.comentariosRechazo.map(mapComentarioGQL),
  };
}

type ComentarioInputGQL = {
  mensaje: string;
  usuarioId: string;
  usuarioNombre?: string | null;
  revisionesRequisito?: Array<{ requisitoDocumentoId: string; resultado: string }> | null;
};

function toAgregarInput(input: ComentarioInputGQL): AgregarComentarioInput {
  const base: AgregarComentarioInput = {
    mensaje: input.mensaje,
    usuarioId: input.usuarioId,
  };
  const nombre = input.usuarioNombre;
  if (nombre !== undefined && nombre !== null && nombre !== '') {
    base.usuarioNombre = nombre;
  }
  if (input.revisionesRequisito !== undefined && input.revisionesRequisito !== null) {
    const revs = input.revisionesRequisito.map((r) => ({
      requisitoDocumentoId: r.requisitoDocumentoId,
      resultado: r.resultado as 'OBSERVADO' | 'APROBADO',
    }));
    if (revs.length > 0) {
      base.revisionesRequisito = revs;
    }
  }
  return base;
}

function toRevisorContext(revisorId: string, revisorNombre?: string | null): RevisorContext {
  const ctx: RevisorContext = { revisorId };
  if (revisorNombre !== undefined && revisorNombre !== null && revisorNombre !== '') {
    ctx.revisorNombre = revisorNombre;
  }
  return ctx;
}

function isEntidadTipoAprobacion(v: unknown): v is EntidadTipoAprobacion {
  return v === 'solicitud_pago' || v === 'documento_oc';
}

function isEstadoAprobacion(v: unknown): v is EstadoAprobacion {
  return (
    v === 'EN_REVISION' || v === 'OBSERVADO' || v === 'APROBADO' || v === 'RECHAZADO'
  );
}

/** Coerción segura desde el objeto `filtros` GraphQL (`Record`) hacia el dominio (exactOptionalPropertyTypes). */
function toAprobacionFiltros(raw: Record<string, unknown> | undefined | null): AprobacionFiltros {
  if (raw == null) return {};
  const out: AprobacionFiltros = {};

  const estado = raw['estado'];
  if (isEstadoAprobacion(estado)) out.estado = estado;

  const expedienteId = raw['expedienteId'];
  if (typeof expedienteId === 'string' && expedienteId !== '') {
    out.expedienteId = expedienteId;
  }

  const entidadTipo = raw['entidadTipo'];
  if (isEntidadTipoAprobacion(entidadTipo)) out.entidadTipo = entidadTipo;

  const page = raw['page'];
  if (typeof page === 'number' && Number.isFinite(page)) out.page = page;

  const limit = raw['limit'];
  if (typeof limit === 'number' && Number.isFinite(limit)) out.limit = limit;

  const offset = raw['offset'];
  if (typeof offset === 'number' && Number.isFinite(offset)) out.offset = offset;

  return out;
}

function toKanbanAprobacionesFiltros(
  raw: Record<string, unknown> | undefined | null
): {
  expedienteId?: string;
  entidadTipo?: EntidadTipoAprobacion;
  limit?: number;
} {
  if (raw == null) return {};
  const out: {
    expedienteId?: string;
    entidadTipo?: EntidadTipoAprobacion;
    limit?: number;
  } = {};

  const expedienteId = raw['expedienteId'];
  if (typeof expedienteId === 'string' && expedienteId !== '') {
    out.expedienteId = expedienteId;
  }

  const entidadTipo = raw['entidadTipo'];
  if (isEntidadTipoAprobacion(entidadTipo)) out.entidadTipo = entidadTipo;

  const limit = raw['limit'];
  if (typeof limit === 'number' && Number.isFinite(limit)) out.limit = limit;

  return out;
}

export class AprobacionResolver {
  constructor(
    private readonly servicio: AprobacionService,
    private readonly checklistRevision: AprobacionChecklistRevisionService,
    private readonly finalizarRevisionChecklist: AprobacionFinalizarRevisionChecklistService,
    private readonly expedienteRepo: IExpedientePagoRepository
  ) {}

  /** Admin: libre. Proveedor: solo si el expediente de la aprobación es suyo. */
  private async assertAdminOProveedorExpediente(
    context: GraphQLContext,
    expedienteId: string
  ): Promise<void> {
    const user = context.user as { tipo_usuario?: string; proveedor_id?: string | null } | undefined;
    if (!user) {
      throw new Error('AUTENTICACION_REQUERIDA: Token de autenticación requerido');
    }
    if (user.tipo_usuario === 'admin') return;
    if (user.tipo_usuario !== 'proveedor') {
      throw new Error('AUTORIZACION_DENEGADA: Tipo de usuario no autorizado para esta operación');
    }
    const ex = await this.expedienteRepo.findById(expedienteId);
    if (!ex) {
      throw new Error('Expediente no encontrado');
    }
    const pid = user.proveedor_id ?? null;
    if (pid == null || pid === '' || ex.proveedorId !== pid) {
      throw new Error('AUTORIZACION_DENEGADA: No tienes acceso a este expediente');
    }
  }

  getResolvers(): IResolvers {
    return {
      Query: {
        aprobacion: adminGuard(async (_: unknown, { id }: { id: string }) => {
          return await ErrorHandler.handleError(async () => {
            const a = await this.servicio.obtenerPorId(id);
            return mapAprobacionGQL(a);
          }, 'aprobacion');
        }),

        aprobacionPorEntidad: authGuard(
          async (_: unknown, args: { entidadTipo: string; entidadId: string }, context: GraphQLContext) => {
            return await ErrorHandler.handleError(async () => {
              const a = await this.servicio.obtenerPorEntidad(args.entidadTipo, args.entidadId);
              if (!a) return null;
              await this.assertAdminOProveedorExpediente(context, a.expedienteId);
              return mapAprobacionGQL(a);
            }, 'aprobacionPorEntidad');
          },
          { required: true, allowedTypes: ['admin', 'proveedor'] }
        ),

        aprobaciones: adminGuard(async (_: unknown, { filtros }: { filtros?: Record<string, unknown> }) => {
          return await ErrorHandler.handleError(async () => {
            const conn = await this.servicio.listar(toAprobacionFiltros(filtros));
            return {
              ...conn,
              items: conn.items.map(mapAprobacionGQL),
            };
          }, 'aprobaciones');
        }),

        getKanbanDataAprobaciones: adminGuard(
          async (_: unknown, { filtros }: { filtros?: Record<string, unknown> }) => {
            return await ErrorHandler.handleError(async () => {
              const data = await this.servicio.getKanbanDataAprobaciones(
                toKanbanAprobacionesFiltros(filtros)
              );
              const col = (estado: keyof typeof data) => ({
                aprobaciones: data[estado].items.map(mapAprobacionGQL),
                total: data[estado].total,
                hasNextPage: data[estado].hasNextPage,
              });
              return {
                EN_REVISION: col('EN_REVISION'),
                OBSERVADO: col('OBSERVADO'),
                APROBADO: col('APROBADO'),
                RECHAZADO: col('RECHAZADO'),
              };
            }, 'getKanbanDataAprobaciones');
          }
        ),

        detalleChecklistRevisionAprobacion: authGuard(
          async (_: unknown, { aprobacionId }: { aprobacionId: string }, context: GraphQLContext) => {
            return await ErrorHandler.handleError(async () => {
              const aprob = await this.servicio.obtenerPorId(aprobacionId);
              await this.assertAdminOProveedorExpediente(context, aprob.expedienteId);
              const detalle = await this.checklistRevision.obtenerDetallePorAprobacionId(aprobacionId);
              return mapDetalleChecklistRevisionGQL(detalle);
            }, 'detalleChecklistRevisionAprobacion');
          },
          { required: true, allowedTypes: ['admin', 'proveedor'] }
        ),

        aprobacionRevisionPorEntidad: authGuard(
          async (
            _: unknown,
            args: { entidadTipo: string; entidadId: string },
            context: GraphQLContext
          ) => {
            return await ErrorHandler.handleError(async () => {
              const a = await this.servicio.obtenerPorEntidad(args.entidadTipo, args.entidadId);
              if (!a) {
                return { aprobacion: null, documentosSubidos: [] };
              }
              await this.assertAdminOProveedorExpediente(context, a.expedienteId);
              const documentosSubidos = await this.checklistRevision.obtenerDocumentosSubidosPorAprobacionId(
                a.id
              );
              return {
                aprobacion: mapAprobacionGQL(a),
                documentosSubidos: documentosSubidos.map(mapDocumentoSubidoRevisionGQL),
              };
            }, 'aprobacionRevisionPorEntidad');
          },
          { required: true, allowedTypes: ['admin', 'proveedor'] }
        ),
      },

      Mutation: {
        crearAprobacion: adminGuard(async (_: unknown, { input }: { input: any }) => {
          return await ErrorHandler.handleError(async () => {
            const a = await this.servicio.crear(input);
            return mapAprobacionGQL(a);
          }, 'crearAprobacion');
        }),

        registrarObservacionAprobacion: adminGuard(
          async (
            _: unknown,
            args: {
              id: string;
              input: ComentarioInputGQL;
              revisorId: string;
              revisorNombre?: string | null;
            }
          ) => {
            return await ErrorHandler.handleError(async () => {
              const a = await this.servicio.registrarObservacion(
                args.id,
                toAgregarInput(args.input),
                toRevisorContext(args.revisorId, args.revisorNombre)
              );
              return mapAprobacionGQL(a);
            }, 'registrarObservacionAprobacion');
          }
        ),

        registrarAprobacionFinal: adminGuard(
          async (
            _: unknown,
            args: {
              id: string;
              input: ComentarioInputGQL;
              revisorId: string;
              revisorNombre?: string | null;
            }
          ) => {
            return await ErrorHandler.handleError(async () => {
              const a = await this.servicio.registrarAprobacion(
                args.id,
                toAgregarInput(args.input),
                toRevisorContext(args.revisorId, args.revisorNombre)
              );
              return mapAprobacionGQL(a);
            }, 'registrarAprobacionFinal');
          }
        ),

        registrarRechazoAprobacion: adminGuard(
          async (
            _: unknown,
            args: {
              id: string;
              input: ComentarioInputGQL;
              revisorId: string;
              revisorNombre?: string | null;
            }
          ) => {
            return await ErrorHandler.handleError(async () => {
              const a = await this.servicio.registrarRechazo(
                args.id,
                toAgregarInput(args.input),
                toRevisorContext(args.revisorId, args.revisorNombre)
              );
              return mapAprobacionGQL(a);
            }, 'registrarRechazoAprobacion');
          }
        ),

        volverAprobacionTrasCorreccion: adminGuard(async (_: unknown, { id }: { id: string }) => {
          return await ErrorHandler.handleError(async () => {
            const a = await this.servicio.volverTrasCorreccion(id);
            return mapAprobacionGQL(a);
          }, 'volverAprobacionTrasCorreccion');
        }),

        finalizarRevisionChecklistAprobacion: adminGuard(
          async (
            _: unknown,
            args: {
              input: {
                aprobacionId: string;
                rechazar: boolean;
                comentarioRechazo?: string | null;
                comentarioGeneral?: string | null;
                revisionesDocumentos: Array<{
                  documentoSubidoId: string;
                  resultado: string;
                  comentario?: string | null;
                }>;
                revisorId: string;
                revisorNombre?: string | null;
              };
            }
          ) => {
            return await ErrorHandler.handleError(async () => {
              const raw = args.input;
              const ejecutarInput: FinalizarRevisionChecklistInput = {
                aprobacionId: raw.aprobacionId,
                rechazar: Boolean(raw.rechazar),
                revisionesDocumentos: (raw.revisionesDocumentos ?? []).map((r): RevisionDocumentoChecklistInput => {
                  const com = typeof r.comentario === 'string' ? r.comentario.trim() : '';
                  const base: RevisionDocumentoChecklistInput = {
                    documentoSubidoId: r.documentoSubidoId,
                    resultado: r.resultado === 'OBSERVADO' ? 'OBSERVADO' : 'APROBADO',
                  };
                  if (com !== '') {
                    base.comentario = com;
                  }
                  return base;
                }),
                revisor: toRevisorContext(raw.revisorId, raw.revisorNombre),
              };
              const rechazo = typeof raw.comentarioRechazo === 'string' ? raw.comentarioRechazo.trim() : '';
              if (rechazo !== '') {
                ejecutarInput.comentarioRechazo = rechazo;
              }
              const general = typeof raw.comentarioGeneral === 'string' ? raw.comentarioGeneral.trim() : '';
              if (general !== '') {
                ejecutarInput.comentarioGeneral = general;
              }
              await this.finalizarRevisionChecklist.ejecutar(ejecutarInput);
              const a = await this.servicio.obtenerPorId(raw.aprobacionId);
              return mapAprobacionGQL(a);
            }, 'finalizarRevisionChecklistAprobacion');
          }
        ),
      },
    };
  }
}
