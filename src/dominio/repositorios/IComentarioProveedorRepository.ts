import { ComentarioProveedor, ComentarioProveedorInput } from '../entidades/ComentarioProveedor';

export interface IComentarioProveedorRepository {
  listByReferencia(referenciaId: string, tabla?: string): Promise<ComentarioProveedor[]>;
  add(input: ComentarioProveedorInput): Promise<ComentarioProveedor>;
}
