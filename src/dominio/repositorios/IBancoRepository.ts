import { Banco, BancoInput, BancoUpdateInput } from '../entidades/Banco';

/**
 * Puerto del repositorio de Banco.
 * Métodos nombrados igual que el contrato de inacons para mantener consistencia.
 */
export interface IBancoRepository {
  listBancos(): Promise<Banco[]>;
  getBancoById(id: string): Promise<Banco | null>;
  addBanco(input: BancoInput): Promise<Banco>;
  updateBanco(id: string, input: BancoUpdateInput): Promise<Banco | null>;
  deleteBanco(id: string): Promise<Banco | null>;
}
