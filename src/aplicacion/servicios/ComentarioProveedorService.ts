import { IComentarioProveedorRepository } from '../../dominio/repositorios/IComentarioProveedorRepository';
import { ComentarioProveedor, ComentarioProveedorInput } from '../../dominio/entidades/ComentarioProveedor';

export class ComentarioProveedorService {
  constructor(private readonly repo: IComentarioProveedorRepository) {}

  listComentarios(referenciaId: string, tabla?: string): Promise<ComentarioProveedor[]> {
    return this.repo.listByReferencia(referenciaId, tabla);
  }

  agregarComentario(input: ComentarioProveedorInput): Promise<ComentarioProveedor> {
    if (!input.referencia_id) throw new Error('referencia_id es obligatorio');
    if (!input.tabla?.trim()) throw new Error('tabla es obligatoria');
    if (!input.comentario?.trim()) throw new Error('El comentario es obligatorio');
    return this.repo.add(input);
  }
}
