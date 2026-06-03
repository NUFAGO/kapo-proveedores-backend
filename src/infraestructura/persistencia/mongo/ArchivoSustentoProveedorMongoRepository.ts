import { Types } from 'mongoose';
import { IArchivoSustentoProveedorRepository } from '../../../dominio/repositorios/IArchivoSustentoProveedorRepository';
import { ArchivoSustentoProveedor, ArchivoSustentoProveedorInput } from '../../../dominio/entidades/ArchivoSustentoProveedor';
import { ArchivoSustentoProveedorModel } from './schemas/ArchivoSustentoProveedorSchema';

export class ArchivoSustentoProveedorMongoRepository implements IArchivoSustentoProveedorRepository {
  private toDomain(doc: any): ArchivoSustentoProveedor {
    return {
      id: doc._id.toString(),
      url: doc.file,
      referencia_id: doc.referencia_id?.toString() ?? '',
      tipo: doc.tipo,
    };
  }

  async getFilesByReferencia(referenciaId: string, tipo: string): Promise<ArchivoSustentoProveedor[]> {
    const docs = await ArchivoSustentoProveedorModel.find({
      referencia_id: new Types.ObjectId(referenciaId),
      tipo,
    }).sort({ _id: -1 });
    return docs.map((d) => this.toDomain(d));
  }

  async registerFromUrl(input: ArchivoSustentoProveedorInput): Promise<ArchivoSustentoProveedor> {
    const created = await new ArchivoSustentoProveedorModel({
      file: input.url,
      referencia_id: new Types.ObjectId(input.referencia_id),
      tipo: input.tipo,
    }).save();
    return this.toDomain(created);
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await ArchivoSustentoProveedorModel.findByIdAndDelete(id);
    return !!deleted;
  }
}
