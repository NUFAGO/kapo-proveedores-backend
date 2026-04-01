import { ExpedientePago, ExpedientePagoInput, ExpedientePagoFilter } from '../entidades/ExpedientePago';
import { TipoPagoOC } from '../entidades/TipoPagoOC';
import { IExpedientePagoRepository } from '../repositorios/IExpedientePagoRepository';
import { ITipoPagoOCRepository } from '../repositorios/ITipoPagoOCRepository';
import { IDocumentoOCRepository } from '../repositorios/IDocumentoOCRepository';

export class ExpedientePagoService {
  constructor(
    private readonly expedienteRepository: IExpedientePagoRepository,
    private readonly tipoPagoOCRepository: ITipoPagoOCRepository,
    private readonly documentoOCRepository: IDocumentoOCRepository
  ) {}

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

    return await this.expedienteRepository.create(expediente);
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

    return await this.expedienteRepository.delete(id);
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
    // 1. Validar que no exista un expediente para esta OC
    const existeExpediente = await this.expedienteRepository.existsExpedienteForOc(ocData.id);
    if (existeExpediente) {
      throw new Error('Ya existe un expediente para esta orden de compra');
    }

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

    const expediente = await this.expedienteRepository.create(expedienteMongoData);

    // 3. Crear los tipos de pago (solicitudes de pago)
    for (const [index, solicitud] of solicitudesPago.entries()) {
      const tipoPagoInput = {
        expedienteId: expediente.id,
        categoriaChecklistId: solicitud.categoriaChecklistId,
        checklistId: solicitud.plantillaChecklistId,
        modoRestriccion: 'libre' as const,
        orden: index + 1
      };
      await this.tipoPagoOCRepository.create(tipoPagoInput);
    }

    // 4. Crear los documentos OC
    for (const documento of documentosOC) {
      const documentoInput = {
        expedienteId: expediente.id,
        checklistId: documento.plantillaChecklistId,
        obligatorio: true
      };
      await this.documentoOCRepository.create(documentoInput);
    }

    // 5. Actualizar estado del expediente a configurado
    const expedienteActualizado = await this.actualizarEstado(expediente.id, 'configurado');
    
    return expedienteActualizado;
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

    // Para cada documento, obtener sus archivos
    for (const documento of documentos) {
      // TODO: Implementar método para obtener archivos por documentoOCId
      // Por ahora, agregamos un array vacío de archivos
      (documento as any).archivos = [];
    }

    // Mapear al formato esperado por GraphQL
    return {
      ...expediente,
      tiposPago: tiposPago.map(tp => ({
        ...tp,
        categoria: tp.categoriaChecklistId ? { 
          id: tp.categoriaChecklistId, 
          nombre: 'Categoría', 
          descripcion: 'Descripción',
          codigo: 'CAT-001',
          categoriaTipoUso: 'solicitud_pago',
          activo: true
        } : null,
        checklist: tp.checklistId ? {
          id: tp.checklistId,
          nombre: 'Plantilla',
          descripcion: 'Descripción',
          codigo: 'PL-001',
          categoriaChecklistId: tp.categoriaChecklistId,
          activo: true,
          vigente: true,
          fechaActualizacion: new Date()
        } : null
      })),
      documentos: documentos.map(doc => ({
        ...doc,
        categoria: { 
          id: 'cat-temp', 
          nombre: 'Categoría', 
          descripcion: 'Descripción',
          codigo: 'CAT-001',
          categoriaTipoUso: 'documento',
          activo: true
        },
        checklist: {
          id: doc.checklistId,
          nombre: 'Plantilla',
          descripcion: 'Descripción',
          codigo: 'PL-001',
          categoriaChecklistId: 'cat-temp',
          activo: true,
          vigente: true,
          fechaActualizacion: new Date()
        }
      }))
    };
  }
}
