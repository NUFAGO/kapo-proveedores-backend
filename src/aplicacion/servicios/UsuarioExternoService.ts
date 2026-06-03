import { UsuarioExternoResponse } from '../../dominio/entidades/UsuarioExterno';
import { IUsuarioExternoRepository } from '../../dominio/repositorios/IUsuarioExternoRepository';

/** Paridad inacons kanban proveedor: rol cuyo nombre contiene "conta". */
export const ROL_REGEX_APROBADOR_PROVEEDOR = 'conta';

/** Paridad inacons: jerarquía 4 = Gerencia en maestro de cargos. */
export const JERARQUIA_GERENCIA_APROBADOR_PROVEEDOR = 4;

export function usuarioPuedeAprobarProveedorKanban(params: {
  roleNombre?: string | null;
  cargoGerarquia?: number | null;
}): boolean {
  const rol = (params.roleNombre ?? '').trim().toLowerCase();
  if (rol.includes(ROL_REGEX_APROBADOR_PROVEEDOR.toLowerCase())) return true;
  return params.cargoGerarquia === JERARQUIA_GERENCIA_APROBADOR_PROVEEDOR;
}

function dedupeUsuarios(listas: UsuarioExternoResponse[][]): UsuarioExternoResponse[] {
  const vistos = new Set<string>();
  const out: UsuarioExternoResponse[] = [];
  for (const lista of listas) {
    for (const u of lista) {
      if (!u?.id || vistos.has(u.id)) continue;
      vistos.add(u.id);
      out.push(u);
    }
  }
  return out.sort((a, b) =>
    `${a.apellidos ?? ''} ${a.nombres ?? ''}`.localeCompare(
      `${b.apellidos ?? ''} ${b.nombres ?? ''}`,
      'es'
    )
  );
}

/**
 * Usuarios inacons que pueden validar cuentas / aprobar estados de proveedor (kanban).
 */
export class UsuarioExternoService {
  constructor(private readonly repo: IUsuarioExternoRepository) {}

  async getUsuario(id: string): Promise<UsuarioExternoResponse | null> {
    return this.repo.getUsuario(id);
  }

  async getUsuariosByRolCargo(
    jerarquia?: number,
    rolRegex?: string
  ): Promise<UsuarioExternoResponse[]> {
    return this.repo.getUsuariosByRolCargo(jerarquia, rolRegex);
  }

  /** Contabilidad (rol *conta*) ∪ Gerencia (jerarquía 4), sin duplicados. */
  async listarAprobadoresProveedorKanban(): Promise<UsuarioExternoResponse[]> {
    const [porRol, porJerarquia] = await Promise.all([
      this.repo.getUsuariosByRolCargo(undefined, ROL_REGEX_APROBADOR_PROVEEDOR),
      this.repo.getUsuariosByRolCargo(JERARQUIA_GERENCIA_APROBADOR_PROVEEDOR, undefined),
    ]);
    return dedupeUsuarios([porRol, porJerarquia]);
  }

  async puedeAprobarProveedorKanban(
    usuarioId: string,
    roleNombre?: string | null
  ): Promise<boolean> {
    const perfil = await this.repo.getUsuario(usuarioId);
    const gerarquia =
      perfil?.cargo_id?.gerarquia != null ? Number(perfil.cargo_id.gerarquia) : null;
    return usuarioPuedeAprobarProveedorKanban({
      roleNombre: roleNombre ?? null,
      cargoGerarquia: Number.isFinite(gerarquia) ? gerarquia : null,
    });
  }
}
