import { IEmpresaRepository } from '../../../dominio/repositorios/IEmpresaRepository';
import { Empresa, EmpresaInput, EmpresaUpdateInput } from '../../../dominio/entidades/Empresa';
import { EmpresaModel } from './schemas/EmpresaSchema';

export class EmpresaMongoRepository implements IEmpresaRepository {
  private toDomain(doc: any): Empresa {
    return {
      id: doc._id.toString(),
      nombre_comercial: doc.nombre_comercial,
      razon_social: doc.razon_social,
      descripcion: doc.descripcion,
      estado: doc.estado,
      regimen_fiscal: doc.regimen_fiscal,
      ruc: doc.ruc,
      imagenes: doc.imagenes,
      color: doc.color,
    };
  }

  async listEmpresas(): Promise<Empresa[]> {
    const docs = await EmpresaModel.find().sort({ razon_social: 1 });
    return docs.map((d) => this.toDomain(d));
  }

  async getEmpresa(id: string): Promise<Empresa | null> {
    const doc = await EmpresaModel.findById(id);
    return doc ? this.toDomain(doc) : null;
  }

  async addEmpresa(input: EmpresaInput): Promise<Empresa> {
    const created = await new EmpresaModel({ ...input }).save();
    return this.toDomain(created);
  }

  async updateEmpresa(id: string, input: EmpresaUpdateInput): Promise<Empresa | null> {
    const updateData: any = {};
    Object.entries(input).forEach(([k, v]) => {
      if (v !== undefined) updateData[k] = v;
    });
    const doc = await EmpresaModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });
    return doc ? this.toDomain(doc) : null;
  }

  async deleteEmpresa(id: string): Promise<Empresa | null> {
    const doc = await EmpresaModel.findByIdAndDelete(id);
    return doc ? this.toDomain(doc) : null;
  }
}
