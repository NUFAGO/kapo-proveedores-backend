import { ISolicitudPagoRepository } from '../repositorios/ISolicitudPagoRepository';
import { ITipoPagoOCRepository } from '../repositorios/ITipoPagoOCRepository';
import { IExpedientePagoRepository } from '../repositorios/IExpedientePagoRepository';
import { SolicitudPago, SolicitudPagoFilter, SolicitudPagoInput } from '../entidades/SolicitudPago';

export class SolicitudPagoService {
  constructor(
    private solicitudPagoRepository: ISolicitudPagoRepository,
    private tipoPagoOCRepository: ITipoPagoOCRepository,
    private expedientePagoRepository: IExpedientePagoRepository
  ) {}

  /**
   * Crear una nueva solicitud de pago
   */
  async crearSolicitudPago(input: SolicitudPagoInput): Promise<SolicitudPago> {
    // Validar que el tipo de pago exista
    const tipoPagoOC = await this.tipoPagoOCRepository.findById(input.tipoPagoOCId);
    if (!tipoPagoOC) {
      throw new Error('El tipo de pago especificado no existe');
    }

    // Validar que el expediente exista
    const expediente = await this.expedientePagoRepository.findById(input.expedienteId);
    if (!expediente) {
      throw new Error('El expediente especificado no existe');
    }

    // Validar que el expediente esté en estado configurado o en ejecución
    if (expediente.estado !== 'configurado' && expediente.estado !== 'en_ejecucion') {
      throw new Error('Solo se pueden crear solicitudes en expedientes configurados o en ejecución');
    }

    // Validar que el tipo de pago pertenezca al expediente
    if (tipoPagoOC.expedienteId !== input.expedienteId) {
      throw new Error('El tipo de pago no pertenece al expediente especificado');
    }

    // Validar monto solicitado
    if (input.montoSolicitado <= 0) {
      throw new Error('El monto solicitado debe ser mayor a cero');
    }

    // Validar restricciones de porcentaje si aplica
    if (tipoPagoOC.porcentajeMaximo) {
      const montoMaximo = (expediente.montoContrato * tipoPagoOC.porcentajeMaximo) / 100;
      if (input.montoSolicitado > montoMaximo) {
        throw new Error(`El monto solicitado excede el máximo permitido de ${montoMaximo}`);
      }
    }

    // Validar restricciones de orden si aplica
    if (tipoPagoOC.modoRestriccion === 'orden' || tipoPagoOC.modoRestriccion === 'orden_y_porcentaje') {
      if (tipoPagoOC.requiereAnteriorPagado && tipoPagoOC.orden && tipoPagoOC.orden > 1) {
        const tipoPagoAnterior = await this.tipoPagoOCRepository.findByExpedienteAndOrden(
          input.expedienteId, 
          tipoPagoOC.orden - 1
        );
        
        if (tipoPagoAnterior) {
          const solicitudesAnteriores = await this.solicitudPagoRepository.findByTipoPagoOC(tipoPagoAnterior.id);
          const algunaAprobada = solicitudesAnteriores.some(s => s.estado === 'aprobado');
          
          if (!algunaAprobada) {
            throw new Error('Debe aprobar primero el tipo de pago anterior');
          }
        }
      }
    }

    // Validar disponibilidad de saldo
    const montoComprometidoTotal = await this.solicitudPagoRepository.sumMontoSolicitadoByExpedienteAndEstado(
      input.expedienteId, 
      'aprobado'
    );
    
    const montoComprometidoPendiente = await this.solicitudPagoRepository.sumMontoSolicitadoByExpedienteAndEstado(
      input.expedienteId, 
      'en_revision'
    );

    const totalComprometido = montoComprometidoTotal + montoComprometidoPendiente + input.montoSolicitado;
    
    if (totalComprometido > expediente.montoDisponible) {
      throw new Error('No hay saldo disponible para esta solicitud');
    }

    // Crear la solicitud
    const solicitud: Omit<SolicitudPago, 'id' | 'createdAt' | 'updatedAt'> = {
      expedienteId: input.expedienteId,
      tipoPagoOCId: input.tipoPagoOCId,
      montoSolicitado: input.montoSolicitado,
      estado: 'borrador',
      fechaCreacion: new Date(),
      documentosSubidos: [] // Array vacío inicial
    };

    const nuevaSolicitud = await this.solicitudPagoRepository.create(solicitud);

    // Actualizar estado del expediente si es la primera solicitud
    if (expediente.estado === 'configurado') {
      await this.expedientePagoRepository.update(input.expedienteId, { 
        estado: 'en_ejecucion' 
      });
    }

    return nuevaSolicitud;
  }

  /**
   * Obtener una solicitud de pago por ID
   */
  async obtenerSolicitudPago(id: string): Promise<SolicitudPago> {
    const solicitud = await this.solicitudPagoRepository.findById(id);
    if (!solicitud) {
      throw new Error('Solicitud de pago no encontrada');
    }
    return solicitud;
  }

  /**
   * Listar solicitudes de pago con filtros
   */
  async listarSolicitudesPago(filter: SolicitudPagoFilter): Promise<SolicitudPago[]> {
    return await this.solicitudPagoRepository.listWithFilters(filter);
  }

  /**
   * Obtener solicitudes de pago por expediente
   */
  async obtenerSolicitudesPorExpediente(expedienteId: string): Promise<SolicitudPago[]> {
    return await this.solicitudPagoRepository.findByExpedienteId(expedienteId);
  }

  /**
   * Obtener solicitudes de pago por tipo de pago
   */
  async obtenerSolicitudesPorTipoPago(tipoPagoOCId: string): Promise<SolicitudPago[]> {
    return await this.solicitudPagoRepository.findByTipoPagoOC(tipoPagoOCId);
  }

  /**
   * Enviar solicitud a revisión
   */
  async enviarSolicitudRevision(id: string): Promise<SolicitudPago> {
    const solicitud = await this.obtenerSolicitudPago(id);
    
    // Validar que esté en estado borrador
    if (solicitud.estado !== 'borrador') {
      throw new Error('Solo se pueden enviar a revisión solicitudes en estado borrador');
    }

    const solicitudActualizada = await this.solicitudPagoRepository.updateEstado(id, 'en_revision');
    
    if (!solicitudActualizada) {
      throw new Error('No se pudo enviar la solicitud a revisión');
    }

    return solicitudActualizada;
  }

  /**
   * Aprobar solicitud de pago
   */
  async aprobarSolicitudPago(id: string): Promise<SolicitudPago> {
    const solicitud = await this.obtenerSolicitudPago(id);
    
    // Validar que esté en estado en_revision
    if (solicitud.estado !== 'en_revision') {
      throw new Error('Solo se pueden aprobar solicitudes en estado en revisión');
    }

    const solicitudActualizada = await this.solicitudPagoRepository.updateEstado(
      id, 
      'aprobado'
    );

    if (!solicitudActualizada) {
      throw new Error('No se pudo aprobar la solicitud');
    }

    // Actualizar saldos del expediente
    const expediente = await this.expedientePagoRepository.findById(solicitud.expedienteId);
    if (expediente) {
      const nuevoMontoComprometido = expediente.montoComprometido + solicitud.montoSolicitado;
      const nuevoMontoDisponible = expediente.montoContrato - nuevoMontoComprometido;
      
      await this.expedientePagoRepository.update(solicitud.expedienteId, {
        montoComprometido: nuevoMontoComprometido,
        montoDisponible: nuevoMontoDisponible
      });
    }

    return solicitudActualizada;
  }

  /**
   * Observar solicitud de pago
   */
  async observarSolicitudPago(id: string, comentarios: string): Promise<SolicitudPago> {
    const solicitud = await this.obtenerSolicitudPago(id);
    
    // Validar que esté en estado en_revision
    if (solicitud.estado !== 'en_revision') {
      throw new Error('Solo se pueden observar solicitudes en estado en revisión');
    }

    if (!comentarios || comentarios.trim().length === 0) {
      throw new Error('Debe proporcionar comentarios para observar la solicitud');
    }

    const solicitudActualizada = await this.solicitudPagoRepository.updateEstado(
      id, 
      'observada', 
      comentarios
    );

    if (!solicitudActualizada) {
      throw new Error('No se pudo observar la solicitud');
    }

    return solicitudActualizada;
  }

  /**
   * Rechazar solicitud de pago
   */
  async rechazarSolicitudPago(id: string, comentarios: string): Promise<SolicitudPago> {
    const solicitud = await this.obtenerSolicitudPago(id);
    
    // Validar que esté en estado en_revision u observada
    if (solicitud.estado !== 'en_revision' && solicitud.estado !== 'observada') {
      throw new Error('Solo se pueden rechazar solicitudes en estado en revisión u observada');
    }

    if (!comentarios || comentarios.trim().length === 0) {
      throw new Error('Debe proporcionar comentarios para rechazar la solicitud');
    }

    const solicitudActualizada = await this.solicitudPagoRepository.updateEstado(
      id, 
      'rechazada', 
      comentarios
    );

    if (!solicitudActualizada) {
      throw new Error('No se pudo rechazar la solicitud');
    }

    return solicitudActualizada;
  }

  /**
   * Eliminar una solicitud de pago
   */
  async eliminarSolicitudPago(id: string): Promise<boolean> {
    const solicitud = await this.obtenerSolicitudPago(id);
    
    // Solo se pueden eliminar solicitudes en estado borrador
    if (solicitud.estado !== 'borrador') {
      throw new Error('Solo se pueden eliminar solicitudes en estado borrador');
    }

    return await this.solicitudPagoRepository.delete(id);
  }
}
