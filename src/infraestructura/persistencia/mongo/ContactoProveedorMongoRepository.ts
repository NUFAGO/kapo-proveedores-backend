import { Types } from 'mongoose';
import { IContactoProveedorRepository } from '../../../dominio/repositorios/IContactoProveedorRepository';
import {
  ContactoProveedor,
  ContactoProveedorInput,
  ContactoProveedorUpdateInput,
} from '../../../dominio/entidades/ContactoProveedor';
import { Proveedor } from '../../../dominio/entidades/Proveedor';
import { ContactoProveedorModel } from './schemas/ContactoProveedorSchema';

export class ContactoProveedorMongoRepository implements IContactoProveedorRepository {
  private proveedorToDomain(doc: any): Proveedor | null {
    if (!doc || !doc._id) return null;
    return {
      id: doc._id.toString(),
      razon_social: doc.razon_social,
      direccion: doc.direccion,
      nombre_comercial: doc.nombre_comercial,
      ruc: doc.ruc != null ? doc.ruc.toString() : '',
      rubro: doc.rubro,
      estado: doc.estado,
      tipo: doc.tipo,
      actividad: doc.actividad,
      correo: doc.correo,
      telefono: doc.telefono,
      estado_sunat: doc.estado_sunat,
      condicion: doc.condicion,
      agente_retencion: doc.agente_retencion,
      sub_contrata: doc.sub_contrata,
      distrito: doc.distrito,
      provincia: doc.provincia,
      departamento: doc.departamento,
    };
  }

  private toDomain(doc: any): ContactoProveedor {
    return {
      id: doc._id.toString(),
      proveedor_id: this.proveedorToDomain(doc.proveedor_id),
      nombres: doc.nombres,
      apellidos: doc.apellidos,
      cargo: doc.cargo,
      telefono: doc.telefono,
    };
  }

  async listContactosProveedor(): Promise<ContactoProveedor[]> {
    const docs = await ContactoProveedorModel.find().populate('proveedor_id');
    return docs.map((d) => this.toDomain(d));
  }

  async listContactosByProveedor(proveedorId: string): Promise<ContactoProveedor[]> {
    const docs = await ContactoProveedorModel.find({
      proveedor_id: new Types.ObjectId(proveedorId),
    }).populate('proveedor_id');
    return docs.map((d) => this.toDomain(d));
  }

  async addContactoProveedor(input: ContactoProveedorInput): Promise<ContactoProveedor | null> {
    const created = await new ContactoProveedorModel({
      proveedor_id: new Types.ObjectId(input.proveedor_id),
      nombres: input.nombres,
      apellidos: input.apellidos,
      cargo: input.cargo,
      telefono: input.telefono,
    }).save();
    const populated = await ContactoProveedorModel.findById(created._id).populate('proveedor_id');
    return populated ? this.toDomain(populated) : null;
  }

  async updateContactoProveedor(
    id: string,
    input: ContactoProveedorUpdateInput
  ): Promise<ContactoProveedor | null> {
    const updateData: any = {};
    if (input.proveedor_id !== undefined) updateData.proveedor_id = new Types.ObjectId(input.proveedor_id);
    if (input.nombres !== undefined) updateData.nombres = input.nombres;
    if (input.apellidos !== undefined) updateData.apellidos = input.apellidos;
    if (input.cargo !== undefined) updateData.cargo = input.cargo;
    if (input.telefono !== undefined) updateData.telefono = input.telefono;

    const doc = await ContactoProveedorModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate('proveedor_id');
    return doc ? this.toDomain(doc) : null;
  }

  async deleteContactoProveedor(id: string): Promise<ContactoProveedor | null> {
    const doc = await ContactoProveedorModel.findByIdAndDelete(id);
    return doc ? this.toDomain(doc) : null;
  }
}
