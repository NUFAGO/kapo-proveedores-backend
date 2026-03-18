import { IResolvers } from '@graphql-tools/utils';
import { CategoriaChecklistService } from '../../../dominio/servicios/CategoriaChecklistService';
import { CategoriaChecklistInput } from '../../../dominio/entidades/CategoriaChecklist';
import { ErrorHandler } from './ErrorHandler';
import { adminGuard } from '../../auth/GraphQLGuards';

// Definir tipos para las mutations
interface CreateCategoriaChecklistArgs {
  input: CategoriaChecklistInput;
}

interface UpdateCategoriaChecklistArgs {
  id: string;
  input: Partial<CategoriaChecklistInput>;
}

interface DeleteCategoriaChecklistArgs {
  id: string;
}

/**
 * Resolver de categorías de checklist
 * Maneja las operaciones CRUD para CategoriaChecklist con guards y manejo de errores
 */
export class CategoriaChecklistResolver {
  constructor(
    private readonly servicio: CategoriaChecklistService
  ) {}

  getResolvers(): IResolvers {
    return {
      Query: {
        // Obtener una categoría de checklist por ID
        obtenerCategoriaChecklist: adminGuard(async (_: any, { id }: { id: string }) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.obtenerCategoriaChecklist(id),
            'obtenerCategoriaChecklist'
          );
        }),
        
        // Listar categorías de checklist con filtros y paginación
        listarCategoriasChecklist: adminGuard(async (_: any, args: {
          limit?: number;
          offset?: number;
          filters?: {
            nombre?: string;
            tipoUso?: 'pago' | 'documentos_oc';
            estado?: 'activo' | 'inactivo';
          };
        }) => {
          const { limit = 20, offset = 0, filters = {} } = args;
          return await ErrorHandler.handleError(
            async () => await this.servicio.listarCategoriasChecklist(filters, limit, offset),
            'listarCategoriasChecklist'
          );
        }),

        // Obtener solo categorías de checklist activas
        findActivasCategoriaChecklist: adminGuard(async () => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.obtenerCategoriasChecklistActivas(),
            'findActivasCategoriaChecklist'
          );
        }),

        // Obtener solo categorías de checklist inactivas
        findInactivasCategoriaChecklist: adminGuard(async () => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.obtenerCategoriasChecklistInactivas(),
            'findInactivasCategoriaChecklist'
          );
        })
      },
      
      Mutation: {
        // Solo admin puede crear categorías de checklist
        crearCategoriaChecklist: adminGuard(async (_: any, { input }: CreateCategoriaChecklistArgs) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.crearCategoriaChecklist(input),
            'crearCategoriaChecklist'
          );
        }),
        
        // Solo admin puede actualizar categorías de checklist
        actualizarCategoriaChecklist: adminGuard(async (_: any, { id, input }: UpdateCategoriaChecklistArgs) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.actualizarCategoriaChecklist(id, input),
            'actualizarCategoriaChecklist'
          );
        }),
        
        // Solo admin puede eliminar categorías de checklist
        eliminarCategoriaChecklist: adminGuard(async (_: any, { id }: DeleteCategoriaChecklistArgs) => {
          return await ErrorHandler.handleError(
            async () => await this.servicio.eliminarCategoriaChecklist(id),
            'eliminarCategoriaChecklist'
          );
        })
      }
    };
  }
}
