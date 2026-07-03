import { UsuarioExternoResponse } from '../../dominio/entidades/UsuarioExterno';
import { IUsuarioExternoRepository } from '../../dominio/repositorios/IUsuarioExternoRepository';
import { logger } from '../../infraestructura/logging';

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
   * ¿Puede aprobar en el kanban de proveedor? Regla (paridad inacons): rol con
   * "conta" O cargo con jerarquía 3 (Supervisor) / 4 (Gerencia).
   *
   * Fuente de datos: rol y jerarquía vienen de los CLAIMS del token (ya
   * decodificados en el contexto GraphQL). NO se llama a auth: `getUsuarioById`
   * y `getUsuariosByRolCargo` exigen sesión/secreto interno que esta llamada
   * directa no tiene (→ "Acceso denegado"). Con los claims basta y se evita el
   * viaje de red.
   */
  async puedeAprobarProveedorKanban(
    usuarioId: string,
    roleNombre?: string | null,
    cargoGerarquia?: number | null
  ): Promise<boolean> {
    const id = (usuarioId ?? '').trim();
    if (!id) return false;

    const rolNormalizado = (roleNombre ?? '').trim().toLowerCase();
    const gerarquia =
      typeof cargoGerarquia === 'number' && Number.isFinite(cargoGerarquia)
        ? cargoGerarquia
        : null;

    const puedeAprobar = usuarioPuedeAprobarProveedorKanban({
      roleNombre: rolNormalizado,
      cargoGerarquia: gerarquia,
    });

    const matchRol = rolNormalizado.includes(
      ROL_REGEX_APROBADOR_PROVEEDOR.toLowerCase()
    );
    const matchGerarquia =
      gerarquia != null &&
      (JERARQUIAS_APROBADOR_PROVEEDOR as readonly number[]).includes(gerarquia);

    logger.info('[puedeAprobarProveedorKanban] Evaluando permiso de aprobación', {
      usuarioId: id,
      entrada: {
        roleNombreRecibido: roleNombre ?? null,
        cargoGerarquia: gerarquia,
      },
      comparaciones: {
        regla1_rolIncluye: {
          valor: rolNormalizado || '(vacío)',
          busca: ROL_REGEX_APROBADOR_PROVEEDOR,
          resultado: matchRol,
        },
        regla2_gerarquiaAprobadora: {
          valor: gerarquia,
          busca: [...JERARQUIAS_APROBADOR_PROVEEDOR],
          resultado: matchGerarquia,
        },
      },
      resultadoFinal: puedeAprobar,
    });

    return puedeAprobar;
  }
}
