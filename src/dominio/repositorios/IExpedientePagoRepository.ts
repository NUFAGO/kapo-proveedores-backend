import { IBaseRepository } from './IBaseRepository';
import { ExpedientePago, ExpedientePagoFilter } from '../entidades/ExpedientePago';

export interface IExpedientePagoRepository extends IBaseRepository<ExpedientePago> {
  // Métodos específicos para expedientes de pago
  findByOcId(ocId: string): Promise<ExpedientePago | null>;
  findByProveedorId(proveedorId: string, filters?: ExpedientePagoFilter): Promise<ExpedientePago[]>;
  findByAdminCreador(adminCreadorId: string, filters?: ExpedientePagoFilter): Promise<ExpedientePago[]>;
  
  // Métodos de paginación con filtros específicos
  listExpedientesPaginated(filters: ExpedientePagoFilter): Promise<{
    data: ExpedientePago[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
  
  // Métodos de estado
  updateEstado(id: string, estado: ExpedientePago['estado']): Promise<ExpedientePago | null>;
  updateSaldos(id: string, montoComprometido: number, montoPagado: number): Promise<ExpedientePago | null>;
  
  // Validaciones
  existsExpedienteForOc(ocId: string): Promise<boolean>;
  countByEstado(estado: ExpedientePago['estado']): Promise<number>;
}
