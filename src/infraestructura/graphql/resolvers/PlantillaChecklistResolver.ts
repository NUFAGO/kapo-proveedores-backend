import { IResolvers } from '@graphql-tools/utils';
import { PlantillaChecklistService } from '../../../dominio/servicios/PlantillaChecklistService';
import { RequisitoDocumentoService } from '../../../dominio/servicios/RequisitoDocumentoService';
import { 
  PlantillaChecklistInput, 
  PlantillaChecklistFiltros,
  RequisitoDocumentoInput,
  RequisitoDocumentoFiltros
} from '../../../dominio/entidades/PlantillaChecklist';
import { ErrorHandler } from './ErrorHandler';
import { adminGuard } from '../../auth/GraphQLGuards';


// Definir tipos para los argumentos
interface CreatePlantillaChecklistArgs {
  input: PlantillaChecklistInput;
}

interface UpdatePlantillaChecklistArgs {
  id: string;
  input: Partial<PlantillaChecklistInput>;
}

interface DeletePlantillaChecklistArgs {
  id: string;
}

interface ListarPlantillasChecklistArgs {
  filtros?: PlantillaChecklistFiltros;
  limit?: number;
  offset?: number;
}

interface CreateRequisitoDocumentoArgs {
  input: RequisitoDocumentoInput;
}

interface UpdateRequisitoDocumentoArgs {
  id: string;
  input: Partial<RequisitoDocumentoInput>;
}

interface DeleteRequisitoDocumentoArgs {
  id: string;
}

interface ReordenarRequisitosArgs {
  checklistId: string;
  requisitos: { id: string; orden: number }[];
}

/**
 * Resolver de plantillas de checklist y requisitos de documento
 * Maneja las operaciones CRUD con guards y manejo de errores
 */
export class PlantillaChecklistResolver {
  constructor(
    private readonly plantillaService: PlantillaChecklistService,
    private readonly requisitoService: RequisitoDocumentoService
  ) {}

  getResolvers(): IResolvers {
    return {
      Query: {
        // PlantillasChecklist
        listarPlantillasChecklist: adminGuard(async (_: any, args: ListarPlantillasChecklistArgs) => {
          return await ErrorHandler.handleError(async () => {
            return await this.plantillaService.listarConRequisitos(
              args.filtros, 
              args.limit, 
              args.offset
            );
          }, 'listarPlantillasChecklist');
        }),

        listarPlantillasChecklistConRequisitos: adminGuard(async (_: any, args: ListarPlantillasChecklistArgs) => {
          return await ErrorHandler.handleError(async () => {
              return await this.plantillaService.listarConRequisitos(
                args.filtros, 
                args.limit, 
                args.offset
              );
            }, 'listarPlantillasChecklistConRequisitos');
          }),

        obtenerPlantillaChecklist: adminGuard(async (_: any, args: { id: string }) => {
          return await ErrorHandler.handleError(async () => {
              return await this.plantillaService.obtenerPorId(args.id);
            }, 'obtenerPlantillaChecklist');
          }),

        obtenerPlantillaChecklistConRequisitos: adminGuard(async (_: any, args: { id: string }) => {
          return await ErrorHandler.handleError(async () => {
              return await this.plantillaService.obtenerConRequisitos(args.id);
            }, 'obtenerPlantillaChecklistConRequisitos');
          }),

        findActivasPlantillaChecklist: adminGuard(async () => {
          return await ErrorHandler.handleError(async () => {
              return await this.plantillaService.listarActivas();
            }, 'findActivasPlantillaChecklist');
          }),

        findInactivasPlantillaChecklist: adminGuard(async () => {
          return await ErrorHandler.handleError(async () => {
              return await this.plantillaService.listarInactivas();
            }, 'findInactivasPlantillaChecklist');
          }),

        findPlantillasPorCategoria: adminGuard(async (_: any, args: { categoriaChecklistId: string }) => {
          return await ErrorHandler.handleError(async () => {
              return await this.plantillaService.listarPorCategoria(args.categoriaChecklistId);
            }, 'findPlantillasPorCategoria');
          }),

        findVigentesPlantillaChecklist: adminGuard(async () => {
          return await ErrorHandler.handleError(async () => {
              return await this.plantillaService.listarVigentes();
            }, 'findVigentesPlantillaChecklist');
          }),

        // Queries de versionamiento
        obtenerVersionesPorCodigo: adminGuard(async (_: any, args: { codigo: string }) => {
          return await ErrorHandler.handleError(async () => {
              return await this.plantillaService.obtenerVersionesPorCodigo(args.codigo);
            }, 'obtenerVersionesPorCodigo');
          }),

        obtenerVersionVigentePorCodigo: adminGuard(async (_: any, args: { codigo: string }) => {
          return await ErrorHandler.handleError(async () => {
              return await this.plantillaService.obtenerVersionVigentePorCodigo(args.codigo);
            }, 'obtenerVersionVigentePorCodigo');
          }),

        // RequisitosDocumento
        listarRequisitosPorChecklist: adminGuard(async (_: any, args: { checklistId: string }) => {
          return await ErrorHandler.handleError(async () => {
              return await this.requisitoService.listarPorChecklist(args.checklistId);
            }, 'listarRequisitosPorChecklist');
          }),

        listarRequisitosPorChecklistConRelaciones: adminGuard(async (_: any, args: { checklistId: string }) => {
          return await ErrorHandler.handleError(async () => {
              return await this.requisitoService.listarPorChecklistConRelaciones(args.checklistId);
            }, 'listarRequisitosPorChecklistConRelaciones');
          }),

        obtenerRequisitoDocumento: adminGuard(async (_: any, args: { id: string }) => {
          return await ErrorHandler.handleError(async () => {
              return await this.requisitoService.obtenerPorId(args.id);
            }, 'obtenerRequisitoDocumento');
          }),

        listarRequisitosConFiltros: adminGuard(async (_: any, args: { filtros?: RequisitoDocumentoFiltros }) => {
          return await ErrorHandler.handleError(async () => {
              return await this.requisitoService.listarConFiltros(args.filtros);
            }, 'listarRequisitosConFiltros');
          })
      },

      Mutation: {
        // PlantillasChecklist
        crearPlantillaChecklist: adminGuard(async (_: any, args: CreatePlantillaChecklistArgs) => {
          return await ErrorHandler.handleError(async () => {
            return await this.plantillaService.crear(args.input);
          }, 'crearPlantillaChecklist');
        }),

        actualizarPlantillaChecklist: adminGuard(async (_: any, args: UpdatePlantillaChecklistArgs) => {
          return await ErrorHandler.handleError(async () => {
              const result = await this.plantillaService.actualizar(args.id, args.input);
              if (!result) {
                throw new Error('No se pudo actualizar la plantilla de checklist');
              }
              return result;
            }, 'actualizarPlantillaChecklist');
        }),

        eliminarPlantillaChecklist: adminGuard(async (_: any, args: DeletePlantillaChecklistArgs) => {
          return await ErrorHandler.handleError(async () => {
              return await this.plantillaService.eliminar(args.id);
            }, 'eliminarPlantillaChecklist');
        }),

        duplicarPlantillaChecklist: adminGuard(async (_: any, args: { id: string; nuevoNombre: string }) => {
          return await ErrorHandler.handleError(async () => {
              return await this.plantillaService.duplicar(args.id, args.nuevoNombre);
            }, 'duplicarPlantillaChecklist');
        }),

        crearNuevaVersion: adminGuard(async (_: any, args: { checklistId: string }) => {
          return await ErrorHandler.handleError(async () => {
              return await this.plantillaService.crearNuevaVersion(args.checklistId);
            }, 'crearNuevaVersion');
        }),

        // RequisitosDocumento
        crearRequisitoDocumento: adminGuard(async (_: any, args: CreateRequisitoDocumentoArgs) => {
          return await ErrorHandler.handleError(async () => {
              return await this.requisitoService.crear(args.input);
            }, 'crearRequisitoDocumento');
        }),

        actualizarRequisitoDocumento: adminGuard(async (_: any, args: UpdateRequisitoDocumentoArgs) => {
          return await ErrorHandler.handleError(async () => {
              const result = await this.requisitoService.actualizar(args.id, args.input);
              if (!result) {
                throw new Error('No se pudo actualizar el requisito de documento');
              }
              return result;
            }, 'actualizarRequisitoDocumento');
        }),

        eliminarRequisitoDocumento: adminGuard(async (_: any, args: DeleteRequisitoDocumentoArgs) => {
          return await ErrorHandler.handleError(async () => {
              return await this.requisitoService.eliminar(args.id);
            }, 'eliminarRequisitoDocumento');
        }),

        reordenarRequisitos: adminGuard(async (_: any, args: ReordenarRequisitosArgs) => {
          return await ErrorHandler.handleError(async () => {
              return await this.requisitoService.reordenarRequisitos(args.checklistId, args.requisitos);
            }, 'reordenarRequisitos');
        }),

        crearMultiplesRequisitos: adminGuard(async (_: any, args: { requisitos: RequisitoDocumentoInput[] }) => {
          return await ErrorHandler.handleError(async () => {
              return await this.requisitoService.crearMultiples(args.requisitos);
            }, 'crearMultiplesRequisitos');
        }),

        eliminarRequisitosPorChecklist: adminGuard(async (_: any, args: { checklistId: string }) => {
          return await ErrorHandler.handleError(async () => {
              return await this.requisitoService.eliminarPorChecklist(args.checklistId);
            }, 'eliminarRequisitosPorChecklist');
        })
      }
    };
  }
}
