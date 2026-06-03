import { ArchivoSustentoProveedor, ArchivoSustentoProveedorInput } from '../entidades/ArchivoSustentoProveedor';

export interface IArchivoSustentoProveedorRepository {
  getFilesByReferencia(referenciaId: string, tipo: string): Promise<ArchivoSustentoProveedor[]>;
  registerFromUrl(input: ArchivoSustentoProveedorInput): Promise<ArchivoSustentoProveedor>;
  delete(id: string): Promise<boolean>;
}
