import { IRequisitoDocumentoRepository } from '../../../dominio/repositorios/IRequisitoDocumentoRepository';
import { 
  RequisitoDocumento, 
  RequisitoDocumentoInput, 
  RequisitoDocumentoFiltros 
} from '../../../dominio/entidades/PlantillaChecklist';
import { RequisitoDocumentoModel, IRequisitoDocumentoDocument } from './schemas/RequisitoDocumentoSchema';
import { Types } from 'mongoose';

export class RequisitoDocumentoMongoRepository implements IRequisitoDocumentoRepository {
  async crear(input: RequisitoDocumentoInput): Promise<RequisitoDocumento> {
    const document = new RequisitoDocumentoModel({
      ...input,
      _id: new Types.ObjectId()
    });

    const saved = await document.save();
    return this.mapToEntity(saved);
  }

  async obtenerPorId(id: string): Promise<RequisitoDocumento | null> {
    const document = await RequisitoDocumentoModel.findById(id);
    return document ? this.mapToEntity(document) : null;
  }

  async actualizar(id: string, input: Partial<RequisitoDocumentoInput>): Promise<RequisitoDocumento | null> {
    const document = await RequisitoDocumentoModel.findByIdAndUpdate(
      id,
      input,
      { new: true }
    );
    return document ? this.mapToEntity(document) : null;
  }

  async eliminar(id: string): Promise<boolean> {
    const result = await RequisitoDocumentoModel.findByIdAndDelete(id);
    return !!result;
  }

  async listarPorChecklist(checklistId: string): Promise<RequisitoDocumento[]> {
    const documents = await RequisitoDocumentoModel
      .find({ checklistId })
      .sort({ orden: 1 });
    
    return documents.map(doc => this.mapToEntity(doc));
  }

  async listarConFiltros(filtros?: RequisitoDocumentoFiltros): Promise<RequisitoDocumento[]> {
    const query: any = {};
    
    if (filtros?.checklistId) {
      query.checklistId = filtros.checklistId;
    }
    
    if (filtros?.tipoRequisito) {
      query.tipoRequisito = filtros.tipoRequisito;
    }
    
    if (filtros?.obligatorio !== undefined) {
      query.obligatorio = filtros.obligatorio;
    }
    
    if (filtros?.plantillaDocumentoId) {
      query.plantillaDocumentoId = filtros.plantillaDocumentoId;
    }
    
    if (filtros?.formularioId) {
      query.formularioId = filtros.formularioId;
    }

    const documents = await RequisitoDocumentoModel
      .find(query)
      .sort({ checklistId: 1, orden: 1 });
    
    return documents.map(doc => this.mapToEntity(doc));
  }

  async listarPorChecklistConRelaciones(checklistId: string): Promise<RequisitoDocumento[]> {
    // TODO: Implementar populate de relaciones cuando se creen los modelos respectivos
    console.log(`Implementar relaciones para checklist: ${checklistId}`);
    return this.listarPorChecklist(checklistId);
  }

  async contarPorChecklist(checklistId: string): Promise<number> {
    return await RequisitoDocumentoModel.countDocuments({ checklistId });
  }

  async contarPorFiltros(filtros?: RequisitoDocumentoFiltros): Promise<number> {
    const query: any = {};
    
    if (filtros?.checklistId) {
      query.checklistId = filtros.checklistId;
    }
    
    if (filtros?.tipoRequisito) {
      query.tipoRequisito = filtros.tipoRequisito;
    }
    
    if (filtros?.obligatorio !== undefined) {
      query.obligatorio = filtros.obligatorio;
    }
    
    if (filtros?.plantillaDocumentoId) {
      query.plantillaDocumentoId = filtros.plantillaDocumentoId;
    }
    
    if (filtros?.formularioId) {
      query.formularioId = filtros.formularioId;
    }

    return await RequisitoDocumentoModel.countDocuments(query);
  }

  async actualizarOrden(_checklistId: string, requisitos: { id: string; orden: number }[]): Promise<boolean> {
    const session = await RequisitoDocumentoModel.startSession();
    
    try {
      await session.withTransaction(async () => {
        for (const req of requisitos) {
          await RequisitoDocumentoModel.findByIdAndUpdate(
            req.id,
            { orden: req.orden },
            { session }
          );
        }
      });
      
      return true;
    } catch (error) {
      return false;
    } finally {
      await session.endSession();
    }
  }

  async crearMultiples(requisitos: RequisitoDocumentoInput[]): Promise<RequisitoDocumento[]> {
    const documents = requisitos.map(req => ({
      ...req,
      _id: new Types.ObjectId()
    }));

    const saved = await RequisitoDocumentoModel.insertMany(documents);
    return saved.map(doc => this.mapToEntity(doc));
  }

  async eliminarPorChecklist(_checklistId: string): Promise<boolean> {
    const result = await RequisitoDocumentoModel.deleteMany({ checklistId: _checklistId });
    return result.deletedCount > 0;
  }

  async existeOrden(checklistId: string, orden: number, excludeId?: string): Promise<boolean> {
    const query: any = { checklistId, orden };
    
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const count = await RequisitoDocumentoModel.countDocuments(query);
    return count > 0;
  }

  async obtenerMaxOrden(checklistId: string): Promise<number> {
    const latest = await RequisitoDocumentoModel
      .findOne({ checklistId })
      .sort({ orden: -1 })
      .select('orden');
    
    return latest?.orden || 0;
  }

  private mapToEntity(doc: IRequisitoDocumentoDocument): RequisitoDocumento {
    const entity: RequisitoDocumento = {
      id: doc._id.toString(),
      checklistId: doc.checklistId.toString(),
      tipoRequisito: doc.tipoRequisito,
      obligatorio: doc.obligatorio,
      orden: doc.orden
    };

    if (doc.plantillaDocumentoId) {
      entity.plantillaDocumentoId = doc.plantillaDocumentoId.toString();
    }
    
    if (doc.formularioId) {
      entity.formularioId = doc.formularioId.toString();
    }

    // TODO: Implementar relaciones cuando se creen los modelos respectivos
    // entity.plantaDocumento = ...;
    // entity.formulario = ...;

    return entity;
  }
}
