import { TipoSolicitudPago, TipoSolicitudPagoInput, TipoSolicitudPagoFiltros, TipoSolicitudPagoConnection } from '../entidades/TipoSolicitudPago';
import { ITipoSolicitudPagoRepository } from '../repositorios/ITipoSolicitudPagoRepository';

export class TipoSolicitudPagoService {
  constructor(private readonly tipoSolicitudPagoRepository: ITipoSolicitudPagoRepository) {}

  async crearTipoSolicitudPago(input: TipoSolicitudPagoInput): Promise<TipoSolicitudPago> {
    // Validaciones de negocio
    await this.validarNombreUnico(input.nombre);
    this.validarCategoria(input.categoria);

    const tipoSolicitudPago = await this.tipoSolicitudPagoRepository.crearTipoSolicitudPago(input);
    return tipoSolicitudPago;
  }

  async obtenerTipoSolicitudPago(id: string): Promise<TipoSolicitudPago> {
    const tipoSolicitudPago = await this.tipoSolicitudPagoRepository.obtenerTipoSolicitudPago(id);
    if (!tipoSolicitudPago) {
      throw new Error('Tipo de solicitud de pago no encontrado');
    }
    return tipoSolicitudPago;
  }

  async actualizarTipoSolicitudPago(id: string, input: Partial<TipoSolicitudPagoInput>): Promise<TipoSolicitudPago> {
    // Verificar que existe
    const tipoSolicitudPagoExistente = await this.tipoSolicitudPagoRepository.obtenerTipoSolicitudPago(id);
    if (!tipoSolicitudPagoExistente) {
      throw new Error('Tipo de solicitud de pago no encontrado');
    }

    // Validaciones de negocio
    if (input.nombre && input.nombre !== tipoSolicitudPagoExistente.nombre) {
      await this.validarNombreUnico(input.nombre, id);
    }

    if (input.categoria) {
      this.validarCategoria(input.categoria);
    }

    const tipoSolicitudPago = await this.tipoSolicitudPagoRepository.actualizarTipoSolicitudPago(id, input);
    return tipoSolicitudPago;
  }

  async eliminarTipoSolicitudPago(id: string): Promise<boolean> {
    // Verificar que existe
    const tipoSolicitudPagoExistente = await this.tipoSolicitudPagoRepository.obtenerTipoSolicitudPago(id);
    if (!tipoSolicitudPagoExistente) {
      throw new Error('Tipo de solicitud de pago no encontrado');
    }

    // TODO: Validar que no esté siendo usado en expedientes
    // await this.validarUsoEnExpedientes(id);

    return await this.tipoSolicitudPagoRepository.eliminarTipoSolicitudPago(id);
  }

  async listarTiposSolicitudPago(filtros?: TipoSolicitudPagoFiltros, limit?: number, offset?: number): Promise<TipoSolicitudPagoConnection> {
    return await this.tipoSolicitudPagoRepository.listarTiposSolicitudPago(filtros, limit, offset);
  }

  async obtenerTiposSolicitudPagoActivos(): Promise<TipoSolicitudPago[]> {
    return await this.tipoSolicitudPagoRepository.obtenerTiposSolicitudPagoActivos();
  }

  async obtenerTiposSolicitudPagoInactivos(): Promise<TipoSolicitudPago[]> {
    return await this.tipoSolicitudPagoRepository.obtenerTiposSolicitudPagoInactivos();
  }

  private async validarNombreUnico(nombre: string, excludeId?: string): Promise<void> {
    const existe = await this.tipoSolicitudPagoRepository.existeNombre(nombre, excludeId);
    if (existe) {
      throw new Error('Ya existe un tipo de solicitud de pago con ese nombre');
    }
  }

  private validarCategoria(categoria: string): void {
    const categoriasValidas = ['anticipado', 'avance', 'cierre', 'entrega', 'gasto', 'ajuste'];
    if (!categoriasValidas.includes(categoria)) {
      throw new Error('Categoría no válida');
    }
  }

  // private async validarUsoEnExpedientes(id: string): Promise<void> {
  //   // TODO: Implementar validación de uso en expedientes
  //   // const enUso = await this.expedienteRepository.existeTipoSolicitudPago(id);
  //   // if (enUso) {
  //   //   throw new Error('No se puede eliminar el tipo de solicitud de pago porque está siendo usado en expedientes');
  //   }
  // }
}
