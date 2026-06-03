import { IComentarioProveedorRepository } from '../../../dominio/repositorios/IComentarioProveedorRepository';
import { ComentarioProveedor, ComentarioProveedorInput } from '../../../dominio/entidades/ComentarioProveedor';
import { ComentarioProveedorModel } from './schemas/ComentarioProveedorSchema';

export class ComentarioProveedorMongoRepository implements IComentarioProveedorRepository {
  private toDomain(doc: any): ComentarioProveedor {
    const out: ComentarioProveedor = {
      id: doc._id.toString(),
      referencia_id: doc.referencia_id,
      tabla: doc.tabla,
      comentario: doc.comentario,
      usuario_id: doc.usuario_id ?? null,
      usuario_nombre: doc.usuario_nombre ?? null,
    };
    if (doc.createdAt) out.createdAt = new Date(doc.createdAt).toISOString();
    return out;
  }

  async listByReferencia(referenciaId: string, tabla?: string): Promise<ComentarioProveedor[]> {
    const query: any = { referencia_id: referenciaId };
    if (tabla) query.tabla = tabla;
    const docs = await ComentarioProveedorModel.find(query).sort({ createdAt: -1 });
    return docs.map((d) => this.toDomain(d));
  }

  async add(input: ComentarioProveedorInput): Promise<ComentarioProveedor> {
    const created = await new ComentarioProveedorModel({
      referencia_id: input.referencia_id,
      tabla: input.tabla,
      comentario: input.comentario,
      usuario_id: input.usuario_id ?? undefined,
      usuario_nombre: input.usuario_nombre ?? undefined,
    }).save();
    return this.toDomain(created);
  }
}
