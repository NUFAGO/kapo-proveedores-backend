import { IEmpresaRepository } from '../../dominio/repositorios/IEmpresaRepository';
import { Empresa, EmpresaInput, EmpresaUpdateInput } from '../../dominio/entidades/Empresa';

/**
 * Servicio de aplicación de Empresa.
 * NOTA: el campo `imagenes` se maneja como URL/String. La subida de archivos
 * a almacenamiento (GCS) NO está cableada en esta migración (ver FileUploadService).
 */
export class EmpresaService {
  constructor(private readonly repo: IEmpresaRepository) {}

  listEmpresas(): Promise<Empresa[]> {
    return this.repo.listEmpresas();
  }

  getEmpresa(id: string): Promise<Empresa | null> {
    return this.repo.getEmpresa(id);
  }

  addEmpresa(input: EmpresaInput): Promise<Empresa> {
    if (!input.nombre_comercial?.trim()) throw new Error('El nombre comercial es obligatorio');
    if (!input.razon_social?.trim()) throw new Error('La razón social es obligatoria');
    if (!input.estado?.trim()) throw new Error('El estado es obligatorio');
    if (!input.regimen_fiscal?.trim()) throw new Error('El régimen fiscal es obligatorio');
    if (!input.ruc?.trim()) throw new Error('El RUC es obligatorio');
    return this.repo.addEmpresa(input);
  }

  updateEmpresa(id: string, input: EmpresaUpdateInput): Promise<Empresa | null> {
    return this.repo.updateEmpresa(id, input);
  }

  deleteEmpresa(id: string): Promise<Empresa | null> {
    return this.repo.deleteEmpresa(id);
  }
}
