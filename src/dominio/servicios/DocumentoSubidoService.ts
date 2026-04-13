import { IDocumentoSubidoRepository } from '../repositorios/IDocumentoSubidoRepository';
import { DocumentoSubido, DocumentoSubidoInput, DocumentoSubidoFilter } from '../entidades/DocumentoSubido';
import { IDocumentoOCRepository } from '../repositorios/IDocumentoOCRepository';

// Importar ISolicitudPagoRepository de forma separada para evitar dependencias circulares
interface ISolicitudPagoRepository {
  findById(id: string, session?: any): Promise<any>;
  update(id: string, data: any, session?: any): Promise<any>;
}

export class DocumentoSubidoService {
  constructor(
    private documentoSubidoRepository: IDocumentoSubidoRepository,
    private documentoOCRepository: IDocumentoOCRepository,
    private solicitudPagoRepository: ISolicitudPagoRepository
  ) {}

  /**
   * Crear un nuevo documento subido
   * @param session Sesión Mongo opcional (transacciones)
   */
  async crearDocumentoSubido(input: DocumentoSubidoInput, session?: any): Promise<DocumentoSubido> {
    // Validar que pertenezca a un documento OC o una solicitud de pago, pero no a ambos
    if (!input.documentoOCId && !input.solicitudPagoId) {
      throw new Error('El documento debe pertenecer a un documento OC o una solicitud de pago');
    }
    if (input.documentoOCId && input.solicitudPagoId) {
      throw new Error('El documento no puede pertenecer a ambos: documento OC y solicitud de pago');
    }

    // Validar que el documento OC o solicitud de pago existan
    if (input.documentoOCId) {
      const documentoOC = await this.documentoOCRepository.findById(input.documentoOCId, session);
      if (!documentoOC) {
        throw new Error('El documento OC especificado no existe');
      }
      
      // Borrador = proveedor aún no envió; EN_REVISION/OBSERVADA = flujo activo o corrección
      if (
        documentoOC.estado !== 'BORRADOR' &&
        documentoOC.estado !== 'EN_REVISION' &&
        documentoOC.estado !== 'OBSERVADA'
      ) {
        throw new Error('Solo se pueden subir archivos a documentos en borrador, en revisión u observados');
      }
    }

    if (input.solicitudPagoId) {
      const solicitudPago = await this.solicitudPagoRepository.findById(input.solicitudPagoId, session);
      if (!solicitudPago) {
        throw new Error('La solicitud de pago especificada no existe');
      }
      
      // Validar que la solicitud de pago esté en estado que permite subir archivos
      if (solicitudPago.estado !== 'BORRADOR' && solicitudPago.estado !== 'OBSERVADA') {
        throw new Error('Solo se pueden subir archivos a solicitudes en estado borrador u observada');
      }
    }

    // Validar que se suba al menos un archivo
    if (!input.archivos || input.archivos.length === 0) {
      throw new Error('Debe subir al menos un archivo');
    }

    const documento: Omit<DocumentoSubido, 'id' | 'createdAt' | 'updatedAt'> = {
      usuarioId: input.usuarioId,
      archivos: input.archivos,
      version: input.version != null && input.version > 0 ? input.version : 1,
      estado: 'PENDIENTE',
      fechaSubida: new Date(),
      ...(input.documentoOCId && { documentoOCId: input.documentoOCId }),
      ...(input.solicitudPagoId && { solicitudPagoId: input.solicitudPagoId }),
      ...(input.requisitoDocumentoId && { requisitoDocumentoId: input.requisitoDocumentoId })
    };

    const nuevoDocumento = await this.documentoSubidoRepository.create(documento, session);

    // Actualizar el estado del documento OC si es necesario
    if (input.documentoOCId) {
      const documentoOC = await this.documentoOCRepository.findById(input.documentoOCId, session);
      if (
        documentoOC &&
        (documentoOC.estado === 'BORRADOR' || documentoOC.estado === 'EN_REVISION') &&
        !documentoOC.fechaCarga
      ) {
        await this.documentoOCRepository.update(input.documentoOCId, { fechaCarga: new Date() }, session);
      }
    }

    return nuevoDocumento;
  }

  /**
   * Inserción masiva de documentos subidos dentro de una transacción batch.
   * Precondición: el padre (solicitudPagoId o documentoOCId) ya fue validado y creado por el
   * servicio que llama — no se re-valida aquí para evitar N findById redundantes.
   */
  async crearDocumentosSubidosBatch(
    inputs: DocumentoSubidoInput[],
    session?: any
  ): Promise<DocumentoSubido[]> {
    if (!inputs.length) return [];
    const docs: Omit<DocumentoSubido, 'id' | 'createdAt' | 'updatedAt'>[] = inputs.map((input) => ({
      usuarioId: input.usuarioId,
      archivos: input.archivos,
      version: input.version != null && input.version > 0 ? input.version : 1,
      estado: 'PENDIENTE' as const,
      fechaSubida: new Date(),
      ...(input.documentoOCId && { documentoOCId: input.documentoOCId }),
      ...(input.solicitudPagoId && { solicitudPagoId: input.solicitudPagoId }),
      ...(input.requisitoDocumentoId && { requisitoDocumentoId: input.requisitoDocumentoId }),
    }));
    return this.documentoSubidoRepository.createBatch(docs, session);
  }

  /**
   * Obtener un documento subido por ID
   */
  async obtenerDocumentoSubido(id: string): Promise<DocumentoSubido> {
    const documento = await this.documentoSubidoRepository.findById(id);
    if (!documento) {
      throw new Error('Documento subido no encontrado');
    }
    return documento;
  }

  /**
   * Listar documentos subidos con filtros
   */
  async listarDocumentosSubidos(filter: DocumentoSubidoFilter): Promise<DocumentoSubido[]> {
    return await this.documentoSubidoRepository.listWithFilters(filter);
  }

  /**
   * Obtener documentos subidos por documento OC
   */
  async obtenerDocumentosSubidosPorDocumentoOC(documentoOCId: string): Promise<DocumentoSubido[]> {
    return await this.documentoSubidoRepository.findByDocumentoOC(documentoOCId);
  }

  /**
   * Obtener documentos subidos por solicitud de pago
   */
  async obtenerDocumentosSubidosPorSolicitudPago(solicitudPagoId: string): Promise<DocumentoSubido[]> {
    return await this.documentoSubidoRepository.findBySolicitudPago(solicitudPagoId);
  }

  async obtenerDocumentosSubidosPorSolicitudPagoIds(solicitudPagoIds: string[]): Promise<DocumentoSubido[]> {
    return await this.documentoSubidoRepository.findBySolicitudPagoIds(solicitudPagoIds);
  }

  /** Mayor `version` ya persistida para ese padre + requisito (0 si no hay entregas). */
  async obtenerMaxVersionPorPadreYRequisito(
    params: { solicitudPagoId?: string; documentoOCId?: string; requisitoDocumentoId: string },
    session?: any
  ): Promise<number> {
    return this.documentoSubidoRepository.findMaxVersionByPadreYRequisito(params, session);
  }

  /**
   * Aprobar un documento subido
   */
  async aprobarDocumentoSubido(id: string, _adminRevisorId: string): Promise<DocumentoSubido> {
    const documento = await this.obtenerDocumentoSubido(id);
    
    // Validar que esté en estado pendiente
    if (documento.estado !== 'PENDIENTE') {
      throw new Error('Solo se pueden aprobar documentos en estado pendiente');
    }

    const documentoActualizado = await this.documentoSubidoRepository.updateEstado(
      id, 
      'APROBADO'
    );

    if (!documentoActualizado) {
      throw new Error('No se pudo aprobar el documento');
    }

    return documentoActualizado;
  }

  /**
   * Observar un documento subido
   */
  async observarDocumentoSubido(id: string, _adminRevisorId: string, comentarios: string): Promise<DocumentoSubido> {
    const documento = await this.obtenerDocumentoSubido(id);
    
    // Validar que esté en estado pendiente
    if (documento.estado !== 'PENDIENTE') {
      throw new Error('Solo se pueden observar documentos en estado pendiente');
    }

    if (!comentarios || comentarios.trim().length === 0) {
      throw new Error('Debe proporcionar comentarios para observar el documento');
    }

    const documentoActualizado = await this.documentoSubidoRepository.updateEstado(
      id, 
      'OBSERVADO',
      comentarios
    );

    if (!documentoActualizado) {
      throw new Error('No se pudo observar el documento');
    }

    // Si pertenece a un documento OC, actualizar su estado a observado
    if (documento.documentoOCId) {
      await this.documentoOCRepository.update(documento.documentoOCId, {
        estado: 'OBSERVADA',
      });
    }

    // Si pertenece a una solicitud de pago, actualizar su estado a observada
    if (documento.solicitudPagoId) {
      await this.solicitudPagoRepository.update(documento.solicitudPagoId, { 
        estado: 'OBSERVADA',
        comentariosRevision: comentarios 
      });
    }

    return documentoActualizado;
  }

  /**
   * Rechazar un documento subido
   */
  async rechazarDocumentoSubido(id: string, _adminRevisorId: string, comentarios: string): Promise<DocumentoSubido> {
    const documento = await this.obtenerDocumentoSubido(id);
    
    // Validar que esté en estado pendiente
    if (documento.estado !== 'PENDIENTE') {
      throw new Error('Solo se pueden rechazar documentos en estado pendiente');
    }

    if (!comentarios || comentarios.trim().length === 0) {
      throw new Error('Debe proporcionar comentarios para rechazar el documento');
    }

    const documentoActualizado = await this.documentoSubidoRepository.updateEstado(
      id, 
      'RECHAZADO',
      comentarios
    );

    if (!documentoActualizado) {
      throw new Error('No se pudo rechazar el documento');
    }

    return documentoActualizado;
  }

  /**
   * Actualiza estado (y comentario opcional) en cierre de revisión checklist admin,
   * sin exigir PENDIENTE — los archivos pueden volver a revisarse tras corrección.
   */
  async aplicarEstadoEnRevisionChecklist(
    id: string,
    estado: DocumentoSubido['estado'],
    comentariosRevision?: string
  ): Promise<DocumentoSubido> {
    const updated = await this.documentoSubidoRepository.updateEstado(id, estado, comentariosRevision);
    if (!updated) {
      throw new Error('No se pudo actualizar el estado del documento subido');
    }
    return updated;
  }

  /**
   * Eliminar un documento subido
   */
  async eliminarDocumentoSubido(id: string): Promise<boolean> {
    const documento = await this.obtenerDocumentoSubido(id);
    
    // Solo se pueden eliminar documentos en estado pendiente
    if (documento.estado !== 'PENDIENTE') {
      throw new Error('Solo se pueden eliminar documentos en estado pendiente');
    }

    return await this.documentoSubidoRepository.delete(id);
  }
}
