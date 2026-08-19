/**
 * Texto legible de una fila de la tabla de usuarios, en un solo lugar.
 *
 * Existe porque la tabla de «Editar usuarios» ahora se puede DESCARGAR a Excel
 * y a CSV, y la exportación de MUI no mira `renderCell`: se lleva lo que
 * devuelve `valueGetter`. Sin esto la planilla sale con el rol como número, la
 * planta como arreglo y `enabled` como true/false — ilegible justo para quien
 * pidió el maestro de usuarios.
 *
 * Al vivir aquí, la pantalla y el archivo descargado dicen lo mismo, y ordenar
 * o filtrar esas columnas pasa a hacerlo por el texto que se ve y no por el
 * dato crudo.
 */

// Sigla con la que Procure nombra cada planta. Estaba dentro de TableEditUsers.
export const SIGLAS_DE_PLANTA = {
  'Planta Concentradora Los Colorados': 'PCLC',
  'Planta Concentradora Laguna Seca | Línea 1': 'LSL1',
  'Planta Concentradora Laguna Seca | Línea 2': 'LSL2',
  'Chancado y Correas': 'CHCO',
  'Puerto Coloso': 'PCOL',
  'Instalaciones Cátodo': 'ICAT',
  'Instalaciones Mina': 'IMIN',
  'Instalaciones Lixiviación Sulfuros': 'SLIX',
  'Instalaciones Escondida Water Supply': 'IEWS',
  'Instalaciones Concentraducto': 'ICON',
  'Instalaciones Monturaqui': 'IMON',
  'Instalaciones Auxiliares': 'IAUX',
  'Subestaciones Eléctricas': 'SUBE',
  'Tranque y Relaves': 'TREL',
  'Campamento Villa San Lorenzo': 'CVSL',
  'Campamento Villa Cerro Alegre': 'CVCA'
}

/**
 * Plantas de un usuario, en siglas.
 *
 * Una planta que no esté en el diccionario se muestra con su nombre completo:
 * antes quedaba en blanco, o sea el dato se perdía sin avisar.
 *
 * @param {string[]} plantas
 * @returns {string}
 */
export const textoDePlantas = plantas =>
  Array.isArray(plantas) && plantas.length > 0 ? plantas.map(p => SIGLAS_DE_PLANTA[p] || p).join(', ') : 'N/A'

/**
 * @param {string[]} turnos
 * @returns {string}
 */
export const textoDeTurno = turnos =>
  Array.isArray(turnos) && turnos.length > 0 ? turnos.join(', ') : 'N/A'

/**
 * Nombre del rol. `roles` se pide a Firestore al montar la pantalla, así que
 * puede estar vacío en los primeros renders.
 *
 * @param {number} rol
 * @param {Array<{id: number, name: string}>} roles
 * @returns {string}
 */
export const textoDeRol = (rol, roles) => {
  const encontrado = Array.isArray(roles) ? roles.find(r => r.id === rol) : undefined

  return encontrado?.name || ''
}

/**
 * `enabled` falta en muchas fichas antiguas, y AUSENTE SIGNIFICA HABILITADO
 * — el mismo criterio que aplica el login (`data.enabled !== false`). Si aquí
 * se leyera al revés, la planilla diría que media empresa está bloqueada.
 *
 * @param {boolean|undefined} enabled
 * @returns {string}
 */
export const textoDeHabilitado = enabled => (enabled !== false ? 'Habilitado' : 'Deshabilitado')

/**
 * @param {*} valor
 * @returns {'Si'|'No'}
 */
export const textoDeSiNo = valor => (valor ? 'Si' : 'No')
