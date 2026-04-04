import { ExpedientePago, ExpedientePagoInput, ExpedientePagoFilter } from '../entidades/ExpedientePago';
import { TipoPagoOC } from '../entidades/TipoPagoOC';
import { IExpedientePagoRepository } from '../repositorios/IExpedientePagoRepository';
import { ITipoPagoOCRepository } from '../repositorios/ITipoPagoOCRepository';
import { IDocumentoOCRepository } from '../repositorios/IDocumentoOCRepository';
import { ICategoriaChecklistRepository } from '../repositorios/ICategoriaChecklistRepository';
import { IPlantillaChecklistRepository } from '../repositorios/IPlantillaChecklistRepository';
import { BaseHttpRepository } from '../../infraestructura/persistencia/http/BaseHttpRepository';
import { logger } from '../../infraestructura/logging';

class MonolithHttpRepository extends BaseHttpRepository<any> {
  async list(): Promise<any[]> {
    return [];
  }

  protected getDefaultSearchFields(): string[] {
    return [];
  }

  // Expose the protected graphqlRequest method for use in ExpedientePagoService
  async callGraphQLRequest(query: string, variables: any = {}, serviceName: string = '', fallbackServiceName: string = 'inacons-backend'): Promise<any> {
    return this.graphqlRequest(query, variables, serviceName, fallbackServiceName);
  }
}

export class ExpedientePagoService {
  private httpRepository: MonolithHttpRepository;

  constructor(
    private readonly expedienteRepository: IExpedientePagoRepository,
    private readonly tipoPagoOCRepository: ITipoPagoOCRepository,
    private readonly documentoOCRepository: IDocumentoOCRepository,
    private readonly categoriaRepository: ICategoriaChecklistRepository,
    private readonly plantillaRepository: IPlantillaChecklistRepository
  ) {
    this.httpRepository = new MonolithHttpRepository();
  }

  /**
   * Actualizar el estado de tiene_expediente en el monolito
   */
  private async actualizarEstadoExpedienteEnMonolito(ocId: string, tieneExpediente: boolean): Promise<void> {
    try {
      logger.info(`Actualizando estado de expediente en monolito para OC ${ocId} a ${tieneExpediente}`);
      
      const mutation = `
        mutation ActualizarEstadoExpediente($ordenCompraId: ID!, $tieneExpediente: Boolean!) {
          actualizarEstadoExpediente(ordenCompraId: $ordenCompraId, tieneExpediente: $tieneExpediente) {
            success
            message
          }
        }
      `;

      const result = await this.httpRepository.callGraphQLRequest(
        mutation,
        { ordenCompraId: ocId, tieneExpediente },
        'inacons-backend'
      );

      if (result?.actualizarEstadoExpediente?.success) {
        logger.info(`Estado de expediente actualizado exitosamente en monolito para OC ${ocId}`);
      } else {
        throw new Error('No se pudo actualizar el estado de expediente en el monolito');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // MODO ESTRICTO: CUALQUIER error del monolito causa rollback
      if (errorMessage.includes('Cannot query field') || errorMessage.includes('actualizarEstadoExpediente')) {
        throw new Error(`La mutación actualizarEstadoExpediente no está disponible en el monolito. El monolito necesita reiniciarse para poder crear expedientes.`);
      }
      
      throw new Error(`Error crítico al actualizar estado de expediente en monolito: ${errorMessage}`);
    }
  }

  /**
   * Crear un nuevo expediente de pago desde una OC
   */
  async crearExpedientePago(input: ExpedientePagoInput): Promise<ExpedientePago> {
    // Validar que la OC exista - temporalmente omitimos esta validación
    // const ordenCompra = await this.ordenCompraRepository.findById(input.ocId);
    // if (!ordenCompra) {
    //   throw new Error('La orden de compra especificada no existe');
    // }

    // Validar que no exista un expediente para esta OC
    const existeExpediente = await this.expedienteRepository.existsExpedienteForOc(input.ocId);
    if (existeExpediente) {
      throw new Error('Ya existe un expediente para esta orden de compra');
    }

    // Calcular montos iniciales
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const montoDisponible = input.montoContrato;

    const expediente: Omit<ExpedientePago, 'id'> = {
      ...input,
      fechaSnapshot: new Date(),
      estado: 'en_configuracion',
      montoComprometido: 0,
      montoPagado: 0,
      montoDisponible,
      requiereReportes: input.requiereReportes || false,
      fechaCreacion: new Date()
    };

    let nuevoExpediente: ExpedientePago | undefined;

    try {
      // 1. Crear el expediente
      nuevoExpediente = await this.expedienteRepository.create(expediente);

      // 2. Actualizar el estado de tiene_expediente en el monolito
      await this.actualizarEstadoExpedienteEnMonolito(input.ocId, true);

      // 3. Si todo fue exitoso, retornar el expediente
      return nuevoExpediente;
    } catch (error) {
      // 4. Si falló la actualización en el monolito, hacer rollback: eliminar el expediente creado
      if (nuevoExpediente && nuevoExpediente.id) {
        try {
          await this.expedienteRepository.delete(nuevoExpediente.id);
          logger.warn(`Rollback: Expediente ${nuevoExpediente.id} eliminado debido a fallo en monolito`);
        } catch (rollbackError) {
          const rollbackErrorMessage = rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
          logger.error(`Error crítico: No se pudo hacer rollback del expediente ${nuevoExpediente.id}:`, { error: rollbackErrorMessage });
        }
      }
      
      // 5. Lanzar el error original para que el cliente sepa que falló
      throw error;
    }
  }

  /**
   * Obtener un expediente por ID
   */
  async obtenerExpedientePago(id: string): Promise<ExpedientePago> {
    const expediente = await this.expedienteRepository.findById(id);
    if (!expediente) {
      throw new Error('Expediente no encontrado');
    }
    return expediente;
  }

  /**
   * Listar expedientes con paginación y filtros
   */
  async listarExpedientesPago(filters: ExpedientePagoFilter): Promise<{
    data: ExpedientePago[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    
    const result = await this.expedienteRepository.listExpedientesPaginated({
      ...filters,
      page,
      limit
    });

    return {
      ...result,
      totalPages: Math.ceil(result.total / limit)
    };
  }

  /**
   * Configurar un expediente con documentos base y tipos de pago
   */
  async configurarExpediente(
    expedienteId: string,
    documentosBaseIds: string[],
    tiposPago: Array<{
      categoriaChecklistId: string;
      checklistId: string;
      modoRestriccion: TipoPagoOC['modoRestriccion'];
      orden?: number;
      requiereAnteriorPagado?: boolean;
      porcentajeMaximo?: number;
      porcentajeMinimo?: number;
    }>
  ): Promise<ExpedientePago> {
    // Validar que el expediente exista y esté en configuración
    const expediente = await this.obtenerExpedientePago(expedienteId);
    if (expediente.estado !== 'en_configuracion') {
      throw new Error('Solo se pueden configurar expedientes en estado "en_configuracion"');
    }

    // Generar documentos OC a partir de los checklists de documentos base
    for (const checklistId of documentosBaseIds) {
      await this.generarDocumentosDesdeChecklist(expedienteId, checklistId);
    }

    // Crear tipos de pago OC
    for (const tipoPago of tiposPago) {
      await this.crearTipoPagoOC(expedienteId, tipoPago);
    }

    // Actualizar estado del expediente
    const expedienteActualizado = await this.expedienteRepository.updateEstado(
      expedienteId,
      'configurado'
    );

    if (!expedienteActualizado) {
      throw new Error('Error al actualizar el estado del expediente');
    }

    return expedienteActualizado;
  }

  /**
   * Generar documentos OC a partir de una plantilla de checklist
   */
  private async generarDocumentosDesdeChecklist(expedienteId: string, checklistId: string): Promise<void> {
    // Obtener requisitos del checklist - temporalmente omitimos esta validación
    // const requisitos = await this.requisitoDocumentoRepository.findByChecklistId(checklistId);
    
    // Placeholder - esta funcionalidad se implementará cuando esté disponible el método
    console.log(`Generando documentos para checklist ${checklistId} en expediente ${expedienteId}`);
    
    // for (const requisito of requisitos) {
    //   if (requisito.tipoRequisito === 'documento') {
    //     const documentoInput = {
    //       expedienteId,
    //       tipoDocumentoId: requisito.plantillaDocumentoId || requisito.tipoDocumentoId,
    //       plantillaDocumentoId: requisito.plantillaDocumentoId,
    //       obligatorio: requisito.obligatorio
    //     };

    //     await this.documentoOCRepository.create(documentoInput);
    //   }
    // }
  }

  /**
   * Crear un tipo de pago OC
   */
  private async crearTipoPagoOC(
    expedienteId: string,
    tipoPago: Omit<TipoPagoOC, 'id' | 'expedienteId' | 'fechaAsignacion'>
  ): Promise<void> {
    // Validar que no exista esta categoría en el expediente
    const existeCategoria = await this.tipoPagoOCRepository.existsCategoriaInExpediente(
      expedienteId,
      tipoPago.categoriaChecklistId
    );

    if (existeCategoria) {
      throw new Error(`La categoría de checklist ya está asignada a este expediente`);
    }

    const tipoPagoInput = {
      ...tipoPago,
      expedienteId,
      fechaAsignacion: new Date()
    };

    await this.tipoPagoOCRepository.create(tipoPagoInput);
  }

  /**
   * Actualizar estado de un expediente
   */
  async actualizarEstado(id: string, estado: ExpedientePago['estado']): Promise<ExpedientePago> {
    const expediente = await this.expedienteRepository.updateEstado(id, estado);
    if (!expediente) {
      throw new Error('No se pudo actualizar el estado del expediente');
    }
    return expediente;
  }

  /**
   * Actualizar saldos de un expediente
   */
  async actualizarSaldos(
    id: string,
    montoComprometido: number,
    montoPagado: number
  ): Promise<ExpedientePago> {
    const expediente = await this.expedienteRepository.findById(id);
    if (!expediente) {
      throw new Error('Expediente no encontrado');
    }

    // Calcular monto disponible para validaciones futuras
    // const montoDisponible = expediente.montoContrato - montoComprometido - montoPagado;

    const expedienteActualizado = await this.expedienteRepository.updateSaldos(
      id,
      montoComprometido,
      montoPagado
    );

    if (!expedienteActualizado) {
      throw new Error('No se pudieron actualizar los saldos del expediente');
    }

    return expedienteActualizado;
  }

  /**
   * Eliminar un expediente
   */
  async eliminarExpedientePago(id: string): Promise<boolean> {
    const expediente = await this.expedienteRepository.findById(id);
    if (!expediente) {
      throw new Error('Expediente no encontrado');
    }

    // Solo se pueden eliminar expedientes en estado en_configuracion
    if (expediente.estado !== 'en_configuracion') {
      throw new Error('Solo se pueden eliminar expedientes en estado "en_configuracion"');
    }

    const resultado = await this.expedienteRepository.delete(id);
    
    // Si se eliminó exitosamente, actualizar el estado en el monolito
    if (resultado) {
      await this.actualizarEstadoExpedienteEnMonolito(expediente.ocId, false);
    }
    
    return resultado;
  }

  /**
   * Guardar expediente con items seleccionados (crea expediente, documentos y tipos de pago)
   */
  async guardarExpedienteConItems(
    ocData: {
      id: string;
      codigo: string;
      proveedorId: string;
      proveedorNombre: string;
      montoContrato: number;
      fechaInicioContrato: string;
      fechaFinContrato: string;
      descripcion?: string;
    },
    adminCreadorId: string,
    solicitudesPago: Array<{
      categoriaChecklistId: string;
      plantillaChecklistId: string;
    }>,
    documentosOC: Array<{
      categoriaChecklistId: string;
      plantillaChecklistId: string;
    }>
  ): Promise<ExpedientePago> {
    // 2. Crear el expediente con los datos proporcionados
    const expedienteInput: ExpedientePagoInput = {
      ocId: ocData.id,
      ocCodigo: ocData.codigo,
      ocSnapshot: ocData, // Guardamos los datos que recibimos
      proveedorId: ocData.proveedorId,
      proveedorNombre: ocData.proveedorNombre,
      montoContrato: ocData.montoContrato,
      fechaInicioContrato: new Date(ocData.fechaInicioContrato),
      fechaFinContrato: new Date(ocData.fechaFinContrato),
      descripcion: ocData.descripcion || `Expediente para OC ${ocData.codigo}`,
      requiereReportes: false,
      adminCreadorId
    };

    // Mapear al formato del esquema de MongoDB
    const expedienteMongoData = {
      ordenCompraId: expedienteInput.ocId,
      codigo: expedienteInput.ocCodigo,
      proveedorId: expedienteInput.proveedorId,
      proveedorNombre: expedienteInput.proveedorNombre,
      montoContrato: expedienteInput.montoContrato,
      montoDisponible: expedienteInput.montoContrato, // Inicialmente todo disponible
      montoComprometido: 0,
      montoPagado: 0,
      estado: 'en_configuracion' as const,
      fechaInicio: expedienteInput.fechaInicioContrato,
      fechaFin: expedienteInput.fechaFinContrato,
      descripcion: expedienteInput.descripcion,
      minReportesPorSolicitud: 1,
      modoValidacionReportes: 'advertencia' as const,
      adminCreadorId: expedienteInput.adminCreadorId
    };

    let expediente: ExpedientePago | undefined;
    let tiposPagoCreados: any[] = [];
    let documentosCreados: any[] = [];

    try {
      // 1. Validar que no exista un expediente para esta OC
      const existeExpediente = await this.expedienteRepository.existsExpedienteForOc(ocData.id);
      if (existeExpediente) {
        throw new Error('Ya existe un expediente para esta orden de compra');
      }

      // 2. Crear el expediente
      expediente = await this.expedienteRepository.create(expedienteMongoData);

      // 3. Crear los tipos de pago (solicitudes de pago)
      for (const [index, solicitud] of solicitudesPago.entries()) {
        const tipoPagoInput = {
          expedienteId: expediente.id,
          categoriaChecklistId: solicitud.categoriaChecklistId,
          checklistId: solicitud.plantillaChecklistId,
          modoRestriccion: 'libre' as const,
          orden: index + 1
        };
        const tipoPagoCreado = await this.tipoPagoOCRepository.create(tipoPagoInput);
        tiposPagoCreados.push(tipoPagoCreado);
      }

      // 4. Crear los documentos OC
      for (const documento of documentosOC) {
        const documentoInput = {
          expedienteId: expediente.id,
          checklistId: documento.plantillaChecklistId,
          obligatorio: true
        };
        const documentoCreado = await this.documentoOCRepository.create(documentoInput);
        documentosCreados.push(documentoCreado);
      }

      // 5. Actualizar estado del expediente a configurado
      const expedienteActualizado = await this.actualizarEstado(expediente.id, 'configurado');
      
      // 6. Actualizar el estado de tiene_expediente en el monolito
      await this.actualizarEstadoExpedienteEnMonolito(ocData.id, true);
      
      return expedienteActualizado;
    } catch (error) {
      // 7. Si algo falló, hacer rollback completo (solo si se creó algo)
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Solo hacer rollback si el error no es de "expediente ya existe"
      if (!errorMessage.includes('Ya existe un expediente')) {
        logger.error(`Error en guardarExpedienteConItems, iniciando rollback para OC ${ocData.id}:`, { error: errorMessage });
        
        // Eliminar documentos creados
        for (const documento of documentosCreados) {
          try {
            await this.documentoOCRepository.delete(documento.id);
          } catch (rollbackError) {
            const rollbackErrorMessage = rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
            logger.error(`Error eliminando documento ${documento.id} en rollback:`, { error: rollbackErrorMessage });
          }
        }

        // Eliminar tipos de pago creados
        for (const tipoPago of tiposPagoCreados) {
          try {
            await this.tipoPagoOCRepository.delete(tipoPago.id);
          } catch (rollbackError) {
            const rollbackErrorMessage = rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
            logger.error(`Error eliminando tipo pago ${tipoPago.id} en rollback:`, { error: rollbackErrorMessage });
          }
        }

        // Eliminar el expediente creado
        if (expediente && expediente.id) {
          try {
            await this.expedienteRepository.delete(expediente.id);
            logger.warn(`Rollback: Expediente ${expediente.id} eliminado debido a fallo en guardarExpedienteConItems`);
          } catch (rollbackError) {
            const rollbackErrorMessage = rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
            logger.error(`Error crítico: No se pudo eliminar el expediente ${expediente.id} en rollback:`, { error: rollbackErrorMessage });
          }
        }
      } else {
        logger.warn(`No se hace rollback porque el error es de expediente duplicado para OC ${ocData.id}`);
      }
      
      // Lanzar el error original
      throw error;
    }
  }

  /**
   * Obtener expediente por OC ID
   */
  async obtenerExpedientePorOcId(ocId: string): Promise<ExpedientePago> {
    const expediente = await this.expedienteRepository.findByOcId(ocId);
    if (!expediente) {
      throw new Error('No se encontró un expediente para la OC especificada');
    }
    return expediente;
  }

  /**
   * Obtener expediente completo con todas sus relaciones y archivos
   */
  async obtenerExpedienteCompleto(id: string): Promise<any> {
    // Obtener el expediente principal
    const expediente = await this.expedienteRepository.findById(id);
    if (!expediente) {
      throw new Error('El expediente especificado no existe');
    }

    // Obtener tipos de pago relacionados
    const tiposPago = await this.tipoPagoOCRepository.findByExpedienteId(id);

    // Obtener documentos OC relacionados
    const documentos = await this.documentoOCRepository.findByExpedienteId(id);

    // Recopilar IDs unicos de categorias y checklists para hacer lookups
    const categoriaIds = new Set<string>();
    const checklistIds = new Set<string>();

    for (const tp of tiposPago) {
      if (tp.categoriaChecklistId) categoriaIds.add(tp.categoriaChecklistId);
      if (tp.checklistId) checklistIds.add(tp.checklistId);
    }
    for (const doc of documentos) {
      if (doc.checklistId) checklistIds.add(doc.checklistId);
    }

    // Lookup real de categorias
    const categoriasMap = new Map<string, any>();
    for (const catId of categoriaIds) {
      try {
        const cat = await this.categoriaRepository.obtenerCategoriaChecklist(catId);
        if (cat) categoriasMap.set(catId, cat);
      } catch (e) {
        logger.warn(`No se pudo obtener categoria ${catId}: ${e}`);
      }
    }

    // Lookup real de plantillas/checklists
    const checklistsMap = new Map<string, any>();
    for (const clId of checklistIds) {
      try {
        const cl = await this.plantillaRepository.obtenerPorId(clId);
        if (cl) checklistsMap.set(clId, cl);
      } catch (e) {
        logger.warn(`No se pudo obtener checklist ${clId}: ${e}`);
      }
    }

    // Mapear al formato esperado por GraphQL
    return {
      ...expediente,
      tiposPago: tiposPago.map(tp => ({
        ...tp,
        categoria: categoriasMap.get(tp.categoriaChecklistId) || null,
        checklist: checklistsMap.get(tp.checklistId) || null
      })),
      documentos: documentos.map(doc => ({
        ...doc,
        estado: doc.estado ? doc.estado.toUpperCase() : 'PENDIENTE',
        checklist: checklistsMap.get(doc.checklistId) || null
      }))
    };
  }
}
