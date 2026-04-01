import { TipoPagoOC, TipoPagoOCInput, TipoPagoOCFilter } from '../entidades/TipoPagoOC';
import { ITipoPagoOCRepository } from '../repositorios/ITipoPagoOCRepository';
import { IExpedientePagoRepository } from '../repositorios/IExpedientePagoRepository';

export class TipoPagoOCService {
  constructor(
    private readonly tipoPagoOCRepository: ITipoPagoOCRepository,
    private readonly expedienteRepository: IExpedientePagoRepository
  ) {}

  /**
   * Crear un nuevo tipo de pago OC
   */
  async crearTipoPagoOC(input: TipoPagoOCInput): Promise<TipoPagoOC> {
    // Validar que el expediente exista
    const expediente = await this.expedienteRepository.findById(input.expedienteId);
    if (!expediente) {
      throw new Error('El expediente especificado no existe');
    }

    // Validar que el expediente esté en configuración
    if (expediente.estado !== 'en_configuracion') {
      throw new Error('Solo se pueden asignar tipos de pago a expedientes en configuración');
    }

    // Validar que la categoría exista y esté activa
    // Temporalmente omitimos esta validación hasta que se implemente el método
    // const categoria = await this.categoriaChecklistRepository.findById(input.categoriaChecklistId);
    // if (!categoria || categoria.estado !== 'activo') {
    //   throw new Error('La categoría de checklist especificada no existe o no está activa');
    // }

    // Validar que la categoría sea de tipo 'pago'
    // if (categoria.tipoUso !== 'pago') {
    //   throw new Error('La categoría especificada no es de tipo pago');
    // }

    // Validar que la plantilla exista y esté activa
    // const plantilla = await this.plantillaChecklistRepository.findById(input.checklistId);
    // if (!plantilla || !plantilla.activo) {
    //   throw new Error('La plantilla de checklist especificada no existe o no está activa');
    // }

    // Validar que la plantilla pertenezca a la categoría
    // if (plantilla.categoriaChecklistId !== input.categoriaChecklistId) {
    //   throw new Error('La plantilla no pertenece a la categoría especificada');
    // }

    // Validar que no exista esta categoría en el expediente
    const existeCategoria = await this.tipoPagoOCRepository.existsCategoriaInExpediente(
      input.expedienteId,
      input.categoriaChecklistId
    );

    if (existeCategoria) {
      throw new Error('Esta categoría de pago ya está asignada al expediente');
    }

    // Validar orden si se especifica
    if (input.orden !== undefined) {
      const existeOrden = await this.tipoPagoOCRepository.findByExpedienteAndOrden(
        input.expedienteId,
        input.orden
      );

      if (existeOrden) {
        throw new Error(`Ya existe un tipo de pago con el orden ${input.orden} en este expediente`);
      }
    }

    // Validar porcentajes si se especifican
    if (input.porcentajeMaximo !== undefined) {
      if (input.porcentajeMaximo <= 0 || input.porcentajeMaximo > 100) {
        throw new Error('El porcentaje máximo debe estar entre 0 y 100');
      }

      // Validar que no se exceda el 100% del contrato
      const tiposPagoExistentes = await this.tipoPagoOCRepository.findTiposPagoConPorcentaje(
        input.expedienteId
      );

      const totalPorcentaje = tiposPagoExistentes.reduce(
        (sum, tipo) => sum + (tipo.porcentajeMaximo || 0),
        0
      );

      if (totalPorcentaje + input.porcentajeMaximo > 100) {
        throw new Error('La suma de porcentajes no puede superar el 100% del contrato');
      }
    }

    const tipoPago: Omit<TipoPagoOC, 'id'> = {
      ...input,
      fechaAsignacion: new Date()
    };

    return await this.tipoPagoOCRepository.create(tipoPago);
  }

  /**
   * Obtener un tipo de pago OC por ID
   */
  async obtenerTipoPagoOC(id: string): Promise<TipoPagoOC> {
    const tipoPago = await this.tipoPagoOCRepository.findById(id);
    if (!tipoPago) {
      throw new Error('Tipo de pago OC no encontrado');
    }
    return tipoPago;
  }

  /**
   * Listar tipos de pago OC con filtros
   */
  async listarTiposPagoOC(filters: TipoPagoOCFilter): Promise<TipoPagoOC[]> {
    return await this.tipoPagoOCRepository.listWithFilters(filters);
  }

  /**
   * Obtener tipos de pago de un expediente
   */
  async obtenerTiposPagoPorExpediente(expedienteId: string): Promise<TipoPagoOC[]> {
    return await this.tipoPagoOCRepository.findByExpedienteId(expedienteId);
  }

  /**
   * Actualizar un tipo de pago OC
   */
  async actualizarTipoPagoOC(id: string, input: Partial<TipoPagoOCInput>): Promise<TipoPagoOC> {
    const tipoPagoExistente = await this.obtenerTipoPagoOC(id);

    // Validar que el expediente esté en configuración
    const expediente = await this.expedienteRepository.findById(tipoPagoExistente.expedienteId);
    if (!expediente || expediente.estado !== 'en_configuracion') {
      throw new Error('Solo se pueden modificar tipos de pago en expedientes en configuración');
    }

    // Validaciones específicas según los campos a actualizar
    if (input.categoriaChecklistId && input.categoriaChecklistId !== tipoPagoExistente.categoriaChecklistId) {
      throw new Error('No se puede cambiar la categoría de checklist una vez creado');
    }

    if (input.checklistId && input.checklistId !== tipoPagoExistente.checklistId) {
      // Validar que la nueva plantilla pertenezca a la misma categoría
      // Temporalmente omitimos esta validación hasta que se implemente el método
      // const plantilla = await this.plantillaChecklistRepository.findById(input.checklistId);
      // if (!plantilla || plantilla.categoriaChecklistId !== tipoPagoExistente.categoriaChecklistId) {
      //   throw new Error('La nueva plantilla debe pertenecer a la misma categoría');
      // }
    }

    if (input.orden !== undefined && input.orden !== tipoPagoExistente.orden) {
      const existeOrden = await this.tipoPagoOCRepository.findByExpedienteAndOrden(
        tipoPagoExistente.expedienteId,
        input.orden
      );

      if (existeOrden) {
        throw new Error(`Ya existe un tipo de pago con el orden ${input.orden} en este expediente`);
      }
    }

    const tipoPagoActualizado = await this.tipoPagoOCRepository.update(id, input);
    if (!tipoPagoActualizado) {
      throw new Error('No se pudo actualizar el tipo de pago OC');
    }

    return tipoPagoActualizado;
  }

  /**
   * Eliminar un tipo de pago OC
   */
  async eliminarTipoPagoOC(id: string): Promise<boolean> {
    const tipoPago = await this.obtenerTipoPagoOC(id);

    // Validar que el expediente esté en configuración
    const expediente = await this.expedienteRepository.findById(tipoPago.expedienteId);
    if (!expediente || expediente.estado !== 'en_configuracion') {
      throw new Error('Solo se pueden eliminar tipos de pago en expedientes en configuración');
    }

    return await this.tipoPagoOCRepository.delete(id);
  }

  /**
   * Validar si se puede crear una solicitud de pago para un tipo específico
   */
  async validarCreacionSolicitud(
    expedienteId: string,
    categoriaChecklistId: string,
    montoSolicitado: number
  ): Promise<{ puedeCrear: boolean; motivo?: string }> {
    // Obtener el tipo de pago para esta categoría
    const tiposPago = await this.tipoPagoOCRepository.findByExpedienteId(expedienteId);
    const tipoPago = tiposPago.find(tp => tp.categoriaChecklistId === categoriaChecklistId);

    if (!tipoPago) {
      return { puedeCrear: false, motivo: 'No existe un tipo de pago configurado para esta categoría' };
    }

    // Obtener información del expediente
    const expediente = await this.expedienteRepository.findById(expedienteId);
    if (!expediente) {
      return { puedeCrear: false, motivo: 'Expediente no encontrado' };
    }

    // Validar que el expediente esté configurado o en ejecución
    if (!['configurado', 'en_ejecucion'].includes(expediente.estado)) {
      return { puedeCrear: false, motivo: 'El expediente no está en un estado que permita crear solicitudes' };
    }

    // Validar monto disponible
    if (montoSolicitado > expediente.montoDisponible) {
      return { puedeCrear: false, motivo: 'El monto solicitado excede el monto disponible del expediente' };
    }

    // Validar restricciones de orden
    if (tipoPago.modoRestriccion.includes('orden') && tipoPago.requiereAnteriorPagado) {
      const tiposAnteriores = await this.tipoPagoOCRepository.findTiposPagoAnteriores(
        expedienteId,
        tipoPago.orden!
      );

      for (const anterior of tiposAnteriores) {
        // Aquí se debería validar si el tipo anterior tiene solicitudes pagadas
        // Esta lógica requeriría acceso al repositorio de solicitudes de pago
        // Por ahora, asumimos que la validación se hace a nivel superior
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        console.log('Validando tipo anterior:', anterior);
      }
    }

    // Validar restricciones de porcentaje
    if (tipoPago.modoRestriccion.includes('porcentaje') && tipoPago.porcentajeMaximo) {
      // Calcular el monto máximo permitido para este tipo
      const montoMaximo = (expediente.montoContrato * tipoPago.porcentajeMaximo) / 100;
      
      // Aquí se debería calcular el monto ya pagado para este tipo
      // Esta lógica requeriría acceso al repositorio de solicitudes de pago
      // Por ahora, validamos solo contra el monto solicitado
      if (montoSolicitado > montoMaximo) {
        return { puedeCrear: false, motivo: 'El monto solicitado excede el porcentaje máximo permitido para este tipo' };
      }
    }

    return { puedeCrear: true };
  }
}
