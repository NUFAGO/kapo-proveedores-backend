import mongoose, { Types } from 'mongoose';
import { IMediosPagoProveedorRepository } from '../../../dominio/repositorios/IMediosPagoProveedorRepository';
import {
  MedioPagoLitleBox,
  MediosPagoProveedor,
  MediosPagoProveedorInput,
  MediosPagoProveedorLitleBoxGroup,
  MediosPagoProveedorUpdateInput,
  MediosPagoNoValidadoFilter,
  MediosPagoProveedorPaginatedResponse,
  ProveedorLitleBox,
} from '../../../dominio/entidades/MediosPagoProveedor';
import { Proveedor } from '../../../dominio/entidades/Proveedor';
import { Banco } from '../../../dominio/entidades/Banco';
import { MediosPagoProveedorModel } from './schemas/MediosPagoProveedorSchema';
import { ArchivoSustentoProveedorModel } from './schemas/ArchivoSustentoProveedorSchema';
import { ProveedorModel } from './schemas/ProveedorSchema';

export class MediosPagoProveedorMongoRepository implements IMediosPagoProveedorRepository {
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

  private bancoToDomain(doc: any): Banco | null {
    if (!doc || !doc._id) return null;
    return {
      id: doc._id.toString(),
      nombre: doc.nombre,
      abreviatura: doc.abreviatura,
    };
  }

  private toDomain(doc: any): MediosPagoProveedor {
    return {
      id: doc._id.toString(),
      proveedor_id: this.proveedorToDomain(doc.proveedor_id),
      entidad: this.bancoToDomain(doc.entidad),
      nro_cuenta: doc.nro_cuenta,
      detalles: doc.detalles,
      titular: doc.titular,
      validado: doc.validado,
      mostrar: doc.mostrar,
    };
  }

  async listMediosPagoProveedores(): Promise<MediosPagoProveedor[]> {
    const docs = await MediosPagoProveedorModel.find()
      .populate('proveedor_id')
      .populate('entidad');
    return docs.map((d) => this.toDomain(d));
  }

  async listMediosPagoProveedorByProveedor(proveedorId: string): Promise<MediosPagoProveedor[]> {
    const docs = await MediosPagoProveedorModel.find({
      proveedor_id: new Types.ObjectId(proveedorId),
    })
      .populate('proveedor_id')
      .populate('entidad');
    return docs.map((d) => this.toDomain(d));
  }

  async listMediosPagoProveedorLitleBox(): Promise<MediosPagoProveedorLitleBoxGroup[]> {
    const rows = await ProveedorModel.aggregate([
      { $match: { tipo: 'CAJA CHICA' } },
      {
        $lookup: {
          from: 'medios_pago_proveedor',
          let: { proveedorId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$proveedor_id', '$$proveedorId'] } } },
            {
              $lookup: {
                from: 'banco',
                localField: 'entidad',
                foreignField: '_id',
                as: 'entidad',
              },
            },
            { $unwind: { path: '$entidad', preserveNullAndEmptyArrays: true } },
          ],
          as: 'medios_pago',
        },
      },
      {
        $project: {
          _id: 0,
          proveedor_id: {
            id: '$_id',
            razon_social: '$razon_social',
            nombre_comercial: '$nombre_comercial',
            tipo: '$tipo',
            ruc: '$ruc',
            direccion: '$direccion',
            rubro: '$rubro',
            estado: '$estado',
            actividad: '$actividad',
            correo: '$correo',
            horario: '$horario',
          },
          medios_pago: {
            $map: {
              input: '$medios_pago',
              as: 'medio',
              in: {
                id: '$$medio._id',
                nro_cuenta: '$$medio.nro_cuenta',
                entidad: {
                  id: '$$medio.entidad._id',
                  nombre: '$$medio.entidad.nombre',
                  abreviatura: '$$medio.entidad.abreviatura',
                },
                detalles: '$$medio.detalles',
                titular: '$$medio.titular',
                validado: '$$medio.validado',
                mostrar: '$$medio.mostrar',
              },
            },
          },
        },
      },
    ]);

    return rows.map((row) => this.litleBoxGroupToDomain(row));
  }

  private litleBoxGroupToDomain(row: Record<string, unknown>): MediosPagoProveedorLitleBoxGroup {
    const provRaw = row.proveedor_id;
    const prov =
      provRaw && typeof provRaw === 'object'
        ? (provRaw as Record<string, unknown>)
        : ({} as Record<string, unknown>);
    const proveedor_id: ProveedorLitleBox = {
      id: String(prov.id ?? ''),
      razon_social: String(prov.razon_social ?? ''),
      nombre_comercial: prov.nombre_comercial != null ? String(prov.nombre_comercial) : null,
      tipo: String(prov.tipo ?? 'CAJA CHICA'),
      ruc: prov.ruc != null ? String(prov.ruc) : '',
      direccion: prov.direccion != null ? String(prov.direccion) : null,
      rubro: prov.rubro != null ? String(prov.rubro) : null,
      estado: prov.estado != null ? String(prov.estado) : null,
      actividad: prov.actividad != null ? String(prov.actividad) : null,
      correo: prov.correo != null ? String(prov.correo) : null,
      horario: prov.horario != null ? String(prov.horario) : null,
    };

    const mediosRaw = Array.isArray(row.medios_pago) ? row.medios_pago : [];
    const medios_pago: MedioPagoLitleBox[] = mediosRaw.map((m) => {
      const o = m && typeof m === 'object' ? (m as Record<string, unknown>) : {};
      const ent = o.entidad && typeof o.entidad === 'object' ? (o.entidad as Record<string, unknown>) : null;
      return {
        id: String(o.id ?? ''),
        nro_cuenta: o.nro_cuenta != null ? String(o.nro_cuenta) : null,
        entidad: ent
          ? {
              id: ent.id != null ? String(ent.id) : '',
              nombre: ent.nombre != null ? String(ent.nombre) : '',
              abreviatura: ent.abreviatura != null ? String(ent.abreviatura) : '',
            }
          : null,
        detalles: o.detalles != null ? String(o.detalles) : null,
        titular: o.titular != null ? String(o.titular) : null,
        validado: o.validado != null ? Boolean(o.validado) : null,
        mostrar: o.mostrar != null ? Boolean(o.mostrar) : null,
      };
    });

    return { proveedor_id, medios_pago };
  }

  async listMediosPagoProveedorNoValidado(
    filter?: MediosPagoNoValidadoFilter
  ): Promise<MediosPagoProveedorPaginatedResponse> {
    const page = filter?.page || 1;
    const limit = filter?.limit || 10;
    const skip = (page - 1) * limit;
    const search = filter?.search?.trim();

    const pipeline: any[] = [
      // Igual que el kanban de inacons: !validado && mostrar === true
      // (mostrar: true estricto excluye registros antiguos sin el campo).
      { $match: { validado: { $ne: true }, mostrar: true } },
      {
        $lookup: { from: 'proveedor', localField: 'proveedor_id', foreignField: '_id', as: 'proveedor_id' },
      },
      { $unwind: { path: '$proveedor_id', preserveNullAndEmptyArrays: true } },
      {
        $lookup: { from: 'banco', localField: 'entidad', foreignField: '_id', as: 'entidad' },
      },
      { $unwind: { path: '$entidad', preserveNullAndEmptyArrays: true } },
    ];

    if (search) {
      const rx = new RegExp(search, 'i');
      pipeline.push({
        $match: {
          $or: [
            { 'proveedor_id.razon_social': rx },
            { 'proveedor_id.nombre_comercial': rx },
            { nro_cuenta: rx },
            { titular: rx },
          ],
        },
      });
    }

    pipeline.push({
      $facet: {
        data: [{ $sort: { _id: -1 } }, { $skip: skip }, { $limit: limit }],
        totalCount: [{ $count: 'count' }],
      },
    });

    const result = await MediosPagoProveedorModel.aggregate(pipeline);
    const docs = result[0]?.data || [];
    const total = result[0]?.totalCount?.[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    return {
      data: docs.map((d: any) => this.toDomain(d)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Crea el medio de pago Y registra sus archivos de sustento de forma ATÓMICA
   * (una sola transacción). Si algo falla, no se crea nada (ni medio ni archivos).
   * Las URLs ya deben venir subidas a GCS por el front.
   */
  async addMediosPagoProveedorConSustentos(
    input: MediosPagoProveedorInput,
    urls: string[]
  ): Promise<MediosPagoProveedor | null> {
    const session = await mongoose.startSession();
    try {
      let creadoId: string | null = null;
      await session.withTransaction(async () => {
        const docs = await MediosPagoProveedorModel.create(
          [
            {
              proveedor_id: new Types.ObjectId(input.proveedor_id),
              entidad: input.entidad ? new Types.ObjectId(input.entidad) : undefined,
              nro_cuenta: input.nro_cuenta,
              detalles: input.detalles,
              titular: input.titular,
              // mostrar=true / validado=false por defecto => queda "Pendiente"
            },
          ],
          { session, ordered: true }
        );
        const medio = docs[0];
        if (!medio) throw new Error('No se pudo crear el medio de pago');
        creadoId = String(medio._id);
        if (urls && urls.length > 0) {
          await ArchivoSustentoProveedorModel.create(
            urls.map((u) => ({ file: u, referencia_id: medio._id, tipo: 'medio_pago' })),
            { session, ordered: true }
          );
        }
      });
      if (!creadoId) return null;
      const populated = await MediosPagoProveedorModel.findById(creadoId)
        .populate('proveedor_id')
        .populate('entidad');
      return populated ? this.toDomain(populated) : null;
    } finally {
      await session.endSession();
    }
  }

  async addMediosPagoProveedor(
    input: MediosPagoProveedorInput
  ): Promise<MediosPagoProveedor | null> {
    const created = await new MediosPagoProveedorModel({
      proveedor_id: new Types.ObjectId(input.proveedor_id),
      entidad: input.entidad ? new Types.ObjectId(input.entidad) : undefined,
      nro_cuenta: input.nro_cuenta,
      detalles: input.detalles,
      titular: input.titular,
      validado: input.validado,
      mostrar: input.mostrar,
    }).save();
    const populated = await MediosPagoProveedorModel.findById(created._id)
      .populate('proveedor_id')
      .populate('entidad');
    return populated ? this.toDomain(populated) : null;
  }

  async updateMediosPagoProveedor(
    id: string,
    input: MediosPagoProveedorUpdateInput
  ): Promise<MediosPagoProveedor | null> {
    const updateData: any = {};
    if (input.proveedor_id !== undefined) updateData.proveedor_id = new Types.ObjectId(input.proveedor_id);
    if (input.entidad !== undefined) updateData.entidad = input.entidad ? new Types.ObjectId(input.entidad) : null;
    if (input.nro_cuenta !== undefined) updateData.nro_cuenta = input.nro_cuenta;
    if (input.detalles !== undefined) updateData.detalles = input.detalles;
    if (input.titular !== undefined) updateData.titular = input.titular;
    if (input.validado !== undefined) updateData.validado = input.validado;
    if (input.mostrar !== undefined) updateData.mostrar = input.mostrar;

    const doc = await MediosPagoProveedorModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate('proveedor_id')
      .populate('entidad');
    return doc ? this.toDomain(doc) : null;
  }

  async deleteMediosPagoProveedor(id: string): Promise<MediosPagoProveedor | null> {
    const doc = await MediosPagoProveedorModel.findByIdAndDelete(id);
    return doc ? this.toDomain(doc) : null;
  }
}
