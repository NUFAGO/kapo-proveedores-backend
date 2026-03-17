import { TipoSolicitudPago, TipoSolicitudPagoInput, TipoSolicitudPagoFiltros, TipoSolicitudPagoConnection } from '../entidades/TipoSolicitudPago';

export interface ITipoSolicitudPagoRepository {
  // CRUD operations
  crearTipoSolicitudPago(input: TipoSolicitudPagoInput): Promise<TipoSolicitudPago>;
  obtenerTipoSolicitudPago(id: string): Promise<TipoSolicitudPago | null>;
  actualizarTipoSolicitudPago(id: string, input: Partial<TipoSolicitudPagoInput>): Promise<TipoSolicitudPago>;
  eliminarTipoSolicitudPago(id: string): Promise<boolean>;
  
  // Queries
  listarTiposSolicitudPago(filtros?: TipoSolicitudPagoFiltros, limit?: number, offset?: number): Promise<TipoSolicitudPagoConnection>;
  obtenerTiposSolicitudPagoActivos(): Promise<TipoSolicitudPago[]>;
  obtenerTiposSolicitudPagoInactivos(): Promise<TipoSolicitudPago[]>;
  
  // Business logic
  existeNombre(nombre: string, excludeId?: string): Promise<boolean>;
  generarSiguienteCodigo(): Promise<string>;
}
