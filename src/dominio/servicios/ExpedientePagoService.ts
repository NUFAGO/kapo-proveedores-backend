import { ExpedientePago, ExpedientePagoInput, ExpedientePagoFilter } from '../entidades/ExpedientePago';
import { TipoPagoOC } from '../entidades/TipoPagoOC';
import { IExpedientePagoRepository } from '../repositorios/IExpedientePagoRepository';
import { ITipoPagoOCRepository } from '../repositorios/ITipoPagoOCRepository';
import { IDocumentoOCRepository } from '../repositorios/IDocumentoOCRepository';
import { ICategoriaChecklistRepository } from '../repositorios/ICategoriaChecklistRepository';
import { IPlantillaChecklistRepository } from '../repositorios/IPlantillaChecklistRepository';
import { ISolicitudPagoRepository } from '../repositorios/ISolicitudPagoRepository';
import { BaseHttpRepository } from '../../infraestructura/persistencia/http/BaseHttpRepository';
import { logger } from '../../infraestructura/logging';

function porcentajeTipoPagoOmitido(value: number | null | undefined): number | undefined {
  if (value == null || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return Math.min(100, value);
}

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
    private readonly plantillaRepository: IPlantillaChecklistRepository,
    private readonly solicitudPagoRepository: ISolicitudPagoRepository
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
   * Listar expedientes de pago con filtros y paginación
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
   * Obtener expedientes por proveedor con filtros y paginación
   */
  async obtenerExpedientesPorProveedor(
    proveedorId: string, 
    filters: ExpedientePagoFilter
  ): Promise<{
    data: ExpedientePago[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      
      const result = await this.expedienteRepository.listExpedientesPaginated({
        ...filters,
        proveedorId,
        page,
        limit
      });

      // Asegurarse de que siempre se retorne un array válido
      const safeData = Array.isArray(result?.data) ? result.data : [];
      const safeTotal = typeof result?.total === 'number' ? result.total : 0;

      return {
        data: safeData,
        total: safeTotal,
        page,
        limit,
        totalPages: Math.ceil(safeTotal / limit)
      };
    } catch (error) {
      logger.error('Error en obtenerExpedientesPorProveedor', {
        error: error instanceof Error ? error.message : String(error),
        proveedorId,
        filters
      });
      // Retornar estructura válida en caso de error
      return {
        data: [],
        total: 0,
        page: filters.page || 1,
        limit: filters.limit || 10,
        totalPages: 0
      };
    }
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
      permiteVincularReportes?: boolean;
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
      orden?: number | null;
      porcentajeMaximo?: number | null;
      porcentajeMinimo?: number | null;
      permiteVincularReportes?: boolean;
    }>,
    documentosOC: Array<{
      categoriaChecklistId: string;
      plantillaChecklistId: string;
      obligatorio?: boolean | null;
      bloqueaSolicitudPago?: boolean | null;
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
        const maxPct = porcentajeTipoPagoOmitido(solicitud.porcentajeMaximo ?? undefined);
        let minPct = porcentajeTipoPagoOmitido(solicitud.porcentajeMinimo ?? undefined);
        if (maxPct == null) {
          minPct = undefined;
        } else if (minPct != null && minPct > maxPct) {
          minPct = maxPct;
        }
        const ordenSol = solicitud.orden;
        const orden =
          ordenSol != null && Number.isFinite(Number(ordenSol)) && Number(ordenSol) >= 1
            ? Math.floor(Number(ordenSol))
            : index + 1;

        const tipoPagoInput: Partial<TipoPagoOC> & {
          expedienteId: string;
          categoriaChecklistId: string;
          checklistId: string;
          fechaAsignacion: Date;
          modoRestriccion: TipoPagoOC['modoRestriccion'];
        } = {
          expedienteId: expediente.id,
          categoriaChecklistId: solicitud.categoriaChecklistId,
          checklistId: solicitud.plantillaChecklistId,
          fechaAsignacion: new Date(),
          orden,
          requiereAnteriorPagado: false,
          permiteVincularReportes: solicitud.permiteVincularReportes === true,
          ...(maxPct != null
            ? {
                modoRestriccion: 'porcentaje' as const,
                porcentajeMaximo: maxPct,
                ...(minPct != null ? { porcentajeMinimo: minPct } : {})
              }
            : {
                modoRestriccion: 'libre' as const
              })
        };
        const tipoPagoCreado = await this.tipoPagoOCRepository.create(tipoPagoInput);
        tiposPagoCreados.push(tipoPagoCreado);
      }

      // 4. Crear los documentos OC
      for (const documento of documentosOC) {
        const documentoInput = {
          expedienteId: expediente.id,
          checklistId: documento.plantillaChecklistId,
          obligatorio: documento.obligatorio !== false,
          bloqueaSolicitudPago: documento.bloqueaSolicitudPago === true
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
   * Sincroniza tipos de pago y documentos OC de un expediente ya existente.
   * No restringe por estado del expediente; la UI controla cuándo mostrar borrado.
   * - Tipo de pago: no se elimina si tiene solicitudes asociadas.
   * - Documento OC: se elimina de BD si deja de figurar en el input (cualquier estado).
   */
  async actualizarExpedienteItems(
    expedienteId: string,
    solicitudesPago: Array<{
      id?: string | null;
      categoriaChecklistId: string;
      plantillaChecklistId: string;
      orden?: number | null;
      porcentajeMaximo?: number | null;
      porcentajeMinimo?: number | null;
      permiteVincularReportes?: boolean;
    }>,
    documentosOC: Array<{
      id?: string | null;
      categoriaChecklistId: string;
      plantillaChecklistId: string;
      obligatorio?: boolean | null;
      bloqueaSolicitudPago?: boolean | null;
    }>
  ): Promise<ExpedientePago> {
    const expediente = await this.expedienteRepository.findById(expedienteId);
    if (!expediente) {
      throw new Error('El expediente especificado no existe');
    }

    const [tiposActuales, docsActuales] = await Promise.all([
      this.tipoPagoOCRepository.findByExpedienteId(expedienteId),
      this.documentoOCRepository.findByExpedienteId(expedienteId),
    ]);

    const idsTiposInput = new Set(
      solicitudesPago.map((s) => s.id).filter((x): x is string => Boolean(x))
    );
    const tiposAEliminar = tiposActuales.filter((t) => !idsTiposInput.has(t.id));

    if (tiposAEliminar.length > 0) {
      const idsEliminar = tiposAEliminar.map((t) => t.id);
      const tiposConSolicitudes =
        await this.solicitudPagoRepository.listTipoPagoOCIdsThatHaveSolicitudes(idsEliminar);
      if (tiposConSolicitudes.length > 0) {
        throw new Error(
          'No se puede eliminar un tipo de pago que ya tiene solicitudes de pago asociadas'
        );
      }
      await Promise.all(idsEliminar.map((id) => this.tipoPagoOCRepository.delete(id)));
    }

    const idsDocsInput = new Set(
      documentosOC.map((d) => d.id).filter((x): x is string => Boolean(x))
    );
    const docsAEliminar = docsActuales.filter((d) => !idsDocsInput.has(d.id));

    if (docsAEliminar.length > 0) {
      await Promise.all(docsAEliminar.map((d) => this.documentoOCRepository.delete(d.id)));
    }

    const errDupTipoChecklist = () =>
      new Error('Ya existe un tipo de pago con esta plantilla de checklist en el expediente');
    const errDupDocChecklist = () =>
      new Error('Ya existe un documento OC con esta plantilla de checklist en el expediente');

    const tipoPorId = new Map<string, TipoPagoOC>(
      tiposActuales.filter((t) => idsTiposInput.has(t.id)).map((t) => [t.id, t])
    );
    const checklistToTipoId = new Map<string, string>();
    for (const t of tipoPorId.values()) {
      if (checklistToTipoId.has(t.checklistId)) {
        throw new Error('Estado inconsistente: duplicado de plantilla en tipos de pago del expediente');
      }
      checklistToTipoId.set(t.checklistId, t.id);
    }

    type FilaTipo = { mongoId: string; solicitud: (typeof solicitudesPago)[0]; ordenFinal: number };
    const filasTipo: FilaTipo[] = [];

    for (const [index, solicitud] of solicitudesPago.entries()) {
      const ordenSol = solicitud.orden;
      const ordenFinal =
        ordenSol != null && Number.isFinite(Number(ordenSol)) && Number(ordenSol) >= 1
          ? Math.floor(Number(ordenSol))
          : index + 1;

      const cid = solicitud.plantillaChecklistId;

      if (solicitud.id) {
        const existente = tipoPorId.get(solicitud.id);
        if (!existente || existente.expedienteId !== expedienteId) {
          throw new Error('Tipo de pago no encontrado o no pertenece al expediente');
        }
        const prevCid = existente.checklistId;
        if (cid !== prevCid) {
          const owner = checklistToTipoId.get(cid);
          if (owner && owner !== solicitud.id) {
            throw errDupTipoChecklist();
          }
          checklistToTipoId.delete(prevCid);
          checklistToTipoId.set(cid, solicitud.id);
        } else if (checklistToTipoId.get(cid) !== solicitud.id) {
          throw errDupTipoChecklist();
        }
        filasTipo.push({ mongoId: solicitud.id, solicitud, ordenFinal });
      } else {
        if (checklistToTipoId.has(cid)) {
          throw errDupTipoChecklist();
        }
        const maxPct = porcentajeTipoPagoOmitido(solicitud.porcentajeMaximo ?? undefined);
        let minPct = porcentajeTipoPagoOmitido(solicitud.porcentajeMinimo ?? undefined);
        if (maxPct == null) {
          minPct = undefined;
        } else if (minPct != null && minPct > maxPct) {
          minPct = maxPct;
        }

        const tipoPagoInput: Partial<TipoPagoOC> & {
          expedienteId: string;
          categoriaChecklistId: string;
          checklistId: string;
          fechaAsignacion: Date;
          modoRestriccion: TipoPagoOC['modoRestriccion'];
        } = {
          expedienteId,
          categoriaChecklistId: solicitud.categoriaChecklistId,
          checklistId: solicitud.plantillaChecklistId,
          fechaAsignacion: new Date(),
          orden: 10000 + index,
          requiereAnteriorPagado: false,
          permiteVincularReportes: solicitud.permiteVincularReportes === true,
          ...(maxPct != null
            ? {
                modoRestriccion: 'porcentaje' as const,
                porcentajeMaximo: maxPct,
                ...(minPct != null ? { porcentajeMinimo: minPct } : {}),
              }
            : {
                modoRestriccion: 'libre' as const,
              }),
        };
        const creado = await this.tipoPagoOCRepository.create(tipoPagoInput);
        checklistToTipoId.set(cid, creado.id);
        tipoPorId.set(creado.id, creado);
        filasTipo.push({ mongoId: creado.id, solicitud, ordenFinal });
      }
    }

    await Promise.all(
      filasTipo.map((filaTmp, i) =>
        this.tipoPagoOCRepository.update(filaTmp.mongoId, { orden: 20000 + i })
      )
    );

    const patchResults = await Promise.all(
      filasTipo.map((fila) => {
        const s = fila.solicitud;
        const maxPct = porcentajeTipoPagoOmitido(s.porcentajeMaximo ?? undefined);
        let minPct = porcentajeTipoPagoOmitido(s.porcentajeMinimo ?? undefined);
        if (maxPct == null) {
          minPct = undefined;
        } else if (minPct != null && minPct > maxPct) {
          minPct = maxPct;
        }

        const patch: Partial<TipoPagoOC> = {
          categoriaChecklistId: s.categoriaChecklistId,
          checklistId: s.plantillaChecklistId,
          orden: fila.ordenFinal,
          permiteVincularReportes: s.permiteVincularReportes === true,
          requiereAnteriorPagado: false,
        };

        if (maxPct != null) {
          patch.modoRestriccion = 'porcentaje';
          patch.porcentajeMaximo = maxPct;
          if (minPct != null) {
            patch.porcentajeMinimo = minPct;
          } else {
            (patch as any).porcentajeMinimo = null;
          }
        } else {
          patch.modoRestriccion = 'libre';
          (patch as any).porcentajeMaximo = null;
          (patch as any).porcentajeMinimo = null;
        }

        return this.tipoPagoOCRepository.update(fila.mongoId, patch);
      })
    );

    if (patchResults.some((r) => !r)) {
      throw new Error('No se pudo actualizar un tipo de pago del expediente');
    }

    const docPorId = new Map(
      docsActuales.filter((d) => idsDocsInput.has(d.id)).map((d) => [d.id, d])
    );
    const checklistToDocId = new Map<string, string>();
    for (const d of docPorId.values()) {
      if (checklistToDocId.has(d.checklistId)) {
        throw new Error('Estado inconsistente: duplicado de plantilla en documentos OC del expediente');
      }
      checklistToDocId.set(d.checklistId, d.id);
    }

    for (const docIn of documentosOC) {
      if (docIn.id) {
        const doc = docPorId.get(docIn.id);
        if (!doc || doc.expedienteId !== expedienteId) {
          throw new Error('Documento OC no encontrado o no pertenece al expediente');
        }
        const cid = docIn.plantillaChecklistId;
        const prevCid = doc.checklistId;
        if (cid !== prevCid) {
          const owner = checklistToDocId.get(cid);
          if (owner && owner !== docIn.id) {
            throw errDupDocChecklist();
          }
          checklistToDocId.delete(prevCid);
          checklistToDocId.set(cid, docIn.id);
        } else if (checklistToDocId.get(cid) !== docIn.id) {
          throw errDupDocChecklist();
        }
        if (doc.estado !== 'BORRADOR' && doc.checklistId !== docIn.plantillaChecklistId) {
          throw new Error(
            'No se puede cambiar la plantilla de un documento OC que ya no está en borrador'
          );
        }
        const patchDoc: {
          checklistId: string;
          obligatorio?: boolean;
          bloqueaSolicitudPago?: boolean;
        } = {
          checklistId: docIn.plantillaChecklistId,
        };
        if (typeof docIn.obligatorio === 'boolean') {
          patchDoc.obligatorio = docIn.obligatorio;
        }
        if (typeof docIn.bloqueaSolicitudPago === 'boolean') {
          patchDoc.bloqueaSolicitudPago = docIn.bloqueaSolicitudPago;
        }
        const actualizado = await this.documentoOCRepository.update(docIn.id, patchDoc);
        if (!actualizado) {
          throw new Error('No se pudo actualizar el documento OC');
        }
        doc.checklistId = docIn.plantillaChecklistId;
        if (typeof docIn.obligatorio === 'boolean') {
          doc.obligatorio = docIn.obligatorio;
        }
        if (typeof docIn.bloqueaSolicitudPago === 'boolean') {
          doc.bloqueaSolicitudPago = docIn.bloqueaSolicitudPago;
        }
      } else {
        if (checklistToDocId.has(docIn.plantillaChecklistId)) {
          throw errDupDocChecklist();
        }
        const creado = await this.documentoOCRepository.create({
          expedienteId,
          checklistId: docIn.plantillaChecklistId,
          obligatorio: docIn.obligatorio !== false,
          bloqueaSolicitudPago: docIn.bloqueaSolicitudPago === true,
        });
        checklistToDocId.set(docIn.plantillaChecklistId, creado.id);
        docPorId.set(creado.id, creado);
      }
    }

    const expedienteRefrescado = await this.expedienteRepository.findById(expedienteId);
    if (!expedienteRefrescado) {
      throw new Error('No se pudo recargar el expediente tras la actualización');
    }
    return expedienteRefrescado;
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
   * OPTIMIZADO: Usa consultas batch en lugar de lookups individuales
   */
  async obtenerExpedienteCompleto(id: string): Promise<any> {
    // Obtener el expediente principal
    const expediente = await this.expedienteRepository.findById(id);
    if (!expediente) {
      throw new Error('El expediente especificado no existe');
    }

    // Obtener tipos de pago y documentos en paralelo
    const [tiposPago, documentos] = await Promise.all([
      this.tipoPagoOCRepository.findByExpedienteId(id),
      this.documentoOCRepository.findByExpedienteId(id)
    ]);

    // Recopilar IDs unicos para consultas batch
    const categoriaIds = new Set<string>();
    const checklistIds = new Set<string>();

    for (const tp of tiposPago) {
      if (tp.categoriaChecklistId) categoriaIds.add(tp.categoriaChecklistId);
      if (tp.checklistId) checklistIds.add(tp.checklistId);
    }
    for (const doc of documentos) {
      if (doc.checklistId) checklistIds.add(doc.checklistId);
    }

    // CONSULTAS BATCH OPTIMIZADAS
    const [categorias, checklists] = await Promise.all([
      // Obtener todas las categorías en una sola consulta
      categoriaIds.size > 0 
        ? this.categoriaRepository.obtenerCategoriasPorIds(Array.from(categoriaIds))
        : Promise.resolve([]),
      // Checklists con requisitos ya filtrados a activos (ver PlantillaChecklistMongoRepository.obtenerPorIds)
      checklistIds.size > 0
        ? this.plantillaRepository.obtenerPorIds(Array.from(checklistIds))
        : Promise.resolve([])
    ]);

    // Crear mapas para lookup O(1)
    const categoriasMap = new Map(categorias.map(cat => [cat.id, cat]));
    const checklistsMap = new Map(checklists.map(cl => [cl.id, cl]));

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
        estado: doc.estado ? doc.estado.toUpperCase() : 'EN_REVISION',
        checklist: checklistsMap.get(doc.checklistId) || null
      }))
    };
  }

  /**
   * Cierra el expediente a `completado` cuando el cupo está agotado y no quedan documentos OC pendientes.
   *
   * - **Solicitud de pago** (tras comprometer saldo): pasar `snapshotPostUpdate` con el
   *   `montoDisponible` ya persistido y el `estado` previo del expediente.
   * - **Documento OC**: no modifica saldos; sin snapshot se lee el expediente en BD (solo consulta
   *   de `montoDisponible`). Tras `aprobarDocumentoOC`, todos los DocumentoOC del expediente deben
   *   estar `APROBADO` para poder cerrar.
   *
   * Condiciones: `montoDisponible` en ~0 (tolerancia 0.02), al menos un DocumentoOC en el expediente,
   * todos ellos `APROBADO`, y estado del expediente no en `sinAutocierre`.
   *
   * @param snapshotPostUpdate Opcional: evita un findById cuando el llamador acaba de persistir saldos.
   * @param session Sesión Mongo opcional; si se pasa, lecturas y el posible `update` a `completado` usan la misma transacción.
   */
  async intentarCerrarExpedientePorCupoYDocumentosOC(
    expedienteId: string,
    snapshotPostUpdate?: Pick<ExpedientePago, 'estado' | 'montoDisponible'>,
    session?: any
  ): Promise<void> {
    const sinAutocierre = new Set<ExpedientePago['estado']>([
      'completado',
      'cancelado',
      'suspendido',
      'en_configuracion',
    ]);

    let estado: ExpedientePago['estado'];
    let montoDisponible: number;

    if (snapshotPostUpdate) {
      estado = snapshotPostUpdate.estado;
      montoDisponible = snapshotPostUpdate.montoDisponible;
    } else {
      const ex = await this.expedienteRepository.findById(expedienteId, session);
      if (!ex) return;
      estado = ex.estado;
      montoDisponible = ex.montoDisponible;
    }

    if (sinAutocierre.has(estado)) return;

    const eps = 0.02;
    if (montoDisponible > eps) return;
    if (montoDisponible < -eps) return;

    const docs = await this.documentoOCRepository.findByExpedienteId(expedienteId, session);
    if (docs.length === 0) return;
    if (docs.some((d) => d.estado !== 'APROBADO')) return;

    const expedienteCerrado = await this.expedienteRepository.update(
      expedienteId,
      { estado: 'completado' },
      session
    );
    if (!expedienteCerrado) {
      throw new Error(
        'No se pudo marcar el expediente como completado (cupo agotado y todos los documentos OC aprobados). La operación se revirtió.'
      );
    }
    logger.info(
      '[ExpedientePago] Expediente marcado completado: cupo agotado y todos los Documento OC aprobados',
      { expedienteId }
    );
  }
}
