import { IResolvers } from '@graphql-tools/utils';

import { ExpedientePagoService } from '../../../dominio/servicios/ExpedientePagoService';

import { ExpedientePagoInput, ExpedientePagoFilter } from '../../../dominio/entidades/ExpedientePago';

import { ErrorHandler } from './ErrorHandler';

import { adminGuard } from '../../auth/GraphQLGuards';

import { JWTUtils } from '../../auth/JWTUtils';



// Definir tipos para las mutations

interface CreateExpedientePagoArgs {

  input: ExpedientePagoInput;

}



interface UpdateEstadoExpedienteArgs {

  id: string;

  estado: string;

}



// interface UpdateExpedientePagoArgs {

//   id: string;

//   input: Partial<ExpedientePagoInput>;

// }



interface ConfigurarExpedienteArgs {

  expedienteId: string;

  documentosBaseIds: string[];

  tiposPago: Array<{

    categoriaChecklistId: string;

    checklistId: string;

    modoRestriccion: 'libre' | 'orden' | 'porcentaje' | 'orden_y_porcentaje';

    orden?: number;

    requiereAnteriorPagado?: boolean;

    porcentajeMaximo?: number;

    porcentajeMinimo?: number;

    permiteVincularReportes?: boolean;

  }>;

}



interface GuardarExpedienteItemsArgs {

  input: {

    ocData: {

      id: string;

      codigo: string;

      proveedorId: string;

      proveedorNombre: string;

      montoContrato: number;

      fechaInicioContrato: string;

      fechaFinContrato: string;

      descripcion?: string;

    };

    adminCreadorId: string;

    solicitudesPago: Array<{

      categoriaChecklistId: string;

      plantillaChecklistId: string;

      orden?: number | null;

      porcentajeMaximo?: number | null;

      porcentajeMinimo?: number | null;

      permiteVincularReportes?: boolean;

    }>;

    documentosOC: Array<{

      categoriaChecklistId: string;

      plantillaChecklistId: string;

      obligatorio?: boolean | null;

      bloqueaSolicitudPago?: boolean | null;

    }>;

  };

}

interface ActualizarExpedienteItemsArgs {

  input: {

    expedienteId: string;

    solicitudesPago: Array<{

      id?: string | null;

      categoriaChecklistId: string;

      plantillaChecklistId: string;

      orden?: number | null;

      porcentajeMaximo?: number | null;

      porcentajeMinimo?: number | null;

      permiteVincularReportes?: boolean;

    }>;

    documentosOC: Array<{

      id?: string | null;

      categoriaChecklistId: string;

      plantillaChecklistId: string;

      obligatorio?: boolean | null;

      bloqueaSolicitudPago?: boolean | null;

    }>;

  };

}



/**

 * Resolver de expedientes de pago

 * Maneja las operaciones CRUD para ExpedientePago con guards y manejo de errores

 */

export class ExpedientePagoResolver {

  constructor(

    private readonly servicio: ExpedientePagoService

  ) {}



  getResolvers(): IResolvers {

    return {

      Query: {

        // Obtener un expediente de pago por ID

        obtenerExpedientePago: adminGuard(async (_: any, { id }: { id: string }) => {

          return await ErrorHandler.handleError(

            async () => await this.servicio.obtenerExpedientePago(id),

            'obtenerExpedientePago'

          );

        }),

        

        // Obtener expediente por OC ID

        obtenerExpedientePorOcId: adminGuard(async (_: any, { ocId }: { ocId: string }) => {

          return await ErrorHandler.handleError(

            async () => await this.servicio.obtenerExpedientePorOcId(ocId),

            'obtenerExpedientePorOcId'

          );

        }),



        // Obtener expediente completo con todas sus relaciones y archivos

        obtenerExpedienteCompleto: async (_: any, { id }: { id: string }, context: any) => {

          // Extraer y validar token

          const token = context.req?.headers?.authorization 

            ? JWTUtils.extractTokenFromHeader(context.req.headers.authorization)

            : null;



          if (!token) {

            throw new Error('AUTENTICACION_REQUERIDA: Token de autenticación requerido');

          }



          const payload = JWTUtils.validateToken(token);



          // Validar tipo de usuario

          if (!['admin', 'proveedor'].includes(payload.tipo_usuario)) {

            throw new Error('AUTORIZACION_DENEGADA: Tipo de usuario no autorizado');

          }



          // Primero obtener el expediente básico para validar propiedad

          const expediente = await this.servicio.obtenerExpedientePago(id);

          if (!expediente) {

            throw new Error('El expediente especificado no existe');

          }



          // Validar acceso según rol

          if (payload.tipo_usuario === 'admin') {

            // Admin puede acceder a cualquier expediente

            return await ErrorHandler.handleError(

              async () => await this.servicio.obtenerExpedienteCompleto(id),

              'obtenerExpedienteCompleto'

            );

          } else if (payload.tipo_usuario === 'proveedor') {

            // Proveedor solo puede acceder a sus expedientes

            if (!JWTUtils.canAccessProveedor(payload, expediente.proveedorId)) {

              throw new Error('AUTORIZACION_DENEGADA: No tienes acceso a este expediente');

            }

            

            return await ErrorHandler.handleError(

              async () => await this.servicio.obtenerExpedienteCompleto(id),

              'obtenerExpedienteCompleto'

            );

          }

        },

        

        // Listar expedientes de pago con filtros y paginación

        listarExpedientesPago: async (_: any, args: { filter?: ExpedientePagoFilter }, context: any) => {

          // Extraer y validar token

          const token = context.req?.headers?.authorization 

            ? JWTUtils.extractTokenFromHeader(context.req.headers.authorization)

            : null;



          if (!token) {

            throw new Error('AUTENTICACION_REQUERIDA: Token de autenticación requerido');

          }



          const payload = JWTUtils.validateToken(token);



          // Validar tipo de usuario

          if (!['admin', 'proveedor'].includes(payload.tipo_usuario)) {

            throw new Error('AUTORIZACION_DENEGADA: Tipo de usuario no autorizado');

          }



          // Si es admin, puede ver todos los expedientes

          if (payload.tipo_usuario === 'admin') {

            return await ErrorHandler.handleError(

              async () => await this.servicio.listarExpedientesPago(args.filter || {}),

              'listarExpedientesPago'

            );

          } else if (payload.tipo_usuario === 'proveedor') {

            // Validar que el proveedor tenga un ID válido
            if (!payload.proveedor_id) {
              throw new Error('AUTORIZACION_DENEGADA: El proveedor no tiene un ID válido');
            }

            // Si es proveedor, filtrar por su proveedorId
            const filterConProveedor: ExpedientePagoFilter = {
              ...args.filter,
              proveedorId: payload.proveedor_id
            };



            return await ErrorHandler.handleError(
              async () => await this.servicio.listarExpedientesPago(filterConProveedor),
              'listarExpedientesPago'
            );

          }

          // Por si acaso, aunque no debería llegar aquí
          throw new Error('AUTORIZACION_DENEGADA: Tipo de usuario no autorizado');

        },



        // Obtener expedientes por proveedor (con autenticación JWT)

        obtenerExpedientesPorProveedor: async (_: any, args: { 

          proveedorId: string; 

          filters?: ExpedientePagoFilter;

        }, context: any) => {

          // Extraer token del contexto y validar

          const token = context.req?.headers?.authorization 

            ? JWTUtils.extractTokenFromHeader(context.req.headers.authorization)

            : null;



          if (!token) {

            throw new Error('AUTENTICACION_REQUERIDA: Token de autenticación requerido');

          }



          // Validar el token

          const payload = JWTUtils.validateToken(token);



          // Verificar que el usuario tenga acceso a este proveedor

          if (!JWTUtils.canAccessProveedor(payload, args.proveedorId)) {

            throw new Error('AUTORIZACION_DENEGADA: No tienes acceso a este proveedor');

          }



          return await ErrorHandler.handleError(

            async () => await this.servicio.obtenerExpedientesPorProveedor(args.proveedorId, args.filters || {}),

            'obtenerExpedientesPorProveedor'

          );

        }

      },

      

      Mutation: {

        // Solo admin puede crear expedientes de pago

        crearExpedientePago: adminGuard(async (_: any, { input }: CreateExpedientePagoArgs) => {

          return await ErrorHandler.handleError(

            async () => await this.servicio.crearExpedientePago(input),

            'crearExpedientePago'

          );

        }),

        

        // Solo admin puede configurar un expediente

        configurarExpediente: adminGuard(async (_: any, args: ConfigurarExpedienteArgs) => {

          return await ErrorHandler.handleError(

            async () => await this.servicio.configurarExpediente(

              args.expedienteId,

              args.documentosBaseIds,

              args.tiposPago

            ),

            'configurarExpediente'

          );

        }),

        

        // Guardar expediente con items seleccionados

        guardarExpedienteConItems: adminGuard(async (_: any, args: GuardarExpedienteItemsArgs) => {

          return await ErrorHandler.handleError(

            async () => await this.servicio.guardarExpedienteConItems(

              args.input.ocData,

              args.input.adminCreadorId,

              args.input.solicitudesPago,

              args.input.documentosOC

            ),

            'guardarExpedienteConItems'

          );

        }),

        

        actualizarExpedienteItems: adminGuard(async (_: any, args: ActualizarExpedienteItemsArgs) => {

          return await ErrorHandler.handleError(

            async () =>

              await this.servicio.actualizarExpedienteItems(

                args.input.expedienteId,

                args.input.solicitudesPago,

                args.input.documentosOC

              ),

            'actualizarExpedienteItems'

          );

        }),

        

        // Solo admin puede actualizar estado de expediente

        actualizarEstadoExpediente: adminGuard(async (_: any, { id, estado }: UpdateEstadoExpedienteArgs) => {

          return await ErrorHandler.handleError(

            async () => await this.servicio.actualizarEstado(id, estado as any),

            'actualizarEstadoExpediente'

          );

        }),

        

        // Solo admin puede actualizar saldos de expediente

        actualizarSaldosExpediente: adminGuard(async (_: any, { 

          id, 

          montoComprometido, 

          montoPagado 

        }: { 

          id: string; 

          montoComprometido: number; 

          montoPagado: number;

        }) => {

          return await ErrorHandler.handleError(

            async () => await this.servicio.actualizarSaldos(id, montoComprometido, montoPagado),

            'actualizarSaldosExpediente'

          );

        }),

        

        // Solo admin puede eliminar expedientes de pago

        eliminarExpedientePago: adminGuard(async (_: any, { id }: { id: string }) => {

          return await ErrorHandler.handleError(

            async () => await this.servicio.eliminarExpedientePago(id),

            'eliminarExpedientePago'

          );

        })

      }

    };

  }

}

