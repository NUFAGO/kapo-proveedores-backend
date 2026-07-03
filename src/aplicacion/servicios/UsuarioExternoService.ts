import { UsuarioExternoResponse } from '../../dominio/entidades/UsuarioExterno';
import { IUsuarioExternoRepository } from '../../dominio/repositorios/IUsuarioExternoRepository';

/** Aprobador del kanban proveedor: rol cuyo NOMBRE contiene "conta". */
export const ROL_REGEX_APROBADOR_PROVEEDOR = 'conta';

/** Jerarquías de cargo que pueden aprobar: Supervisor (3) y Gerencia (4). */
export const JERARQUIAS_APROBADOR_PROVEEDOR = [3, 4] as const;

export function usuarioPuedeAprobarProveedorKanban(params: {
  roleNombre?: string | null;
  cargoGerarquia?: number | null;
}): boolean {
  const rol = (params.roleNombre ?? '').trim().toLowerCase();
  if (rol.includes(ROL_REGEX_APROBADOR_PROVEEDOR.toLowerCase())) return true;
  return (
    params.cargoGerarquia != null &&
    (JERARQUIAS_APROBADOR_PROVEEDOR as readonly number[]).includes(params.cargoGerarquia)
  );
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

  /** Rol *conta* ∪ Supervisor (3) ∪ Gerencia (4), sin duplicados, cross-sistema. */
  async listarAprobadoresProveedorKanban(): Promise<UsuarioExternoResponse[]> {
    const [porRol, ...porJerarquia] = await Promise.all([
      this.repo.getUsuariosByRolCargo(undefined, ROL_REGEX_APROBADOR_PROVEEDOR),
      ...JERARQUIAS_APROBADOR_PROVEEDOR.map((j) =>
        this.repo.getUsuariosByRolCargo(j, undefined)
      ),
    ]);
    return dedupeUsuarios([porRol, ...porJerarquia]);
  }

  /**
   * ¿Puede aprobar en el kanban de proveedor? Reutiliza la MISMA fuente que la
   * lista de aprobadores (rol "conta" + jerarquía 3/4, cross-sistema): puede
   * aprobar si su id está en esa lista. Así los botones del front coinciden
   * exactamente con los aprobadores válidos (sin depender del rol del contexto).
   */
  async puedeAprobarProveedorKanban(usuarioId: string): Promise<boolean> {
    const id = (usuarioId ?? '').trim();
    if (!id) return false;
    const aprobadores = await this.listarAprobadoresProveedorKanban();
    return aprobadores.some((u) => u.id === id);
  }
}
