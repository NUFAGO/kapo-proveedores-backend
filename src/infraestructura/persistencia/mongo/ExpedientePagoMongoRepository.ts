import { IExpedientePagoRepository } from '../../../dominio/repositorios/IExpedientePagoRepository';
import { ExpedientePago, ExpedientePagoFilter } from '../../../dominio/entidades/ExpedientePago';
import { PaginationInput, PaginationResult, FilterInput, SearchInput } from '../../../dominio/valueObjects/Pagination';
import { ExpedientePagoModel, IExpedientePago as IExpedientePagoMongo } from './schemas/ExpedientePagoSchema';

export class ExpedientePagoMongoRepository implements IExpedientePagoRepository {
  
  async list(): Promise<ExpedientePago[]> {
    const expedientes = await ExpedientePagoModel
      .find()
      .sort({ fechaCreacion: -1 })
      .exec();
    return expedientes.map(exp => this.mapToEntity(exp));
  }

  async create(data: Partial<ExpedientePago>, session?: any): Promise<ExpedientePago> {
    const expediente = new ExpedientePagoModel(data);
    const saved = session 
      ? await expediente.save({ session })
      : await expediente.save();
    return this.mapToEntity(saved);
  }

  async findById(id: string, session?: any): Promise<ExpedientePago | null> {
    let q = ExpedientePagoModel.findById(id);
    if (session) q = q.session(session);
    const expediente = await q.exec();
    return expediente ? this.mapToEntity(expediente) : null;
  }

  async update(id: string, data: Partial<ExpedientePago>, session?: any): Promise<ExpedientePago | null> {
    const opts: Record<string, unknown> = { new: true, runValidators: true };
    if (session) opts['session'] = session;
    const updated = await ExpedientePagoModel.findByIdAndUpdate(id, data, opts as any).exec();
    return updated ? this.mapToEntity(updated as unknown as IExpedientePagoMongo) : null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await ExpedientePagoModel.findByIdAndDelete(id).exec();
    return !!result;
  }

  async findByOcId(ocId: string): Promise<ExpedientePago | null> {
    const expediente = await ExpedientePagoModel.findOne({ 
      ordenCompraId: ocId 
    }).exec();
    return expediente ? this.mapToEntity(expediente) : null;
  }

  async findByProveedorId(proveedorId: string, filters?: ExpedientePagoFilter): Promise<ExpedientePago[]> {
    const query: any = { proveedorId };
    
    if (filters?.estado) query.estado = filters.estado;
    if (filters?.searchTerm) {
      query.$or = [
        { codigo: { $regex: filters.searchTerm, $options: 'i' } },
        { descripcion: { $regex: filters.searchTerm, $options: 'i' } }
      ];
    }

    const expedientes = await ExpedientePagoModel
      .find(query)
      .sort({ fechaCreacion: -1 })
      .exec();
    
    return expedientes.map(exp => this.mapToEntity(exp));
  }

  async findByAdminCreador(adminCreadorId: string, filters?: ExpedientePagoFilter): Promise<ExpedientePago[]> {
    const query: any = { adminCreadorId };
    
    if (filters?.estado) query.estado = filters.estado;
    if (filters?.proveedorId) query.proveedorId = filters.proveedorId;
    if (filters?.searchTerm) {
      query.$or = [
        { codigo: { $regex: filters.searchTerm, $options: 'i' } },
        { descripcion: { $regex: filters.searchTerm, $options: 'i' } }
      ];
    }

    const expedientes = await ExpedientePagoModel
      .find(query)
      .sort({ fechaCreacion: -1 })
      .exec();
    
    return expedientes.map(exp => this.mapToEntity(exp));
  }

  async listExpedientesPaginated(filters: ExpedientePagoFilter): Promise<{
    data: ExpedientePago[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const skip = (page - 1) * limit;
      
      const query: any = {};
      
      if (filters.ocId) query.ordenCompraId = filters.ocId;
      if (filters.ocCodigo) query.codigo = filters.ocCodigo;
      if (filters.proveedorId) query.proveedorId = filters.proveedorId;
      if (filters.estado) query.estado = filters.estado;
      if (filters.adminCreadorId) query.adminCreadorId = filters.adminCreadorId;
      if (filters.searchTerm) {
        query.$or = [
          { codigo: { $regex: filters.searchTerm, $options: 'i' } },
          { descripcion: { $regex: filters.searchTerm, $options: 'i' } }
        ];
      }

      const [data, total] = await Promise.all([
        ExpedientePagoModel
          .find(query)
          .sort({ fechaCreacion: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        ExpedientePagoModel.countDocuments(query).exec()
      ]);

      // Asegurarse de que data siempre sea un array
      const safeData = Array.isArray(data) ? data : [];
      const safeTotal = typeof total === 'number' ? total : 0;

      return {
        data: safeData.map(exp => this.mapToEntity(exp)),
        total: safeTotal,
        page,
        limit,
        totalPages: Math.ceil(safeTotal / limit)
      };
    } catch (error) {
      // En caso de error, retornar estructura vacía pero válida
      return {
        data: [],
        total: 0,
        page: filters.page || 1,
        limit: filters.limit || 10,
        totalPages: 0
      };
    }
  }

  async updateEstado(id: string, estado: ExpedientePago['estado']): Promise<ExpedientePago | null> {
    const updateData: any = { estado };
    
    if (estado === 'configurado') {
      updateData.fechaConfigurado = new Date();
    }

    const updated = await ExpedientePagoModel.findByIdAndUpdate(
      id, 
      updateData, 
      { new: true, runValidators: true }
    ).exec();
    
    return updated ? this.mapToEntity(updated as unknown as IExpedientePagoMongo) : null;
  }

  async updateSaldos(id: string, montoComprometido: number, montoPagado: number): Promise<ExpedientePago | null> {
    const expediente = await ExpedientePagoModel.findById(id).exec();
    if (!expediente) return null;

    const montoDisponible = expediente.montoContrato - montoComprometido;

    const updated = await ExpedientePagoModel.findByIdAndUpdate(
      id, 
      { 
        montoComprometido, 
        montoPagado, 
        montoDisponible 
      }, 
      { new: true, runValidators: true }
    ).exec();
    
    return updated ? this.mapToEntity(updated as unknown as IExpedientePagoMongo) : null;
  }

  async existsExpedienteForOc(ocId: string): Promise<boolean> {
    const count = await ExpedientePagoModel.countDocuments({ 
      ordenCompraId: ocId 
    }).exec();
    return count > 0;
  }

  async countByEstado(estado: ExpedientePago['estado']): Promise<number> {
    return await ExpedientePagoModel.countDocuments({ estado }).exec();
  }

  // Métodos de IBaseRepository
  async listPaginated(pagination: PaginationInput): Promise<PaginationResult<ExpedientePago>> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;
    
    const [data, total] = await Promise.all([
      ExpedientePagoModel
        .find()
        .sort({ fechaCreacion: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      ExpedientePagoModel.countDocuments().exec()
    ]);

    return {
      data: data.map(exp => this.mapToEntity(exp)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }

  async listWithFilters(filters: FilterInput, pagination?: PaginationInput): Promise<PaginationResult<ExpedientePago>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const skip = (page - 1) * limit;
    
    const query: any = {};
    
    // Convertir filtros genéricos a filtros específicos de expediente
    if (filters['estado']) query.estado = filters['estado'];
    if (filters['proveedorId']) query.proveedorId = filters['proveedorId'];
    if (filters['adminCreadorId']) query.adminCreadorId = filters['adminCreadorId'];
    if (filters['searchTerm']) {
      query.$or = [
        { codigo: { $regex: filters['searchTerm'], $options: 'i' } },
        { descripcion: { $regex: filters['searchTerm'], $options: 'i' } }
      ];
    }

    const [data, total] = await Promise.all([
      ExpedientePagoModel
        .find(query)
        .sort({ fechaCreacion: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      ExpedientePagoModel.countDocuments(query).exec()
    ]);

    return {
      data: data.map(exp => this.mapToEntity(exp)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }

  async search(search: SearchInput, pagination?: PaginationInput): Promise<PaginationResult<ExpedientePago>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const skip = (page - 1) * limit;
    
    const query: any = {};
    
    if (search.query) {
      query.$or = [
        { codigo: { $regex: search.query, $options: 'i' } },
        { descripcion: { $regex: search.query, $options: 'i' } },
        { proveedorNombre: { $regex: search.query, $options: 'i' } }
      ];
    }

    const [data, total] = await Promise.all([
      ExpedientePagoModel
        .find(query)
        .sort({ fechaCreacion: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      ExpedientePagoModel.countDocuments(query).exec()
    ]);

    return {
      data: data.map(exp => this.mapToEntity(exp)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    };
  }

  async count(filters?: FilterInput): Promise<number> {
    const query: any = {};
    
    if (filters?.['estado']) query.estado = filters['estado'];
    if (filters?.['proveedorId']) query.proveedorId = filters['proveedorId'];
    if (filters?.['adminCreadorId']) query.adminCreadorId = filters['adminCreadorId'];
    if (filters?.['searchTerm']) {
      query.$or = [
        { codigo: { $regex: filters['searchTerm'], $options: 'i' } },
        { descripcion: { $regex: filters['searchTerm'], $options: 'i' } }
      ];
    }

    return await ExpedientePagoModel.countDocuments(query).exec();
  }

  private mapToEntity(doc: IExpedientePagoMongo): ExpedientePago {
    return {
      id: doc._id.toString(),
      ocId: doc.ordenCompraId,
      ocCodigo: doc.codigo,
      ocSnapshot: {}, // TODO: Implementar snapshot si es necesario
      fechaSnapshot: doc.fechaCreacion,
      proveedorId: doc.proveedorId,
      proveedorNombre: doc.proveedorNombre,
      montoContrato: doc.montoContrato,
      fechaInicioContrato: doc.fechaInicio,
      fechaFinContrato: doc.fechaFin,
      descripcion: doc.descripcion,
      estado: doc.estado,
      montoComprometido: doc.montoComprometido,
      montoPagado: doc.montoPagado,
      montoDisponible: doc.montoDisponible,
      requiereReportes: false, // TODO: Implementar si es necesario
      frecuenciaReporte: undefined as any, // TODO: Implementar cuando se tenga el campo en el schema
      minReportesPorSolicitud: doc.minReportesPorSolicitud,
      modoValidacionReportes: doc.modoValidacionReportes === 'error' ? 'obligatorio' : 'advertencia',
      adminCreadorId: doc.adminCreadorId,
      fechaCreacion: doc.fechaCreacion,
      ...(doc.fechaConfigurado && { fechaConfigurado: doc.fechaConfigurado })
    };
  }
}
