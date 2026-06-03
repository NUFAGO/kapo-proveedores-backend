import { IBancoRepository } from '../../../dominio/repositorios/IBancoRepository';
import { Banco, BancoInput, BancoUpdateInput } from '../../../dominio/entidades/Banco';
import { BancoModel } from './schemas/BancoSchema';

export class BancoMongoRepository implements IBancoRepository {
  private toDomain(doc: any): Banco {
    return {
      id: doc._id.toString(),
      nombre: doc.nombre,
      abreviatura: doc.abreviatura,
    };
  }

  async listBancos(): Promise<Banco[]> {
    const docs = await BancoModel.find().sort({ nombre: 1 });
    return docs.map((d) => this.toDomain(d));
  }

  async getBancoById(id: string): Promise<Banco | null> {
    const doc = await BancoModel.findById(id);
    return doc ? this.toDomain(doc) : null;
  }

  async addBanco(input: BancoInput): Promise<Banco> {
    const created = await new BancoModel({
      nombre: input.nombre,
      abreviatura: input.abreviatura,
    }).save();
    return this.toDomain(created);
  }

  async updateBanco(id: string, input: BancoUpdateInput): Promise<Banco | null> {
    const updateData: any = {};
    if (input.nombre !== undefined) updateData.nombre = input.nombre;
    if (input.abreviatura !== undefined) updateData.abreviatura = input.abreviatura;

    const doc = await BancoModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
    return doc ? this.toDomain(doc) : null;
  }

  async deleteBanco(id: string): Promise<Banco | null> {
    const doc = await BancoModel.findByIdAndDelete(id);
    return doc ? this.toDomain(doc) : null;
  }
}
