import { PlantillaDocumento, PlantillaDocumentoInput, PlantillaDocumentoFiltros, PlantillaDocumentoConnection } from '../entidades/PlantillaDocumento';
import { IPlantillaDocumentoRepository } from '../repositorios/IPlantillaDocumentoRepository';

export class PlantillaDocumentoService {
  constructor(private readonly plantillaDocumentoRepository: IPlantillaDocumentoRepository) {}

  async crearPlantillaDocumento(input: PlantillaDocumentoInput): Promise<PlantillaDocumento> {
    // Validaciones de negocio
    await this.validarNombreUnico(input.tipoDocumentoId, input.nombrePlantilla);

    const plantillaDocumento = await this.plantillaDocumentoRepository.crearPlantillaDocumento(input);
    return plantillaDocumento;
  }

  async obtenerPlantillaDocumento(id: string): Promise<PlantillaDocumento> {
    const plantillaDocumento = await this.plantillaDocumentoRepository.obtenerPlantillaDocumento(id);
    if (!plantillaDocumento) {
      throw new Error('Plantilla de documento no encontrada');
    }
    return plantillaDocumento;
  }

  async actualizarPlantillaDocumento(id: string, input: Partial<PlantillaDocumentoInput>): Promise<PlantillaDocumento> {
    // Verificar que existe
    const plantillaExistente = await this.plantillaDocumentoRepository.obtenerPlantillaDocumento(id);
    if (!plantillaExistente) {
      throw new Error('Plantilla de documento no encontrada');
    }

    // Validaciones de negocio
    if (input.nombrePlantilla && input.nombrePlantilla !== plantillaExistente.nombrePlantilla) {
      await this.validarNombreUnico(plantillaExistente.tipoDocumentoId, input.nombrePlantilla, id);
    }

    const plantillaDocumento = await this.plantillaDocumentoRepository.actualizarPlantillaDocumento(id, input);
    return plantillaDocumento;
  }

  async eliminarPlantillaDocumento(id: string): Promise<boolean> {
    // Verificar que existe
    const plantillaExistente = await this.plantillaDocumentoRepository.obtenerPlantillaDocumento(id);
    if (!plantillaExistente) {
      throw new Error('Plantilla de documento no encontrada');
    }

    // TODO: Validar que no esté siendo usada en DocumentoOC
    // await this.validarUsoEnDocumentosOC(id);

    return await this.plantillaDocumentoRepository.eliminarPlantillaDocumento(id);
  }

  async listarPlantillasDocumento(filtros?: PlantillaDocumentoFiltros, limit?: number, offset?: number): Promise<PlantillaDocumentoConnection> {
    return await this.plantillaDocumentoRepository.listarPlantillasDocumento(filtros, limit, offset);
  }

  async obtenerPlantillasDocumentoActivas(): Promise<PlantillaDocumento[]> {
    return await this.plantillaDocumentoRepository.obtenerPlantillasDocumentoActivas();
  }

  async obtenerPlantillasDocumentoInactivas(): Promise<PlantillaDocumento[]> {
    return await this.plantillaDocumentoRepository.obtenerPlantillasDocumentoInactivas();
  }

  async obtenerPlantillasPorTipoDocumento(tipoDocumentoId: string): Promise<PlantillaDocumento[]> {
    return await this.plantillaDocumentoRepository.obtenerPlantillasPorTipoDocumento(tipoDocumentoId);
  }

  async obtenerPlantillaActivaPorTipoDocumento(tipoDocumentoId: string): Promise<PlantillaDocumento | null> {
    return await this.plantillaDocumentoRepository.obtenerPlantillaActivaPorTipoDocumento(tipoDocumentoId);
  }

  private async validarNombreUnico(tipoDocumentoId: string, nombrePlantilla: string, excludeId?: string): Promise<void> {
    const existe = await this.plantillaDocumentoRepository.existeNombrePlantilla(tipoDocumentoId, nombrePlantilla, excludeId);
    if (existe) {
      throw new Error('Ya existe una plantilla con ese nombre para el mismo tipo de documento');
    }
  }

  // private async validarUsoEnDocumentosOC(id: string): Promise<void> {
  //   // TODO: Implementar validación de uso en DocumentoOC
  //   // const enUso = await this.documentoOCRepository.existePlantillaDocumento(id);
  //   // if (enUso) {
  //   //   throw new Error('No se puede eliminar la plantilla porque está siendo usada en documentos de expedientes');
  //   // }
  // }
}
