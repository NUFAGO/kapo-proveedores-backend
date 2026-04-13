import {
  Aprobacion,
  CrearAprobacionInput,
  AprobacionFiltros,
  AprobacionConnection,
  ItemComentarioAprobacion,
  EstadoAprobacion,
} from '../entidades/Aprobacion';

// ============================================================================
// REPOSITORIO APROBACIÓN
// ============================================================================

export type SetRevisorFields = Partial<{
  estado: EstadoAprobacion;
  revisorId: string;
  revisorNombre: string;
  numeroCiclo: number;
}>;

export interface IAprobacionRepository {
  crear(input: CrearAprobacionInput, session?: any): Promise<Aprobacion>;
  obtenerPorId(id: string): Promise<Aprobacion | null>;
  obtenerPorEntidad(entidadTipo: string, entidadId: string, session?: any): Promise<Aprobacion | null>;
  /** Todas las aprobaciones para varias entidades del mismo tipo (p. ej. batch expediente completo). */
  listarPorEntidadTipoYEntidadIds(entidadTipo: string, entidadIds: string[], session?: any): Promise<Aprobacion[]>;
  listar(filtros: AprobacionFiltros): Promise<AprobacionConnection>;
  actualizar(
    id: string,
    patch: Partial<{
      estado: EstadoAprobacion;
      revisorId: string;
      revisorNombre: string;
      solicitanteNombre: string;
      fechaUltimaRevision: Date;
      numeroCiclo: number;
      montoSolicitado: number;
      observaciones: ItemComentarioAprobacion[];
      comentariosAprobacion: ItemComentarioAprobacion[];
      comentariosRechazo: ItemComentarioAprobacion[];
    }>,
    session?: any
  ): Promise<Aprobacion | null>;

  agregarObservacion(
    id: string,
    item: ItemComentarioAprobacion,
    setFields: SetRevisorFields
  ): Promise<Aprobacion | null>;

  agregarComentarioAprobacion(
    id: string,
    item: ItemComentarioAprobacion,
    setFields: SetRevisorFields
  ): Promise<Aprobacion | null>;

  agregarComentarioRechazo(
    id: string,
    item: ItemComentarioAprobacion,
    setFields: SetRevisorFields
  ): Promise<Aprobacion | null>;
}
