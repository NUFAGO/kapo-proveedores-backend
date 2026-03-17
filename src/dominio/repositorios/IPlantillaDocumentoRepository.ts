import { PlantillaDocumento, PlantillaDocumentoInput, PlantillaDocumentoFiltros, PlantillaDocumentoConnection } from '../entidades/PlantillaDocumento';

export interface IPlantillaDocumentoRepository {
  // Operaciones CRUD básicas
  crearPlantillaDocumento(input: PlantillaDocumentoInput): Promise<PlantillaDocumento>;
  obtenerPlantillaDocumento(id: string): Promise<PlantillaDocumento | null>;
  actualizarPlantillaDocumento(id: string, input: Partial<PlantillaDocumentoInput>): Promise<PlantillaDocumento>;
  eliminarPlantillaDocumento(id: string): Promise<boolean>;

  // Operaciones de listado y filtrado
  listarPlantillasDocumento(filtros?: PlantillaDocumentoFiltros, limit?: number, offset?: number): Promise<PlantillaDocumentoConnection>;
  obtenerPlantillasDocumentoActivas(): Promise<PlantillaDocumento[]>;
  obtenerPlantillasDocumentoInactivas(): Promise<PlantillaDocumento[]>;

  // Operaciones de filtrado por tipo de documento
  obtenerPlantillasPorTipoDocumento(tipoDocumentoId: string): Promise<PlantillaDocumento[]>;
  obtenerPlantillaActivaPorTipoDocumento(tipoDocumentoId: string): Promise<PlantillaDocumento | null>;

  // Validaciones
  existeNombrePlantilla(tipoDocumentoId: string, nombrePlantilla: string, excludeId?: string): Promise<boolean>;
  existePlantillaActiva(tipoDocumentoId: string, excludeId?: string): Promise<boolean>;
}
