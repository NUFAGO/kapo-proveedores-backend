import { TipoDocumento, TipoDocumentoInput, TipoDocumentoFiltros, TipoDocumentoConnection } from '../entidades/TipoDocumento';

export interface ITipoDocumentoRepository {
  obtenerTipoDocumento(id: string): Promise<TipoDocumento | null>;
  buscarTiposDocumento(filtros: TipoDocumentoFiltros): Promise<TipoDocumentoConnection>;
  crearTipoDocumento(input: TipoDocumentoInput): Promise<TipoDocumento>;
  actualizarTipoDocumento(id: string, input: Partial<TipoDocumentoInput>): Promise<TipoDocumento>;
  eliminarTipoDocumento(id: string): Promise<boolean>;
  findInactivos(): Promise<TipoDocumento[]>;
  findActivos(): Promise<TipoDocumento[]>;
}
