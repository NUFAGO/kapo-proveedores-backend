import { Empresa, EmpresaInput, EmpresaUpdateInput } from '../entidades/Empresa';

/**
 * Puerto del repositorio de Empresa.
 * Métodos nombrados igual que el contrato de inacons.
 */
export interface IEmpresaRepository {
  listEmpresas(): Promise<Empresa[]>;
  getEmpresa(id: string): Promise<Empresa | null>;
  addEmpresa(input: EmpresaInput): Promise<Empresa>;
  updateEmpresa(id: string, input: EmpresaUpdateInput): Promise<Empresa | null>;
  deleteEmpresa(id: string): Promise<Empresa | null>;
}
