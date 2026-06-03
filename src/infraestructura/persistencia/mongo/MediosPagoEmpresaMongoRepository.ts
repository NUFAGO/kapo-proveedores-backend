import { Types } from 'mongoose';
import { IMediosPagoEmpresaRepository } from '../../../dominio/repositorios/IMediosPagoEmpresaRepository';
import {
  MediosPagoEmpresa,
  MediosPagoEmpresaInput,
  MediosPagoEmpresaUpdateInput,
  MediosPagoEmpresaGrouped,
} from '../../../dominio/entidades/MediosPagoEmpresa';
import { Empresa } from '../../../dominio/entidades/Empresa';
import { MediosPagoEmpresaModel } from './schemas/MediosPagoEmpresaSchema';

export class MediosPagoEmpresaMongoRepository implements IMediosPagoEmpresaRepository {
  private empresaToDomain(doc: any): Empresa | null {
    if (!doc || !doc._id) return null;
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

  private toDomain(doc: any): MediosPagoEmpresa {
    return {
      id: doc._id.toString(),
      empresa_id: this.empresaToDomain(doc.empresa_id),
      entidad: doc.entidad,
      nro_cuenta: doc.nro_cuenta,
      detalles: doc.detalles,
      titular: doc.titular,
      validado: doc.validado,
    };
  }

  async listMediosPagoEmpresas(): Promise<MediosPagoEmpresaGrouped[]> {
    const docs = await MediosPagoEmpresaModel.find().populate('empresa_id');
    const grouped: Record<string, MediosPagoEmpresaGrouped> = {};

    for (const doc of docs) {
      const empresa = this.empresaToDomain((doc as any).empresa_id);
      if (!empresa) continue;
      let group = grouped[empresa.id];
      if (!group) {
        group = { empresa_id: empresa, medios_pago: [] };
        grouped[empresa.id] = group;
      }
      group.medios_pago.push(this.toDomain(doc));
    }

    return Object.values(grouped);
  }

  async listMediosPagoEmpresaByEmpresa(empresaId: string): Promise<MediosPagoEmpresa[]> {
    const docs = await MediosPagoEmpresaModel.find({
      empresa_id: new Types.ObjectId(empresaId),
    }).populate('empresa_id');
    return docs.map((d) => this.toDomain(d));
  }

  async addMediosPagoEmpresa(input: MediosPagoEmpresaInput): Promise<MediosPagoEmpresa | null> {
    const created = await new MediosPagoEmpresaModel({
      empresa_id: new Types.ObjectId(input.empresa_id),
      entidad: input.entidad,
      nro_cuenta: input.nro_cuenta,
      detalles: input.detalles,
      titular: input.titular,
    }).save();
    const populated = await MediosPagoEmpresaModel.findById(created._id).populate('empresa_id');
    return populated ? this.toDomain(populated) : null;
  }

  async updateMediosPagoEmpresa(
    id: string,
    input: MediosPagoEmpresaUpdateInput
  ): Promise<MediosPagoEmpresa | null> {
    const updateData: any = {};
    if (input.empresa_id !== undefined) updateData.empresa_id = new Types.ObjectId(input.empresa_id);
    if (input.entidad !== undefined) updateData.entidad = input.entidad;
    if (input.nro_cuenta !== undefined) updateData.nro_cuenta = input.nro_cuenta;
    if (input.detalles !== undefined) updateData.detalles = input.detalles;
    if (input.titular !== undefined) updateData.titular = input.titular;

    const doc = await MediosPagoEmpresaModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate('empresa_id');
    return doc ? this.toDomain(doc) : null;
  }

  async deleteMediosPagoEmpresa(id: string): Promise<MediosPagoEmpresa | null> {
    const doc = await MediosPagoEmpresaModel.findByIdAndDelete(id).populate('empresa_id');
    return doc ? this.toDomain(doc) : null;
  }
}
