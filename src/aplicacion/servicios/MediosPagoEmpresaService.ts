import { IMediosPagoEmpresaRepository } from '../../dominio/repositorios/IMediosPagoEmpresaRepository';
import {
  MediosPagoEmpresa,
  MediosPagoEmpresaInput,
  MediosPagoEmpresaUpdateInput,
  MediosPagoEmpresaGrouped,
} from '../../dominio/entidades/MediosPagoEmpresa';

export class MediosPagoEmpresaService {
  constructor(private readonly repo: IMediosPagoEmpresaRepository) {}

  listMediosPagoEmpresas(): Promise<MediosPagoEmpresaGrouped[]> {
    return this.repo.listMediosPagoEmpresas();
  }

  listMediosPagoEmpresaByEmpresa(empresaId: string): Promise<MediosPagoEmpresa[]> {
    return this.repo.listMediosPagoEmpresaByEmpresa(empresaId);
  }

  addMediosPagoEmpresa(input: MediosPagoEmpresaInput): Promise<MediosPagoEmpresa | null> {
    if (!input.empresa_id) throw new Error('empresa_id es obligatorio');
    if (!input.entidad?.trim()) throw new Error('La entidad es obligatoria');
    if (!input.nro_cuenta?.trim()) throw new Error('El número de cuenta es obligatorio');
    if (!input.titular?.trim()) throw new Error('El titular es obligatorio');
    return this.repo.addMediosPagoEmpresa(input);
  }

  updateMediosPagoEmpresa(
    id: string,
    input: MediosPagoEmpresaUpdateInput
  ): Promise<MediosPagoEmpresa | null> {
    return this.repo.updateMediosPagoEmpresa(id, input);
  }

  deleteMediosPagoEmpresa(id: string): Promise<MediosPagoEmpresa | null> {
    return this.repo.deleteMediosPagoEmpresa(id);
  }
}
