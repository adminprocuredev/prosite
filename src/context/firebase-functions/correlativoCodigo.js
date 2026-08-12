/**
 * Extrae el correlativo numérico del final de un código de entregable.
 *
 * Los códigos vienen como '21286-100-ME-PL-0003' (Procure) o
 * '21286-1001-PP-1000-ME-PL-00003' (MEL): el correlativo es siempre el último
 * segmento. Devuelve null si el código no existe o no termina en número, para
 * que quien llama pueda decidir sin comparar contra un NaN.
 *
 * Se usa al eliminar un entregable: los contadores solo deben bajar si el que
 * se borró era el último. Ver deleteBlueprintAndDecrementCounters.
 */
export const correlativoDeCodigo = codigo => {
  const ultimoSegmento = String(codigo == null ? '' : codigo)
    .split('-')
    .pop()

  return /^\d+$/.test(ultimoSegmento) ? Number(ultimoSegmento) : null
}

/**
 * ¿El entregable que se está eliminando es el último de la numeración?
 * Solo en ese caso el contador puede bajar sin dejar un hueco que provoque que
 * el siguiente entregable pise a uno existente.
 */
export const esElUltimo = (codigo, contadorActual) => {
  const correlativo = correlativoDeCodigo(codigo)

  return correlativo !== null && correlativo === Number(contadorActual)
}
