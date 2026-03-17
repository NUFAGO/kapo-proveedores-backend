// ============================================================================
// SERVICIO TIPO DOCUMENTO - Lógica de negocio para tipos de documentos
// ============================================================================

import { TipoDocumento, TipoDocumentoInput, TipoDocumentoFiltros, TipoDocumentoConnection } from '../../dominio/entidades/TipoDocumento';
import { ITipoDocumentoRepository } from '../../dominio/repositorios/ITipoDocumentoRepository';

export class TipoDocumentoService {
  constructor(private readonly tipoDocumentoRepository: ITipoDocumentoRepository) {}
  
  async obtenerTipoDocumento(id: string): Promise<TipoDocumento | null> {
    return await this.tipoDocumentoRepository.obtenerTipoDocumento(id);
  }

  async buscarTiposDocumento(filtros: TipoDocumentoFiltros): Promise<TipoDocumentoConnection> {
    return await this.tipoDocumentoRepository.buscarTiposDocumento(filtros);
  }

  async crearTipoDocumento(input: TipoDocumentoInput): Promise<TipoDocumento> {
    return await this.tipoDocumentoRepository.crearTipoDocumento(input);
  }

  async actualizarTipoDocumento(id: string, input: Partial<TipoDocumentoInput>): Promise<TipoDocumento> {
    return await this.tipoDocumentoRepository.actualizarTipoDocumento(id, input);
  }

  async eliminarTipoDocumento(id: string): Promise<boolean> {
    return await this.tipoDocumentoRepository.eliminarTipoDocumento(id);
  }

  async findInactivos(): Promise<TipoDocumento[]> {
    return await this.tipoDocumentoRepository.findInactivos();
  }

  async findActivos(): Promise<TipoDocumento[]> {
    return await this.tipoDocumentoRepository.findActivos();
  }
}
