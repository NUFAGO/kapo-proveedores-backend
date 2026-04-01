import { DocumentoOC, DocumentoOCInput, DocumentoOCFilter } from '../entidades/DocumentoOC';
import { IDocumentoOCRepository } from '../repositorios/IDocumentoOCRepository';
import { IExpedientePagoRepository } from '../repositorios/IExpedientePagoRepository';

export class DocumentoOCService {
  constructor(
    private readonly documentoOCRepository: IDocumentoOCRepository,
    private readonly expedienteRepository: IExpedientePagoRepository
  ) {}

  /**
   * Crear un nuevo documento OC
   */
  async crearDocumentoOC(input: DocumentoOCInput): Promise<DocumentoOC> {
    // Validar que el expediente exista
    const expediente = await this.expedienteRepository.findById(input.expedienteId);
    if (!expediente) {
      throw new Error('El expediente especificado no existe');
    }

    // Validar que el checklist exista y no esté duplicado en el expediente
    const existeChecklist = await this.documentoOCRepository.existsChecklistInExpediente(
      input.expedienteId,
      input.checklistId
    );

    if (existeChecklist) {
      throw new Error('Ya existe un documento con este checklist en el expediente');
    }

    const documento: Omit<DocumentoOC, 'id'> = {
      expedienteId: input.expedienteId,
      checklistId: input.checklistId,
      obligatorio: input.obligatorio,
      estado: 'pendiente'
    };

    return await this.documentoOCRepository.create(documento);
  }

  /**
   * Obtener un documento OC por ID
   */
  async obtenerDocumentoOC(id: string): Promise<DocumentoOC> {
    const documento = await this.documentoOCRepository.findById(id);
    if (!documento) {
      throw new Error('Documento OC no encontrado');
    }
    return documento;
  }

  /**
   * Listar documentos OC con filtros
   */
  async listarDocumentosOC(filters: DocumentoOCFilter): Promise<DocumentoOC[]> {
    return await this.documentoOCRepository.listWithFilters(filters);
  }

  /**
   * Obtener documentos de un expediente
   */
  async obtenerDocumentosPorExpediente(expedienteId: string): Promise<DocumentoOC[]> {
    return await this.documentoOCRepository.findByExpedienteId(expedienteId);
  }

  /**
   * Subir archivos a un documento OC (ahora crea DocumentoSubido)
   */
  async subirArchivos(id: string): Promise<any> {
    const documento = await this.obtenerDocumentoOC(id);
    
    // Validar que el documento esté en estado pendiente u observado
    if (documento.estado !== 'pendiente' && documento.estado !== 'observado') {
      throw new Error('Solo se pueden subir archivos a documentos en estado pendiente u observado');
    }

    // Crear un nuevo DocumentoSubido
    // TODO: Implementar cuando se tenga el repositorio de DocumentoSubido
    // const documentoSubido = {
    //   documentoOCId: id,
    //   usuarioId,
    //   archivos,
    //   version: 1, // TODO: Calcular versión basada en existentes
    //   estado: 'pendiente',
    //   fechaSubida: new Date()
    // };
    // 
    // const nuevoDocumentoSubido = await this.documentoSubidoRepository.create(documentoSubido);
    
    // Actualizar estado del documento si es necesario
    if (documento.estado === 'pendiente') {
      await this.documentoOCRepository.update(id, { estado: 'cargado' });
    }

    throw new Error('Método no implementado completamente - se necesita repositorio de DocumentoSubido');
  }

  /**
   * Aprobar un documento OC
   */
  async aprobarDocumentoOC(id: string): Promise<DocumentoOC> {
    const documento = await this.obtenerDocumentoOC(id);
    
    // Validar que el documento esté en estado cargado u observado
    if (documento.estado !== 'cargado' && documento.estado !== 'observado') {
      throw new Error('Solo se pueden aprobar documentos en estado cargado u observado');
    }

    // TODO: Validar que el documento tenga documentos subidos aprobados
    // if (await this.documentoSubidoRepository.countByDocumentoOCAndEstado(id, 'aprobado') === 0) {
    //   throw new Error('No se puede aprobar un documento sin archivos aprobados');
    // }

    const documentoActualizado = await this.documentoOCRepository.update(id, {
      estado: 'aprobado'
    });

    if (!documentoActualizado) {
      throw new Error('No se pudo aprobar el documento');
    }

    return documentoActualizado;
  }

  /**
   * Observar un documento OC
   */
  async observarDocumentoOC(id: string): Promise<DocumentoOC> {
    // Validar que el documento exista
    await this.obtenerDocumentoOC(id);

    const documentoActualizado = await this.documentoOCRepository.updateEstado(
      id,
      'observado'
    );

    if (!documentoActualizado) {
      throw new Error('No se pudo observar el documento');
    }

    return documentoActualizado;
  }

  /**
   * Actualizar un documento OC
   */
  async actualizarDocumentoOC(id: string, input: Partial<DocumentoOCInput>): Promise<DocumentoOC> {
    const documento = await this.obtenerDocumentoOC(id);

    // Validar que el expediente esté en configuración
    const expediente = await this.expedienteRepository.findById(documento.expedienteId);
    if (!expediente || expediente.estado !== 'en_configuracion') {
      throw new Error('Solo se pueden modificar documentos en expedientes en configuración');
    }

    // Validaciones específicas según los campos a actualizar
    if (input.checklistId && input.checklistId !== documento.checklistId) {
      // Validar que el nuevo checklist no esté duplicado en el expediente
      const existeChecklist = await this.documentoOCRepository.existsChecklistInExpediente(
        documento.expedienteId,
        input.checklistId
      );

      if (existeChecklist) {
        throw new Error('Ya existe un documento con este checklist en el expediente');
      }
    }

    const documentoActualizado = await this.documentoOCRepository.update(id, input);
    if (!documentoActualizado) {
      throw new Error('No se pudo actualizar el documento OC');
    }

    return documentoActualizado;
  }

  /**
   * Eliminar un documento OC
   */
  async eliminarDocumentoOC(id: string): Promise<boolean> {
    const documento = await this.obtenerDocumentoOC(id);

    // Validar que el expediente esté en configuración
    const expediente = await this.expedienteRepository.findById(documento.expedienteId);
    if (!expediente || expediente.estado !== 'en_configuracion') {
      throw new Error('Solo se pueden eliminar documentos en expedientes en configuración');
    }

    // No se pueden eliminar documentos que ya tienen archivos subidos
    // TODO: Validar con repositorio de DocumentoSubido
    // if (await this.documentoSubidoRepository.countByDocumentoOC(id) > 0) {
    //   throw new Error('No se pueden eliminar documentos que ya tienen archivos cargados');
    // }

    return await this.documentoOCRepository.delete(id);
  }

  /**
   * Verificar si todos los documentos obligatorios de un expediente están aprobados
   */
  async verificarDocumentosObligatoriosAprobados(expedienteId: string): Promise<boolean> {
    const documentosObligatorios = await this.documentoOCRepository.findObligatoriosByExpediente(
      expedienteId
    );

    const documentosPendientes = documentosObligatorios.filter(
      doc => doc.estado !== 'aprobado'
    );

    return documentosPendientes.length === 0;
  }

  /**
   * Obtener documentos obligatorios pendientes de un expediente
   */
  async obtenerDocumentosObligatoriosPendientes(expedienteId: string): Promise<DocumentoOC[]> {
    return await this.documentoOCRepository.findObligatoriosPendientesByExpediente(expedienteId);
  }

  /**
   * Generar documentos OC a partir de una plantilla de checklist
   */
  async generarDocumentosDesdeChecklist(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _expedienteId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _checklistId: string
  ): Promise<DocumentoOC[]> {
    // Este método se implementaría cuando se tenga acceso a RequisitoDocumentoRepository
    // Por ahora, es un placeholder para la funcionalidad
    const documentosCreados: DocumentoOC[] = [];

    // Lógica para:
    // 1. Obtener requisitos del checklist
    // 2. Por cada requisito de tipo 'documento', crear un DocumentoOC
    // 3. Retornar los documentos creados

    return documentosCreados;
  }
}
