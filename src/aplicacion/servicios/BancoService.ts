import { IBancoRepository } from '../../dominio/repositorios/IBancoRepository';
import { Banco, BancoInput, BancoUpdateInput } from '../../dominio/entidades/Banco';

/**
 * Servicio de aplicación de Banco.
 * Recibe el repositorio por constructor (arquitectura hexagonal: depende del puerto).
 */
export class BancoService {
  constructor(private readonly repo: IBancoRepository) {}

  listBancos(): Promise<Banco[]> {
    return this.repo.listBancos();
  }

  getBancoById(id: string): Promise<Banco | null> {
    return this.repo.getBancoById(id);
  }

  addBanco(input: BancoInput): Promise<Banco> {
    if (!input.nombre?.trim()) {
      throw new Error('El nombre del banco es obligatorio');
    }
    if (!input.abreviatura?.trim()) {
      throw new Error('La abreviatura del banco es obligatoria');
    }
    return this.repo.addBanco(input);
  }

  updateBanco(id: string, input: BancoUpdateInput): Promise<Banco | null> {
    return this.repo.updateBanco(id, input);
  }

  deleteBanco(id: string): Promise<Banco | null> {
    return this.repo.deleteBanco(id);
  }
}
