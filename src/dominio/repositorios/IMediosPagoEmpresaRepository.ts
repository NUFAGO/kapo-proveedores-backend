import {
  MediosPagoEmpresa,
  MediosPagoEmpresaInput,
  MediosPagoEmpresaUpdateInput,
  MediosPagoEmpresaGrouped,
} from '../entidades/MediosPagoEmpresa';

/**
 * Puerto del repositorio de MediosPagoEmpresa.
 * Métodos nombrados igual que el contrato de inacons.
 */
export interface IMediosPagoEmpresaRepository {
  listMediosPagoEmpresas(): Promise<MediosPagoEmpresaGrouped[]>;
  listMediosPagoEmpresaByEmpresa(empresaId: string): Promise<MediosPagoEmpresa[]>;
  addMediosPagoEmpresa(input: MediosPagoEmpresaInput): Promise<MediosPagoEmpresa | null>;
  updateMediosPagoEmpresa(id: string, input: MediosPagoEmpresaUpdateInput): Promise<MediosPagoEmpresa | null>;
  deleteMediosPagoEmpresa(id: string): Promise<MediosPagoEmpresa | null>;
}
