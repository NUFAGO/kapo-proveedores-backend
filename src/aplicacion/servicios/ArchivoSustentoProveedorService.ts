import { IArchivoSustentoProveedorRepository } from '../../dominio/repositorios/IArchivoSustentoProveedorRepository';
import { ArchivoSustentoProveedor, ArchivoSustentoProveedorInput } from '../../dominio/entidades/ArchivoSustentoProveedor';

export class ArchivoSustentoProveedorService {
  constructor(private readonly repo: IArchivoSustentoProveedorRepository) {}

  getFiles(referenciaId: string, tipo: string): Promise<ArchivoSustentoProveedor[]> {
    return this.repo.getFilesByReferencia(referenciaId, tipo);
  }

  /** Registra el vínculo con una URL ya subida a GCS (no sube binarios). */
  registrar(input: ArchivoSustentoProveedorInput): Promise<ArchivoSustentoProveedor> {
    if (!input.url?.trim()) throw new Error('La URL del archivo es obligatoria');
    if (!input.referencia_id) throw new Error('referencia_id es obligatorio');
    if (!input.tipo?.trim()) throw new Error('El tipo es obligatorio');
    return this.repo.registerFromUrl(input);
  }

  eliminar(id: string): Promise<boolean> {
    return this.repo.delete(id);
  }
}
