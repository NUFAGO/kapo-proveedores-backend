import { Types } from 'mongoose';
import { IProveedorRepository } from '../../../dominio/repositorios/IProveedorRepository';
import {
  Proveedor,
  ProveedorInput,
  ProveedorUpdateInput,
  ProveedorPaginationInput,
  ProveedorPaginatedResponse,
} from '../../../dominio/entidades/Proveedor';
import { ProveedorModel } from './schemas/ProveedorSchema';

/**
 * Repositorio Mongo de Proveedor.
 * Replica la lógica de inacons (agregación con lookups a medios_pago_proveedor,
 * banco y contacto_proveedor) PERO sin estadisticasCotizaciones.
 */
export class ProveedorMongoRepository implements IProveedorRepository {
  /** Etapas de $lookup + $project comunes (medios de pago, banco, contactos). */
  private buildRelacionesPipeline(): any[] {
    return [
      {
        $lookup: {
          from: 'medios_pago_proveedor',
          localField: '_id',
          foreignField: 'proveedor_id',
          as: 'medios_pago',
        },
      },
      {
        $lookup: {
          from: 'banco',
          localField: 'medios_pago.entidad',
          foreignField: '_id',
          as: 'bancos',
        },
      },
      {
        $lookup: {
          from: 'contacto_proveedor',
          localField: '_id',
          foreignField: 'proveedor_id',
          as: 'contactos',
        },
      },
      {
        $project: {
          id: '$_id',
          razon_social: 1,
          direccion: 1,
          nombre_comercial: 1,
          ruc: { $toString: '$ruc' },
          rubro: 1,
          estado: 1,
          tipo: 1,
          actividad: 1,
          correo: 1,
          telefono: 1,
          estado_sunat: { $ifNull: ['$estado_sunat', '-'] },
          condicion: { $ifNull: ['$condicion', '-'] },
          agente_retencion: { $ifNull: ['$agente_retencion', false] },
          sub_contrata: { $ifNull: ['$sub_contrata', false] },
          distrito: { $ifNull: ['$distrito', '-'] },
          provincia: { $ifNull: ['$provincia', '-'] },
          departamento: { $ifNull: ['$departamento', '-'] },
          mediosPago: {
            $map: {
              input: '$medios_pago',
              as: 'medio',
              in: {
                id: '$$medio._id',
                entidad: {
                  $let: {
                    vars: {
                      banco: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: '$bancos',
                              as: 'banco',
                              cond: { $eq: ['$$banco._id', '$$medio.entidad'] },
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: {
                      $cond: {
                        if: { $eq: ['$$banco', null] },
                        then: { id: '$$medio.entidad', nombre: 'Banco no encontrado', abreviatura: 'N/A' },
                        else: { id: '$$banco._id', nombre: '$$banco.nombre', abreviatura: '$$banco.abreviatura' },
                      },
                    },
                  },
                },
                nro_cuenta: '$$medio.nro_cuenta',
                detalles: '$$medio.detalles',
                titular: '$$medio.titular',
                validado: '$$medio.validado',
                mostrar: '$$medio.mostrar',
              },
            },
          },
          contactos: {
            $map: {
              input: '$contactos',
              as: 'contacto',
              in: {
                id: '$$contacto._id',
                nombres: '$$contacto.nombres',
                apellidos: '$$contacto.apellidos',
                cargo: '$$contacto.cargo',
                telefono: '$$contacto.telefono',
              },
            },
          },
        },
      },
    ];
  }

  private normalizeId(doc: any): Proveedor {
    return { ...doc, id: doc.id ? doc.id.toString() : doc._id?.toString() } as Proveedor;
  }

  async listProveedor(): Promise<Proveedor[]> {
    const docs = await ProveedorModel.aggregate(this.buildRelacionesPipeline());
    return docs.map((d) => this.normalizeId(d));
  }

  async getProveedorById(id: string): Promise<Proveedor | null> {
    const docs = await ProveedorModel.aggregate([
      { $match: { _id: new Types.ObjectId(id) } },
      ...this.buildRelacionesPipeline(),
    ]);
    return docs[0] ? this.normalizeId(docs[0]) : null;
  }

  async getProveedoresByIds(ids: string[]): Promise<Proveedor[]> {
    const objectIds = (ids ?? [])
      .map((id) => String(id ?? '').trim())
      .filter((id) => id && Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
    if (objectIds.length === 0) return [];

    const docs = await ProveedorModel.aggregate([
      { $match: { _id: { $in: objectIds } } },
      ...this.buildRelacionesPipeline(),
    ]);
    return docs.map((d) => this.normalizeId(d));
  }

  async getProveedorByRuc(ruc: string): Promise<Proveedor | null> {
    const rucNumber = Number(ruc);
    if (isNaN(rucNumber)) return null;
    const docs = await ProveedorModel.aggregate([
      { $match: { ruc: rucNumber } },
      ...this.buildRelacionesPipeline(),
    ]);
    return docs[0] ? this.normalizeId(docs[0]) : null;
  }

  async listProveedoresSubContrata(): Promise<Proveedor[]> {
    const docs = await ProveedorModel.find({ sub_contrata: true }).lean().exec();
    return docs.map((p: any) => ({
      id: p._id.toString(),
      razon_social: p.razon_social,
      direccion: p.direccion,
      nombre_comercial: p.nombre_comercial,
      ruc: p.ruc != null ? p.ruc.toString() : '',
      rubro: p.rubro,
      estado: p.estado,
      tipo: p.tipo,
      actividad: p.actividad,
      correo: p.correo,
      telefono: p.telefono ?? '-',
      estado_sunat: p.estado_sunat ?? '-',
      condicion: p.condicion ?? '-',
      agente_retencion: p.agente_retencion ?? false,
      sub_contrata: p.sub_contrata ?? false,
      distrito: p.distrito ?? '-',
      provincia: p.provincia ?? '-',
      departamento: p.departamento ?? '-',
    }));
  }

  async listProveedoresPaginated(
    filter?: ProveedorPaginationInput
  ): Promise<ProveedorPaginatedResponse> {
    const page = filter?.page || 1;
    const limit = filter?.limit || 10;
    const skip = (page - 1) * limit;
    const f = filter?.filter;
    const searchTerm = f?.searchTerm;

    const matchFilter: any = {};
    if (f?.estados && f.estados.length > 0) matchFilter.estado = { $in: f.estados };
    else if (f?.estado) {
      const t = String(f.estado).trim();
      if (t) {
        const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        matchFilter.estado = { $regex: `^${escaped}$`, $options: 'i' };
      }
    }
    if (f?.tipo) matchFilter.tipo = f.tipo;
    if (f?.rubro) matchFilter.rubro = f.rubro;
    if (f?.sub_contrata !== undefined) matchFilter.sub_contrata = f.sub_contrata;
    if (f?.departamento) matchFilter.departamento = f.departamento;
    if (f?.provincia) matchFilter.provincia = f.provincia;
    if (f?.distrito) matchFilter.distrito = f.distrito;

    if (searchTerm) {
      if (/^\d+$/.test(searchTerm.trim())) {
        const searchTermNumber = parseInt(searchTerm.trim(), 10);
        matchFilter.$or = [
          { ruc: searchTermNumber },
          { rucString: { $regex: searchTerm, $options: 'i' } },
          { razon_social: { $regex: searchTerm, $options: 'i' } },
          { nombre_comercial: { $regex: searchTerm, $options: 'i' } },
        ];
      } else {
        matchFilter.$or = [
          { razon_social: { $regex: searchTerm, $options: 'i' } },
          { nombre_comercial: { $regex: searchTerm, $options: 'i' } },
          { rucString: { $regex: searchTerm, $options: 'i' } },
        ];
      }
    }

    const sortField = filter?.sortBy || 'razon_social';
    const sortOrder = filter?.sortOrder === 'DESC' ? -1 : 1;
    const sort: any = {};
    sort[sortField] = sortOrder;

    const pipeline = [
      { $addFields: { rucString: { $toString: '$ruc' } } },
      { $match: matchFilter },
      {
        $project: {
          id: '$_id',
          razon_social: 1,
          direccion: 1,
          nombre_comercial: 1,
          ruc: { $toString: '$ruc' },
          rubro: 1,
          estado: 1,
          tipo: 1,
          actividad: 1,
          correo: 1,
          telefono: 1,
          estado_sunat: 1,
          condicion: 1,
          agente_retencion: 1,
          sub_contrata: 1,
          distrito: 1,
          provincia: 1,
          departamento: 1,
        },
      },
      { $sort: sort },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: limit }],
          totalCount: [{ $count: 'count' }],
        },
      },
    ];

    const result = await ProveedorModel.aggregate(pipeline as any);
    const data = (result[0]?.data || []).map((d: any) => this.normalizeId(d));
    const total = result[0]?.totalCount?.[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return { data, total, page, limit, totalPages };
  }

  async addProveedor(input: ProveedorInput): Promise<Proveedor> {
    const rucNumber = Number(input.ruc);
    if (isNaN(rucNumber) || !Number.isInteger(rucNumber)) {
      throw new Error('El RUC debe ser un número entero');
    }

    const existing = await ProveedorModel.findOne({ ruc: rucNumber });
    if (existing) {
      throw new Error('Ya existe un proveedor con este RUC');
    }

    const created = await new ProveedorModel({
      razon_social: input.razon_social || '',
      ruc: rucNumber,
      direccion: input.direccion,
      nombre_comercial: input.nombre_comercial,
      rubro: input.rubro,
      estado: input.estado,
      tipo: input.tipo,
      actividad: input.actividad,
      correo: input.correo,
      telefono: input.telefono,
      estado_sunat: input.estado_sunat || '-',
      condicion: input.condicion || '-',
      agente_retencion: input.agente_retencion || false,
      sub_contrata: input.sub_contrata || false,
      distrito: input.distrito || '-',
      provincia: input.provincia || '-',
      departamento: input.departamento || '-',
    }).save();

    const proveedor = await this.getProveedorById(created._id.toString());
    return proveedor as Proveedor;
  }

  async updateProveedor(id: string, input: ProveedorUpdateInput): Promise<Proveedor | null> {
    const updateData: any = {};
    Object.entries(input).forEach(([k, v]) => {
      if (v !== undefined) updateData[k] = v;
    });

    if (input.ruc !== undefined) {
      const rucNumber = Number(input.ruc);
      if (isNaN(rucNumber) || !Number.isInteger(rucNumber)) {
        throw new Error('El RUC debe ser un número entero');
      }
      const existing = await ProveedorModel.findOne({
        ruc: rucNumber,
        _id: { $ne: new Types.ObjectId(id) },
      });
      if (existing) {
        throw new Error('Ya existe otro proveedor con este RUC');
      }
      updateData.ruc = rucNumber;
    }

    const updated = await ProveedorModel.findByIdAndUpdate(id, updateData, { new: true });
    if (!updated) return null;
    return this.getProveedorById(id);
  }

  async deleteProveedor(id: string): Promise<Proveedor | null> {
    const proveedor = await this.getProveedorById(id);
    if (!proveedor) return null;
    await ProveedorModel.findByIdAndDelete(id);
    return proveedor;
  }
}
